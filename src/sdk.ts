import axios, { AxiosInstance } from "axios";
import { encode } from "bs58";
import { z, ZodType } from "zod";
import * as schemas from "./schemas";
import { BlockedDomain, CallResult, ContractIdMap, Network, NetworkConfig, ThothSDKOptions } from "./index";

/** State endpoint of the public testnet node. */
export const DEFAULT_NODE_URL = "https://node1.testnet.hathor.network/v1a/nano_contract/state";

/** Blueprint ID of the ThothNamer nano contract on testnet. */
export const DEFAULT_BLUEPRINT_ID = "000000009108a3ab3c24297df5e33679177fb8a051c133bcad467a8a23bf0dd3";

/** State endpoint of the public mainnet node. */
export const MAINNET_NODE_URL = "https://node1.mainnet.hathor.network/v1a/nano_contract/state";

/** ThothNamer blueprint IDs on mainnet, oldest version first. */
export const MAINNET_BLUEPRINT_IDS = [
  "000000420ca7b70e522da7765c8c11ecc89a9e8a79d70eee49d5bdff4db03e92", // v1.0
  "00000020324712abca4e3de7f25c05825808b9a3dd9aeb5b7cfe89a892203183", // v1.1
];

/** Network used when none is given. */
export const DEFAULT_NETWORK: Network = "testnet";

/** What each network brings by default. */
export const NETWORKS: Readonly<Record<Network, Readonly<NetworkConfig>>> = {
  testnet: { nodeUrl: DEFAULT_NODE_URL, blueprintIds: [DEFAULT_BLUEPRINT_ID] },
  mainnet: { nodeUrl: MAINNET_NODE_URL, blueprintIds: MAINNET_BLUEPRINT_IDS },
};

function networkConfig(network: Network): Readonly<NetworkConfig> {
  if (!Object.prototype.hasOwnProperty.call(NETWORKS, network)) {
    throw new Error(`Unknown network "${network}". Expected one of: ${Object.keys(NETWORKS).join(", ")}.`);
  }
  return NETWORKS[network];
}

function checkBlueprintIds(blueprintIds: string[]): string[] {
  if (blueprintIds.length === 0) {
    throw new Error("At least one blueprint ID is required to discover the domain registries.");
  }
  return [...new Set(blueprintIds)];
}

/** Creation transactions requested per page. Honoured by the node up to 100. */
const CREATION_PAGE_SIZE = 100;

/** Safety net so a node that keeps reporting `has_more` cannot loop forever. */
const MAX_CREATION_PAGES = 50;

/**
 * Retries granted by default to a request that failed for a reason worth trying
 * again (rate limiting, a gateway hiccup, a dropped connection).
 *
 * Public nodes sit behind an nginx that shapes requests to roughly one per
 * second and answers a burst with `429 Too Many Requests`, so every request
 * backs off when it is throttled, and discovery also issues its `history`
 * requests one at a time.
 */
const DEFAULT_RETRIES = 3;

/** Base of the exponential backoff between retries. */
const RETRY_DELAY_MS = 1000;

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

/** Drops `undefined` values, e.g. from an unset environment variable. */
function definedHeaders(headers: ThothSDKOptions["headers"]): Record<string, string> {
  const defined: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers ?? {})) {
    if (value !== undefined) {
      defined[name] = value;
    }
  }
  return defined;
}

/** A registry creation as listed by the node. */
type CreationTx = { nanoContractId: string; createdAt?: number };

/** What one discovery collects. */
type Discovery = { contractIds: ContractIdMap; blockedDomains: Record<string, BlockedDomain> };

export class ThothIdSDK {
  network: Network;
  nodeUrl: string;
  contractId?: string | null;
  /** ThothNamer blueprint IDs searched during discovery. */
  blueprintIds: string[];
  contractIds: ContractIdMap = {};
  /**
   * Domains whose first registry now runs an untrusted blueprint, keyed by
   * suffix. Filled by discovery; names under them fail instead of resolving.
   */
  blockedDomains: Record<string, BlockedDomain> = {};
  timeoutMs: number;
  retries: number;
  private http: AxiosInstance;
  /** In-flight (or settled) discovery, so the map is collected only once. */
  private discovery: Promise<ContractIdMap> | null = null;

