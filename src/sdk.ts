import axios, { AxiosInstance } from "axios";
import { encode } from "bs58";
import { z, ZodType } from "zod";
import * as schemas from "./schemas";
import { ContractIdMap, ThothSDKOptions } from "./index";

export const DEFAULT_NODE_URL = "https://node1.testnet.hathor.network/v1a/nano_contract/state";

/** Blueprint ID of the ThothNamer nano contract. */
export const DEFAULT_BLUEPRINT_ID = "000000009108a3ab3c24297df5e33679177fb8a051c133bcad467a8a23bf0dd3";

/** Creation transactions requested per page. Honoured by the node up to 100. */
const CREATION_PAGE_SIZE = 100;

/** Safety net so a node that keeps reporting `has_more` cannot loop forever. */
const MAX_CREATION_PAGES = 50;

/**
 * Retries granted to a discovery request that failed for a reason worth trying
 * again (rate limiting, a gateway hiccup, a dropped connection).
 *
 * Public nodes sit behind an nginx that shapes requests to roughly one per
 * second and answers a burst with `429 Too Many Requests`, so discovery issues
 * its `history` requests one at a time and backs off when it is throttled.
 */
const DISCOVERY_RETRIES = 3;

/** Base of the exponential backoff between discovery retries. */
const DISCOVERY_RETRY_DELAY_MS = 1000;

/** Status codes worth retrying: rate limiting and transient gateway errors. */
const RETRYABLE_STATUSES = [429, 502, 503, 504];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Extracts the domain suffix of a name, e.g. `alice.htr` -> `htr`. */
function getDomainSuffix(name: string): string | null {
  const parts = name.split(".");
  if (parts.length < 2) {
    return null;
  }
  const suffix = parts[parts.length - 1].toLowerCase();
  return suffix.length > 0 ? suffix : null;
}

/** Domain suffixes are case-insensitive, so the map is always keyed lower-case. */
function normalizeContractIds(contractIds: ContractIdMap): ContractIdMap {
  const normalized: ContractIdMap = {};
  for (const [domain, contractId] of Object.entries(contractIds)) {
    normalized[domain.toLowerCase()] = contractId;
  }
  return normalized;
}

export class ThothIdSDK {
  nodeUrl: string;
  contractId?: string | null;
  blueprintId: string;
  contractIds: ContractIdMap = {};
  timeoutMs: number;
  private http: AxiosInstance;
  /** In-flight (or settled) discovery, so the map is collected only once. */
  private discovery: Promise<ContractIdMap> | null = null;

  constructor(opts: ThothSDKOptions = {}) {
    this.nodeUrl = opts.nodeUrl ?? DEFAULT_NODE_URL;
    this.contractId = opts.contractId ?? null;
    this.blueprintId = opts.blueprintId ?? DEFAULT_BLUEPRINT_ID;
    this.timeoutMs = opts.timeoutMs ?? 15000;

    // Use only the browser-capable adapters (fetch/xhr) and never axios's Node
    // `http` adapter. When a bundler resolves axios's Node build into a browser
    // app (e.g. webpack with `conditionNames` that omit `browser`, as Hathor
    // Wallet does) the `http` adapter runs `req.setTimeout(...)` on an
    // `http`/`https` polyfill whose request object has no usable `setTimeout`,
    // crashing every request that sets a `timeout` with
    // "<req>.setTimeout is not a function". `fetch` and `xhr` cover every
    // browser, Electron and Node >= 18 runtime, and they implement `timeout`
    // via AbortController instead of `req.setTimeout`, so the crash is
    // structurally impossible. Dropping `http` also means that if neither
    // transport is reachable (e.g. a locked-down SES/LavaMoat compartment that
    // exposes neither `fetch` nor `XMLHttpRequest`) axios throws a clear
    // "no suitable adapter" error instead of crashing inside the polyfill.
    this.http = axios.create({
      timeout: this.timeoutMs,
      adapter: ["fetch", "xhr"],
    });

    if (opts.contractIds) {
      this.setContractIds(opts.contractIds);
    }
  }

