import fetch from "cross-fetch";
import { encode } from "bs58";
import { z, ZodType } from "zod";
import * as schemas from "./schemas";

export type ThothSDKOptions = {
  nodeUrl?: string;
  contractId?: string;
  timeoutMs?: number;
};

export class ThothIdSDK {
  nodeUrl: string;
  contractId?: string;
  timeoutMs: number;

  constructor(opts: ThothSDKOptions = {}) {
    this.nodeUrl = opts.nodeUrl ?? "https://node1.mainnet.hathor.network/";
    this.contractId = opts.contractId ?? "CONTRACT-ID-HERE";
    this.timeoutMs = opts.timeoutMs ?? 15000;
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

  async isNameAvailable(name: string, contractId?: string) {
    const now_timestamp = Math.floor(Date.now() / 1000);
    return this.callView("is_name_available", [name, now_timestamp], contractId, schemas.IsNameAvailableResponseSchema);
  }

  async resolveName(name: string, contractId?: string) {
    const now_timestamp = Math.floor(Date.now() / 1000);
    const hexAddress = await this.callView("resolve_name", [name, now_timestamp], contractId, schemas.ResolveNameResponseSchema);
    if (typeof hexAddress === 'string' && /^[0-9a-fA-F]+$/.test(hexAddress)) {
        const buffer = Buffer.from(hexAddress, 'hex');
        return encode(buffer);
    }
    return hexAddress;
  }

  async getNameData(name: string, contractId?: string) {
    return this.callView("get_name_data", [name], contractId, schemas.GetNameDataResponseSchema);
  }

  async getNameOwner(name: string, contractId?: string) {
    const hexAddress = await this.callView("get_name_owner", [name], contractId, schemas.GetNameOwnerResponseSchema);
    if (typeof hexAddress === 'string' && /^[0-9a-fA-F]+$/.test(hexAddress)) {
        const buffer = Buffer.from(hexAddress, 'hex');
        return encode(buffer);
    }
    return hexAddress;
  }

  async getNameExpirationInfo(name: string, contractId?: string) {
    const now_timestamp = Math.floor(Date.now() / 1000);
    return this.callView("get_name_expiration_info", [name, now_timestamp], contractId, schemas.GetNameExpirationInfoResponseSchema);
  }

  async getNameExpirationDate(name: string, contractId?: string) {
    return this.callView("get_name_expiration_date", [name], contractId, schemas.GetNameExpirationDateResponseSchema);
  }

  async validateName(name: string, contractId?: string) {
    return this.callView("validate_name", [name], contractId, schemas.ValidateNameResponseSchema);
  }

  async validateKeyFormat(key: string, value: string, contractId?: string) {
    return this.callView("validate_key_format", [key, value], contractId, schemas.ValidateKeyFormatResponseSchema);
  }

  async getDevAddress(contractId?: string) {
    return this.callView("get_dev_address", [], contractId, schemas.GetDevAddressResponseSchema);
  }

  async getContractDomain(contractId?: string) {
    return this.callView("get_contract_domain", [], contractId, schemas.GetContractDomainResponseSchema);
  }

  async checkNameOwnership(name: string, address: string, contractId?: string) {
    const now_timestamp = Math.floor(Date.now() / 1000);
    return this.callView("check_name_ownership", [name, address, now_timestamp], contractId, schemas.CheckNameOwnershipResponseSchema);
  }

  async checkNameStatus(name: string, contractId?: string) {
    const now_timestamp = Math.floor(Date.now() / 1000);
    return this.callView("check_name_status", [name, now_timestamp], contractId, schemas.CheckNameStatusResponseSchema);
  }

  async getFeeInfo(name: string, contractId?: string) {
    return this.callView("get_fee_info", [name], contractId, schemas.GetFeeInfoResponseSchema);
  }

  async calculateFee(name: string, contractId?: string) {
    return this.callView("calculate_fee", [name], contractId, schemas.CalculateFeeResponseSchema);
  }

  async getFeeMultiplier(length: number, contractId?: string) {
    return this.callView("get_fee_multiplier", [length], contractId, schemas.GetFeeMultiplierResponseSchema);
  }

  async getManagerNames(manager_address: string, contractId?: string) {
    return this.callView("get_manager_names", [manager_address], contractId, schemas.GetManagerNamesResponseSchema);
  }

  async getManagerPrimaryName(manager_address: string, contractId?: string) {
    return this.callView("get_manager_primary_name", [manager_address], contractId, schemas.GetManagerPrimaryNameResponseSchema);
  }

  async getFeeStructure(contractId?: string) {
    return this.callView("get_fee_structure", [], contractId, schemas.GetFeeStructureResponseSchema);
  }

  async getMaxProfileDataEntries(contractId?: string) {
    return this.callView("get_max_profile_data_entries", [], contractId, schemas.GetMaxProfileDataEntriesResponseSchema);
  }

  async getMaxProfileKeyLength(contractId?: string) {
    return this.callView("get_max_profile_key_length", [], contractId, schemas.GetMaxProfileKeyLengthResponseSchema);
  }

  async getMaxProfileValueLength(contractId?: string) {
    return this.callView("get_max_profile_value_length", [], contractId, schemas.GetMaxProfileValueLengthResponseSchema);
  }

  async getMaxTokenSymbolLength(contractId?: string) {
    return this.callView("get_max_token_symbol_length", [], contractId, schemas.GetMaxTokenSymbolLengthResponseSchema);
  }

  async getMaxTotalProfileSize(contractId?: string) {
    return this.callView("get_max_total_profile_size", [], contractId, schemas.GetMaxTotalProfileSizeResponseSchema);
  }

  async getGracePeriodDays(contractId?: string) {
    return this.callView("get_grace_period_days", [], contractId, schemas.GetGracePeriodDaysResponseSchema);
  }

  async callMultiple(calls: { method: string; params?: any[] }[], contractId?: string): Promise<any[]> {
    const id = contractId ?? this.contractId;
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