  constructor(opts: ThothSDKOptions = {}) {
    this.network = opts.network ?? DEFAULT_NETWORK;
    const preset = networkConfig(this.network);
    this.nodeUrl = opts.nodeUrl ?? preset.nodeUrl;
    this.contractId = opts.contractId ?? null;
    this.blueprintIds = checkBlueprintIds(
      opts.blueprintIds ?? (opts.blueprintId ? [opts.blueprintId] : [...preset.blueprintIds])
    );
    this.timeoutMs = opts.timeoutMs ?? 15000;
    this.retries = opts.retries ?? DEFAULT_RETRIES;

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
      headers: definedHeaders(opts.headers),
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
        ({ contractIds, blockedDomains }) => {
          this.contractIds = contractIds;
          this.blockedDomains = blockedDomains;
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
    this.blockedDomains = {};
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

  /** Domains discovery refused to resolve, with the contract and blueprint that caused it. */
  getBlockedDomains(): Record<string, BlockedDomain> {
    const copy: Record<string, BlockedDomain> = {};
    for (const [domain, blocked] of Object.entries(this.blockedDomains)) {
      copy[domain] = { ...blocked };
    }
    return copy;
  }

  /** Cached contract ID of a domain suffix, without triggering discovery. */
  getContractIdForDomain(domainSuffix: string): string | undefined {
    return this.contractIds[domainSuffix.toLowerCase()];
  }

  /**
   * Every registry is a nano contract created from a ThothNamer blueprint, so
   * the map is rebuilt by listing those creations and reading the domain each
   * one registered. When two contracts claim the same domain the oldest one
   * wins, which is the domain's first registry — across every blueprint
   * version, since an upgraded contract stays listed under the blueprint it was
   * created from.
   *
   * Creation alone is not enough to trust a registry: whoever creates a
   * contract can later upgrade it to any code. So the first registry of each
   * domain is also checked for the blueprint it runs *now*, and if that is not
   * one of `blueprintIds` the domain is blocked. It is not handed to the next
   * contract claiming it either — that would let a later, different registry
   * take over the domain silently. Only first claimants are checked, so this
   * costs one extra request per domain, not per contract.
   *
   * Requests go out one at a time: public nodes rate-limit hard, and skipping a
   * contract is not a harmless gap here. If the oldest registry of a domain
   * could not be read, the next contract claiming that domain would silently
   * take its place and every name under it would resolve against the wrong
   * contract. So a contract that cannot be read fails the whole collection
   * rather than quietly reshaping the map.
   */
  private async collectContractIds(): Promise<Discovery> {
    const nanoContractIds = await this.fetchAllCreationTxIds();
    const contractIds: ContractIdMap = {};
    const blockedDomains: Record<string, BlockedDomain> = {};

    for (const nanoContractId of nanoContractIds) {
      const domain = await this.fetchDomainForContract(nanoContractId);
      // Creations are listed oldest first, so the first claim of a domain
      // decides it, whether that registry is trusted or blocked.
      if (!domain || domain in contractIds || domain in blockedDomains) {
        continue;
      }

      const blueprintId = await this.fetchCurrentBlueprint(nanoContractId);
      if (this.blueprintIds.includes(blueprintId)) {
        contractIds[domain] = nanoContractId;
      } else {
        blockedDomains[domain] = { contractId: nanoContractId, blueprintId };
      }
    }

    return { contractIds, blockedDomains };
  }

  /** Blueprint a contract runs now, which differs from its creation one after an upgrade. */
  private async fetchCurrentBlueprint(nanoContractId: string): Promise<string> {
    const url = `${this.nodeEndpoint("state")}?id=${encodeURIComponent(nanoContractId)}`;
    const response = await this.getValidated(url, schemas.NanoContractStateSchema, "nano contract state");
    return response.blueprint_id;
  }

  /**
   * Lists every nano contract created from any of the blueprints, oldest first.
   * Each blueprint's list is already in creation order; merging them orders by
   * `created_at`, and a stable sort keeps the node's order for any entry that
   * lacks one.
   */
  private async fetchAllCreationTxIds(): Promise<string[]> {
    const creations: CreationTx[] = [];
    for (const blueprintId of this.blueprintIds) {
      creations.push(...(await this.fetchCreationTxs(blueprintId)));
    }

    if (this.blueprintIds.length > 1) {
      creations.sort((a, b) => {
        if (a.createdAt === undefined || b.createdAt === undefined) {
          return 0;
        }
        return a.createdAt - b.createdAt;
      });
    }

    const seen = new Set<string>();
    return creations
      .map((tx) => tx.nanoContractId)
      .filter((id) => !seen.has(id) && Boolean(seen.add(id)));
  }

  /** Lists every nano contract created from one blueprint, oldest first. */
  private async fetchCreationTxs(blueprintId: string): Promise<CreationTx[]> {
    const baseUrl =
      `${this.nodeEndpoint("creation")}?search=${encodeURIComponent(blueprintId)}` +
      `&order=asc&count=${CREATION_PAGE_SIZE}`;

    const creations: CreationTx[] = [];
    const seen = new Set<string>();
    let after: string | null = null;

    for (let page = 0; page < MAX_CREATION_PAGES; page++) {
      const url: string = after ? `${baseUrl}&after=${encodeURIComponent(after)}` : baseUrl;
      const response = await this.getValidated(
        url,
        schemas.NanoContractCreationResponseSchema,
        "nano contract creation"
      );

      const pageTxs = response.nc_creation_txs;
      const newTxs = pageTxs.filter((tx) => !seen.has(tx.nano_contract_id));
      for (const tx of newTxs) {
        seen.add(tx.nano_contract_id);
        creations.push({ nanoContractId: tx.nano_contract_id, createdAt: tx.created_at });
      }

      // Stop when the node says there is nothing left, and also when a page
      // adds nothing new so a repeated page cannot spin forever.
      if (!response.has_more || newTxs.length === 0) {
        return creations;
      }
      after = pageTxs[pageTxs.length - 1].nano_contract_id;
    }

    throw new Error(
      `Contract discovery aborted after ${MAX_CREATION_PAGES} pages of creation transactions for blueprint ${blueprintId}.`
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
      "nano contract history"
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

  /**
   * Switches to another network's node and blueprints. Registries live on one
   * network only, so the map is dropped.
   */
  setNetwork(network: Network) {
    const preset = networkConfig(network);
    this.network = network;
    this.nodeUrl = preset.nodeUrl;
    this.blueprintIds = [...preset.blueprintIds];
    this.invalidateContractIds();
  }

  /** Changing the node points at another network, so the map is dropped. */
  setNodeUrl(url: string) {
    this.nodeUrl = url;
    this.invalidateContractIds();
  }

  setContractId(id: string) { this.contractId = id; }

  /** Changing the blueprints changes which registries exist, so the map is dropped. */
  setBlueprintIds(ids: string[]) {
    this.blueprintIds = checkBlueprintIds(ids);
    this.invalidateContractIds();
  }

  /** Single-blueprint shorthand for `setBlueprintIds`. */
  setBlueprintId(id: string) {
    this.setBlueprintIds([id]);
  }

  /** First blueprint searched; kept for v3.0 callers. Prefer `blueprintIds`. */
  get blueprintId(): string {
    return this.blueprintIds[0];
  }

  set blueprintId(id: string) {
    this.setBlueprintId(id);
  }

  private invalidateContractIds() {
    this.contractIds = {};
    this.blockedDomains = {};
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

  private async fetchJson(url: string): Promise<any> {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await this.http.get(url);
        return response.data;
      } catch (err: any) {
        if (attempt < this.retries && this.isRetryable(err)) {
          await sleep(RETRY_DELAY_MS * 2 ** attempt);
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
    context: string
  ): Promise<z.infer<T>> {
    const json = await this.fetchJson(url);

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

    const blocked = this.blockedDomains[suffix];
    if (blocked) {
      throw new Error(`Refusing to resolve "${name}": the ".${suffix}" domain is registered by contract ${blocked.contractId}, which now runs blueprint ${blocked.blueprintId} — not a trusted ThothNamer version on ${this.network} (${this.blueprintIds.join(", ")}). If that blueprint is a new ThothNamer release, update the Sdk or add it to blueprintIds.`);
    }

    // 3. If all else fails, throw an error
    const known = this.getDomains().join(", ") || "none";
    throw new Error(`Could not determine contract ID for name "${name}". No nano contract created from blueprint ${this.blueprintIds.join(" or ")} on ${this.network} registers the ".${suffix}" domain. Known domains: ${known}. Call refreshContractIds() if the domain was created after the map was collected.`);
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
    const results = await this.callMultipleSettled(calls, domainSuffix);

    return results.map((result, i) => {
        if (!result.ok) {
            throw new Error(`Smart contract error in method ${this.buildCallString(calls[i].method, calls[i].params)}: ${result.error}`);
        }
        return result.value;
    });
  }

  /**
   * Like `callMultiple`, but a failing call does not sink the batch: each call
   * gets its own `{ ok, value }` or `{ ok, error }`, in the order given. The
   * node already evaluates every call independently, so one invalid address
   * only fails its own entry. Only a failure of the request itself (after
   * retries) rejects the whole promise.
   */
  async callMultipleSettled(calls: { method: string; params?: any[] }[], domainSuffix: string): Promise<CallResult[]> {
    const id = await this._getContractIdFromSuffix(domainSuffix);

    const callStrings = calls.map(c => this.buildCallString(c.method, c.params));
    const queryParts = callStrings.map(cs => `calls[]=${encodeURIComponent(cs)}`);
    const url = `${this.nodeEndpoint("state")}?id=${encodeURIComponent(id)}&${queryParts.join("&")}`;

    const json = await this.getValidated(url, schemas.ApiResponseSchema, "nano contract state");

    return callStrings.map((cs): CallResult => {
        const result = json.calls[cs];
        if (result?.errmsg) {
            return { ok: false, error: result.errmsg };
        }
        return { ok: true, value: result ? result.value : undefined };
    });
  }
}