  // --- Contract ID discovery -----------------------------------------------

  /**
   * Collects the `domain suffix -> contract ID` map from the node and caches it
   * on the instance. Collected once, reused for every later call: concurrent
   * callers share a single discovery, and a resolved map is returned as-is.
   * Use `refreshContractIds()` to collect again.
   */
  async loadContractIds(): Promise<ContractIdMap> {
    if (!this.discovery) {
      this.discovery = this.collectContractIds().then(
        (contractIds) => {
          this.contractIds = contractIds;
          return contractIds;
        },
        (error) => {
          // Drop the failed attempt so the next call can try again.
          this.discovery = null;
          throw error;
        }
      );
    }
    return this.discovery;
  }

  /** Discards the cached map and collects it from the node again. */
  async refreshContractIds(): Promise<ContractIdMap> {
    this.discovery = null;
    return this.loadContractIds();
  }

  /**
   * Seeds a previously collected map (e.g. from `localStorage`), which makes
   * this instance skip discovery entirely.
   */
  setContractIds(contractIds: ContractIdMap): void {
    this.contractIds = normalizeContractIds(contractIds);
    this.discovery = Promise.resolve(this.contractIds);
  }

  /** Snapshot of the cached map, safe to persist and later pass back in. */
  exportContractIds(): ContractIdMap {
    return { ...this.contractIds };
  }

  /** Domain suffixes currently known to the instance, e.g. `["htr", "tst"]`. */
  getDomains(): string[] {
    return Object.keys(this.contractIds);
  }

  /** Cached contract ID of a domain suffix, without triggering discovery. */
  getContractIdForDomain(domainSuffix: string): string | undefined {
    return this.contractIds[domainSuffix.toLowerCase()];
  }

  /**
   * Every registry is a nano contract created from the ThothNamer blueprint, so
   * the map is rebuilt by listing those creations and reading the domain each
   * one registered. When two contracts claim the same domain the oldest one
   * wins, which is the domain's first registry.
   *
   * Requests go out one at a time: public nodes rate-limit hard, and skipping a
   * contract is not a harmless gap here. If the oldest registry of a domain
   * could not be read, the next contract claiming that domain would silently
   * take its place and every name under it would resolve against the wrong
   * contract. So a contract that cannot be read fails the whole collection
   * rather than quietly reshaping the map.
   */
  private async collectContractIds(): Promise<ContractIdMap> {
    const nanoContractIds = await this.fetchCreationTxIds();
    const contractIds: ContractIdMap = {};

    for (const nanoContractId of nanoContractIds) {
      const domain = await this.fetchDomainForContract(nanoContractId);
      // Creations are listed oldest first, so the first hit for a domain wins.
      if (domain && !(domain in contractIds)) {
        contractIds[domain] = nanoContractId;
      }
    }

    return contractIds;
  }

  /** Lists every nano contract created from the blueprint, oldest first. */
  private async fetchCreationTxIds(): Promise<string[]> {
    const baseUrl =
      `${this.nodeEndpoint("creation")}?search=${encodeURIComponent(this.blueprintId)}` +
      `&order=asc&count=${CREATION_PAGE_SIZE}`;

    const nanoContractIds: string[] = [];
    const seen = new Set<string>();
    let after: string | null = null;

    for (let page = 0; page < MAX_CREATION_PAGES; page++) {
      const url = after ? `${baseUrl}&after=${encodeURIComponent(after)}` : baseUrl;
      const response = await this.getValidated(
        url,
        schemas.NanoContractCreationResponseSchema,
        "nano contract creation",
        DISCOVERY_RETRIES
      );

      const pageIds: string[] = response.nc_creation_txs.map((tx) => tx.nano_contract_id);
      const newIds: string[] = pageIds.filter((id) => !seen.has(id));
      newIds.forEach((id) => seen.add(id));
      nanoContractIds.push(...newIds);

      // Stop when the node says there is nothing left, and also when a page
      // adds nothing new so a repeated page cannot spin forever.
      if (!response.has_more || newIds.length === 0) {
        return nanoContractIds;
      }
      after = pageIds[pageIds.length - 1];
    }

    throw new Error(
      `Contract discovery aborted after ${MAX_CREATION_PAGES} pages of creation transactions for blueprint ${this.blueprintId}.`
    );
  }

