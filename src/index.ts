import fetch from "cross-fetch";
import { encode } from "bs58";
import { z, ZodType } from "zod";
import * as schemas from "./schemas";

export type ThothSDKOptions = {
  nodeUrl?: string;
  contractId?: string | null;
  contractApiUrl?: string;
  useSsl?: boolean;
  timeoutMs?: number;
};

export class ThothIdSDK {
  nodeUrl: string;
  contractId?: string | null;
  contractApiUrl?: string;
  contractIds: Record<string, string> = {};
  timeoutMs: number;

  constructor(opts: ThothSDKOptions = {}) {
    this.nodeUrl = opts.nodeUrl ?? "https://node1.mainnet.hathor.network/";
    this.contractId = opts.contractId ?? null;
    this.timeoutMs = opts.timeoutMs ?? 15000;

    if (opts.contractApiUrl) {
      this.contractApiUrl = opts.contractApiUrl;
    } else {
      const useSsl = opts.useSsl ?? true;
      this.contractApiUrl = `${useSsl ? 'https' : 'http'}://domains.thoth.id`;
    }
  }

  async loadContractIds(url?: string): Promise<void> {
    const targetUrl = url ?? this.contractApiUrl;
    if (!targetUrl) {
      return;
    }

    try {
      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch contract IDs: ${response.statusText}`);
      }
      this.contractIds = await response.json();
    } catch (error) {
      console.error("Error loading contract IDs:", error);
      throw error;
    }
  }

  private getContractIdForName(name: string): string | undefined {
    const parts = name.split('.');
    if (parts.length < 2) {
      return undefined;
    }
    const suffix = parts[parts.length - 1];
    return this.contractIds[suffix];
  }

  setNodeUrl(url: string) { this.nodeUrl = url; }
  setContractId(id: string) { this.contractId = id; }

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
    const baseUrl = this.nodeUrl.endsWith('/') ? this.nodeUrl : `${this.nodeUrl}/`;
    const urlBase = `${baseUrl}v1a/nano_contract/state`;
    const url = `${urlBase}?id=${encodeURIComponent(id)}&calls[]=${encodeURIComponent(callStr)}`;

    const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
    let timer: any;
    if (controller) {
      timer = setTimeout(() => controller.abort(), this.timeoutMs);
    }

    try {
      const resp = await fetch(url, {
        method: "GET",
        signal: controller ? controller.signal : undefined
      });

      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`Node responded ${resp.status} ${resp.statusText}: ${text}`);
      }

      const json = await resp.json();
      const parsedResponse = schemas.ApiResponseSchema.safeParse(json);

      if (!parsedResponse.success) {
        throw new Error(`Failed to parse API response: ${parsedResponse.error.message}`);
      }

      const result = parsedResponse.data.calls[callStr];

      if (result?.errmsg) {
        throw new Error(`Smart contract error: ${result.errmsg}`);
      }

      const valueToParse = result?.value;
      const validationResult = responseSchema.safeParse(valueToParse);

      if (validationResult.success) {
        return validationResult.data;
      } else {
        throw new Error(`Invalid response value for method ${methodName}: ${validationResult.error.message}`);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error(`Request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private _getContractId(name: string): string {
    // 1. Use the contractId from the SDK options (for testing)
    if (this.contractId) {
      return this.contractId;
    }
    // 2. Resolve the contractId from the name suffix
    const fromName = this.getContractIdForName(name);
    if (fromName) {
      return fromName;
    }
    // 3. If all else fails, throw an error
    throw new Error(`Could not determine contract ID for name "${name}". No contractId was provided and the suffix does not match a known contract.`);
  }

  async isNameAvailable(name: string) {
    const finalContractId = this._getContractId(name);
    const now_timestamp = Math.floor(Date.now() / 1000);
    return this.callView("is_name_available", [name, now_timestamp], finalContractId, schemas.IsNameAvailableResponseSchema);
  }

  async resolveName(name: string) {
    const finalContractId = this._getContractId(name);
    const now_timestamp = Math.floor(Date.now() / 1000);
    const hexAddress = await this.callView("resolve_name", [name, now_timestamp], finalContractId, schemas.ResolveNameResponseSchema);
    if (typeof hexAddress === 'string' && /^[0-9a-fA-F]+$/.test(hexAddress)) {
        const buffer = Buffer.from(hexAddress, 'hex');
        return encode(buffer);
    }
    return hexAddress;
  }

  async getNameData(name: string) {
    const finalContractId = this._getContractId(name);
    return this.callView("get_name_data", [name], finalContractId, schemas.GetNameDataResponseSchema);
  }

  async getNameOwner(name: string) {
    const finalContractId = this._getContractId(name);
    const hexAddress = await this.callView("get_name_owner", [name], finalContractId, schemas.GetNameOwnerResponseSchema);
    if (typeof hexAddress === 'string' && /^[0-9a-fA-F]+$/.test(hexAddress)) {
        const buffer = Buffer.from(hexAddress, 'hex');
        return encode(buffer);
    }
    return hexAddress;
  }

  async getNameExpirationInfo(name: string) {
    const finalContractId = this._getContractId(name);
    const now_timestamp = Math.floor(Date.now() / 1000);
    return this.callView("get_name_expiration_info", [name, now_timestamp], finalContractId, schemas.GetNameExpirationInfoResponseSchema);
  }

  async getNameExpirationDate(name: string) {
    const finalContractId = this._getContractId(name);
    return this.callView("get_name_expiration_date", [name], finalContractId, schemas.GetNameExpirationDateResponseSchema);
  }

  async validateName(name: string) {
    const finalContractId = this._getContractId(name);
    return this.callView("validate_name", [name], finalContractId, schemas.ValidateNameResponseSchema);
  }

  private _getContractIdFromSuffix(suffix: string): string {
    // 1. Use the contractId from the SDK options (for testing)
    if (this.contractId) {
      return this.contractId;
    }
    // 2. Resolve the contractId from the suffix
    const fromSuffix = this.contractIds[suffix];
    if (fromSuffix) {
      return fromSuffix;
    }
    // 3. If all else fails, throw an error
    throw new Error(`Could not determine contract ID for suffix "${suffix}".`);
  }

  async validateKeyFormat(key: string, value: string, domainSuffix: string) {
    const finalContractId = this._getContractIdFromSuffix(domainSuffix);
    return this.callView("validate_key_format", [key, value], finalContractId, schemas.ValidateKeyFormatResponseSchema);
  }

  async getDevAddress(domainSuffix: string) {
    const finalContractId = this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_dev_address", [], finalContractId, schemas.GetDevAddressResponseSchema);
  }

  async getContractDomain(domainSuffix: string) {
    const finalContractId = this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_contract_domain", [], finalContractId, schemas.GetContractDomainResponseSchema);
  }

  async getFeeMultiplier(length: number, domainSuffix: string) {
    const finalContractId = this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_fee_multiplier", [length], finalContractId, schemas.GetFeeMultiplierResponseSchema);
  }

  async getManagerNames(manager_address: string, domainSuffix: string) {
    const finalContractId = this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_manager_names", [manager_address], finalContractId, schemas.GetManagerNamesResponseSchema);
  }

  async getManagerPrimaryName(manager_address: string, domainSuffix: string) {
    const finalContractId = this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_manager_primary_name", [manager_address], finalContractId, schemas.GetManagerPrimaryNameResponseSchema);
  }

  async getFeeStructure(domainSuffix: string) {
    const finalContractId = this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_fee_structure", [], finalContractId, schemas.GetFeeStructureResponseSchema);
  }

  async getMaxProfileDataEntries(domainSuffix: string) {
    const finalContractId = this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_max_profile_data_entries", [], finalContractId, schemas.GetMaxProfileDataEntriesResponseSchema);
  }

  async getMaxProfileKeyLength(domainSuffix: string) {
    const finalContractId = this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_max_profile_key_length", [], finalContractId, schemas.GetMaxProfileKeyLengthResponseSchema);
  }

  async getMaxProfileValueLength(domainSuffix: string) {
    const finalContractId = this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_max_profile_value_length", [], finalContractId, schemas.GetMaxProfileValueLengthResponseSchema);
  }

  async getMaxTokenSymbolLength(domainSuffix: string) {
    const finalContractId = this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_max_token_symbol_length", [], finalContractId, schemas.GetMaxTokenSymbolLengthResponseSchema);
  }

  async getMaxTotalProfileSize(domainSuffix: string) {
    const finalContractId = this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_max_total_profile_size", [], finalContractId, schemas.GetMaxTotalProfileSizeResponseSchema);
  }

  async getGracePeriodDays(domainSuffix: string) {
    const finalContractId = this._getContractIdFromSuffix(domainSuffix);
    return this.callView("get_grace_period_days", [], finalContractId, schemas.GetGracePeriodDaysResponseSchema);
  }

  async callMultiple(calls: { method: string; params?: any[] }[], domainSuffix: string): Promise<any[]> {
    const finalContractId = this._getContractIdFromSuffix(domainSuffix);
    const id = finalContractId;
    if (!id) throw new Error("contractId is required.");

    const callStrings = calls.map(c => this.buildCallString(c.method, c.params));
    const baseUrl = this.nodeUrl.endsWith('/') ? this.nodeUrl : `${this.nodeUrl}/`;
    const urlBase = `${baseUrl}v1a/nano_contract/state?id=${encodeURIComponent(id)}`;
    const queryParts = callStrings.map(cs => `calls[]=${encodeURIComponent(cs)}`);
    const url = `${urlBase}&${queryParts.join("&")}`;

    const resp = await fetch(url, { method: "GET" });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      throw new Error(`Node error ${resp.status}: ${txt}`);
    }
    const json = await resp.json();

    const parsedResponse = schemas.ApiResponseSchema.safeParse(json);
    if (!parsedResponse.success) {
      throw new Error(`Failed to parse API response: ${parsedResponse.error.message}`);
    }

    const results = callStrings.map(cs => {
        const result = parsedResponse.data.calls[cs];
        if (result?.errmsg) {
            throw new Error(`Smart contract error in method ${cs}: ${result.errmsg}`);
        }
        // Note: Specific schema validation is not applied here as callMultiple can have mixed types.
        return result ? result.value : undefined;
    });

    return results;
  }
}

export default ThothIdSDK;