  /**
   * Reads the domain a registry was created for. The oldest entry of a nano
   * contract's history is its `initialize` call, and the ThothNamer blueprint
   * takes the domain suffix as the first argument.
   *
   * Returns `null` for a contract that registers no usable domain — a voided
   * creation, or one whose `initialize` does not start with a domain string.
   * Those are genuine "not a registry" answers, unlike a failed request, which
   * is retried and ultimately thrown.
   */
  private async fetchDomainForContract(nanoContractId: string): Promise<string | null> {
    const url =
      `${this.nodeEndpoint("history")}?id=${encodeURIComponent(nanoContractId)}` +
      `&order=asc&count=1`;

    const response = await this.getValidated(
      url,
      schemas.NanoContractHistoryResponseSchema,
      "nano contract history",
      DISCOVERY_RETRIES
    );

    const creationTx = response.history[0];
    if (!creationTx || creationTx.is_voided) {
      return null;
    }
    if (creationTx.nc_method && creationTx.nc_method !== "initialize") {
      return null;
    }

    const domain = creationTx.nc_args_decoded?.[0];
    if (typeof domain !== "string" || domain.length === 0) {
      return null;
    }
    return domain.toLowerCase();
  }

  // --- Configuration -------------------------------------------------------

  /** Changing the node points at another network, so the map is dropped. */
  setNodeUrl(url: string) {
    this.nodeUrl = url;
    this.invalidateContractIds();
  }

  setContractId(id: string) { this.contractId = id; }

  /** Changing the blueprint changes which registries exist, so the map is dropped. */
  setBlueprintId(id: string) {
    this.blueprintId = id;
    this.invalidateContractIds();
  }

  private invalidateContractIds() {
    this.contractIds = {};
    this.discovery = null;
  }

  /**
   * Builds a `/v1a/nano_contract/<endpoint>` URL. `nodeUrl` is normally the
   * `state` endpoint itself, so any trailing `/v1a/nano_contract/*` path is
   * stripped before the wanted endpoint is appended; a bare node root works
   * just as well.
   */
  private nodeEndpoint(endpoint: string): string {
    const root = this.nodeUrl
      .replace(/\/+$/, "")
      .replace(/\/v1a\/nano_contract\/[a-z_]+$/, "");
    return `${root}/v1a/nano_contract/${endpoint}`;
  }

  // --- Node requests -------------------------------------------------------

  /**
   * A rate-limited or momentarily unavailable node is worth asking again; a
   * `404` or a malformed request is not.
   */
  private isRetryable(err: any): boolean {
    if (err?.response) {
      return RETRYABLE_STATUSES.includes(err.response.status);
    }
    // No response at all: a timeout or a dropped connection.
    return true;
  }

  private async fetchJson(url: string, retries = 0): Promise<any> {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await this.http.get(url);
        return response.data;
      } catch (err: any) {
        if (attempt < retries && this.isRetryable(err)) {
          await sleep(DISCOVERY_RETRY_DELAY_MS * 2 ** attempt);
          continue;
        }
        if (err.code === "ECONNABORTED" || err.code === "ETIMEDOUT") {
          throw new Error(`Request timed out after ${this.timeoutMs}ms`);
        }
        if (err.response) {
          const data = err.response.data;
          const nodeError = schemas.NodeErrorResponseSchema.safeParse(data);
          if (nodeError.success) {
            throw new Error(`Node responded ${err.response.status}: ${nodeError.data.error}`);
          }
          const text = typeof data === "string" ? data : JSON.stringify(data);
          throw new Error(`Node responded ${err.response.status} ${err.response.statusText}: ${text}`);
        }
        throw err;
      }
    }
  }

  private async getValidated<T extends ZodType>(
    url: string,
    responseSchema: T,
    context: string,
    retries = 0
  ): Promise<z.infer<T>> {
    const json = await this.fetchJson(url, retries);

    // The node also reports failures with a 200 body of `{ success: false }`.
    const nodeError = schemas.NodeErrorResponseSchema.safeParse(json);
    if (nodeError.success) {
      throw new Error(`Node error while reading ${context}: ${nodeError.data.error}`);
    }

    const parsed = responseSchema.safeParse(json);
    if (!parsed.success) {
      throw new Error(`Failed to parse ${context} response: ${parsed.error.message}`);
    }
    return parsed.data;
  }

  private serializeArg(arg: any): string {
    if (typeof arg === "string") {
      return JSON.stringify(arg);
    }
    if (typeof arg === "number" || typeof arg === "boolean") {
      return String(arg);
    }
    if (Array.isArray(arg)) {
      const inner = arg.map(a => this.serializeArg(a)).join(",");
      return `[${inner}]`;
    }
    return JSON.stringify(arg);
  }

  private buildCallString(methodName: string, params?: any[]): string {
    if (!params || params.length === 0) return `${methodName}()`;
    const s = params.map(p => this.serializeArg(p)).join(",");
    return `${methodName}(${s})`;
  }

  async callView<T extends ZodType>(
    methodName: string,
    params: any[] | undefined,
    contractId: string | undefined,
    responseSchema: T
  ): Promise<z.infer<T>> {
    const id = contractId ?? this.contractId;
    if (!id) throw new Error("contractId is required.");

    const callStr = this.buildCallString(methodName, params);
    const url = `${this.nodeEndpoint("state")}?id=${encodeURIComponent(id)}&calls[]=${encodeURIComponent(callStr)}`;

    const json = await this.getValidated(url, schemas.ApiResponseSchema, "nano contract state");
    const result = json.calls[callStr];

    if (result?.errmsg) {
      throw new Error(`Nano contract error: ${result.errmsg}`);
    }

    const validationResult = responseSchema.safeParse(result?.value);

    if (validationResult.success) {
      return validationResult.data;
    } else {
      throw new Error(`Invalid response value for method ${methodName}: ${validationResult.error.message}`);
    }
  }

  private async _getContractId(name: string): Promise<string> {
    // 1. Use the contractId from the Sdk options (for testing)
    if (this.contractId) {
      return this.contractId;
    }

    const suffix = getDomainSuffix(name);
    if (!suffix) {
      throw new Error(`Could not determine contract ID for name "${name}": it has no domain suffix (expected something like "example.htr").`);
    }

    // 2. Resolve from the cached map, collecting it from the node on first use.
    if (this.contractIds[suffix]) {
      return this.contractIds[suffix];
    }
    await this.loadContractIds();
    if (this.contractIds[suffix]) {
      return this.contractIds[suffix];
    }

    // 3. If all else fails, throw an error
    const known = this.getDomains().join(", ") || "none";
    throw new Error(`Could not determine contract ID for name "${name}". No nano contract created from blueprint ${this.blueprintId} registers the ".${suffix}" domain. Known domains: ${known}. Call refreshContractIds() if the domain was created after the map was collected.`);
  }

  private _hexToBytes(hex: string): Uint8Array {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }

  private _getB58Address(address: string): string {
    // Only convert valid, even-length hex strings; otherwise return as-is.
    if (typeof address === 'string' && address.length % 2 === 0 && /^[0-9a-fA-F]+$/.test(address)) {
        return encode(this._hexToBytes(address));
    }
    return address;
  }

  async isNameAvailable(name: string) {
    const finalContractId = await this._getContractId(name);
    const nameWithoutSuffix = name.split('.').slice(0, -1).join('.');
    const now_timestamp = Math.floor(Date.now() / 1000);
    return this.callView("is_name_available", [nameWithoutSuffix, now_timestamp], finalContractId, schemas.IsNameAvailableResponseSchema);
  }

  async resolveName(name: string) {
    const finalContractId = await this._getContractId(name);
    const nameWithoutSuffix = name.split('.').slice(0, -1).join('.');
    const now_timestamp = Math.floor(Date.now() / 1000);
    const hexAddress = await this.callView("resolve_name", [nameWithoutSuffix, now_timestamp], finalContractId, schemas.ResolveNameResponseSchema);
    return this._getB58Address(hexAddress);
  }

  async getNameData(name: string) {
    const finalContractId = await this._getContractId(name);
    const nameWithoutSuffix = name.split('.').slice(0, -1).join('.');
    return this.callView("get_name_data", [nameWithoutSuffix], finalContractId, schemas.GetNameDataResponseSchema);
  }

  async getProfileData(name: string) {
    const finalContractId = await this._getContractId(name);
    const nameWithoutSuffix = name.split('.').slice(0, -1).join('.');
    return this.callView("get_profile_data", [nameWithoutSuffix], finalContractId, schemas.GetProfileDataResponseSchema);
  }

  async getNameOwner(name: string) {
    const finalContractId = await this._getContractId(name);
    const nameWithoutSuffix = name.split('.').slice(0, -1).join('.');
    const hexAddress = await this.callView("get_name_owner", [nameWithoutSuffix], finalContractId, schemas.GetNameOwnerResponseSchema);
    return this._getB58Address(hexAddress);
  }

  async getNameExpirationInfo(name: string) {
    const finalContractId = await this._getContractId(name);
    const nameWithoutSuffix = name.split('.').slice(0, -1).join('.');
    const now_timestamp = Math.floor(Date.now() / 1000);
    return this.callView("get_name_expiration_info", [nameWithoutSuffix, now_timestamp], finalContractId, schemas.GetNameExpirationInfoResponseSchema);
  }

  async getNameExpirationDate(name: string) {
    const finalContractId = await this._getContractId(name);
    const nameWithoutSuffix = name.split('.').slice(0, -1).join('.');
    return this.callView("get_name_expiration_date", [nameWithoutSuffix], finalContractId, schemas.GetNameExpirationDateResponseSchema);
  }

  async validateName(name: string) {
    const finalContractId = await this._getContractId(name);
    const nameWithoutSuffix = name.split('.').slice(0, -1).join('.');
    return this.callView("validate_name", [nameWithoutSuffix], finalContractId, schemas.ValidateNameResponseSchema);
  }

  async checkNameOwnership(name: string, address: string) {
    const finalContractId = await this._getContractId(name);
    const nameWithoutSuffix = name.split('.').slice(0, -1).join('.');
    const now_timestamp = Math.floor(Date.now() / 1000);
    return this.callView("check_name_ownership", [nameWithoutSuffix, address, now_timestamp], finalContractId, schemas.CheckNameOwnershipResponseSchema);
  }

  async checkNameStatus(name: string) {
    const finalContractId = await this._getContractId(name);
    const nameWithoutSuffix = name.split('.').slice(0, -1).join('.');
    const now_timestamp = Math.floor(Date.now() / 1000);
    return this.callView("check_name_status", [nameWithoutSuffix, now_timestamp], finalContractId, schemas.CheckNameStatusResponseSchema);
  }

  async getFeeInfo(name: string) {
    const finalContractId = await this._getContractId(name);
    const nameWithoutSuffix = name.split('.').slice(0, -1).join('.');
    return this.callView("get_fee_info", [nameWithoutSuffix], finalContractId, schemas.GetFeeInfoResponseSchema);
  }

  async calculateFee(name: string) {
    const finalContractId = await this._getContractId(name);
    const nameWithoutSuffix = name.split('.').slice(0, -1).join('.');
    return this.callView("calculate_fee", [nameWithoutSuffix], finalContractId, schemas.CalculateFeeResponseSchema);
  }

  private async _getContractIdFromSuffix(suffix: string): Promise<string> {
    return this._getContractId(`name.${suffix}`);
  }

  async validateKeyFormat(key: string, value: string, domainSuffix: string) {
    const finalContractId = await this._getContractIdFromSuffix(domainSuffix);
    return this.callView("validate_key_format", [key, value], finalContractId, schemas.ValidateKeyFormatResponseSchema);
  }

  async getDevAddress(domainSuffix: string) {
    const finalContractId = await this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_dev_address", [], finalContractId, schemas.GetDevAddressResponseSchema);
  }

  async getContractDomain(domainSuffix: string) {
    const finalContractId = await this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_contract_domain", [], finalContractId, schemas.GetContractDomainResponseSchema);
  }

  async getFeeMultiplier(length: number, domainSuffix: string) {
    const finalContractId = await this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_fee_multiplier", [length], finalContractId, schemas.GetFeeMultiplierResponseSchema);
  }

  async getManagerNames(managerAddress: string, domainSuffix: string) {
    const finalContractId = await this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_manager_names", [managerAddress], finalContractId, schemas.GetManagerNamesResponseSchema);
  }

  async getManagerPrimaryName(managerAddress: string, domainSuffix: string) {
    const finalContractId = await this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_manager_primary_name", [managerAddress], finalContractId, schemas.GetManagerPrimaryNameResponseSchema);
  }

  async getFeeStructure(domainSuffix: string) {
    const finalContractId = await this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_fee_structure", [], finalContractId, schemas.GetFeeStructureResponseSchema);
  }

  async getMaxProfileDataEntries(domainSuffix: string) {
    const finalContractId = await this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_max_profile_data_entries", [], finalContractId, schemas.GetMaxProfileDataEntriesResponseSchema);
  }

  async getMaxProfileKeyLength(domainSuffix: string) {
    const finalContractId = await this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_max_profile_key_length", [], finalContractId, schemas.GetMaxProfileKeyLengthResponseSchema);
  }

  async getMaxProfileValueLength(domainSuffix: string) {
    const finalContractId = await this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_max_profile_value_length", [], finalContractId, schemas.GetMaxProfileValueLengthResponseSchema);
  }

  async getMaxTokenSymbolLength(domainSuffix: string) {
    const finalContractId = await this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_max_token_symbol_length", [], finalContractId, schemas.GetMaxTokenSymbolLengthResponseSchema);
  }

  async getMaxTotalProfileSize(domainSuffix: string) {
    const finalContractId = await this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_max_total_profile_size", [], finalContractId, schemas.GetMaxTotalProfileSizeResponseSchema);
  }

  async getGracePeriodDays(domainSuffix: string) {
    const finalContractId = await this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_grace_period_days", [], finalContractId, schemas.GetGracePeriodDaysResponseSchema);
  }

  async callMultiple(calls: { method: string; params?: any[] }[], domainSuffix: string): Promise<any[]> {
    const id = await this._getContractIdFromSuffix(domainSuffix);

    const callStrings = calls.map(c => this.buildCallString(c.method, c.params));
    const queryParts = callStrings.map(cs => `calls[]=${encodeURIComponent(cs)}`);
    const url = `${this.nodeEndpoint("state")}?id=${encodeURIComponent(id)}&${queryParts.join("&")}`;

    const json = await this.getValidated(url, schemas.ApiResponseSchema, "nano contract state");

    return callStrings.map(cs => {
        const result = json.calls[cs];
        if (result?.errmsg) {
            throw new Error(`Smart contract error in method ${cs}: ${result.errmsg}`);
        }
        return result ? result.value : undefined;
    });
  }
}
