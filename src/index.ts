import fetch from "cross-fetch";
import { encode } from "bs58";

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

  // --- helper: serialize single arg to contract format ---
  private serializeArg(arg: any): string {
    if (typeof arg === "string") {
      // wrap in quotes, escape internal quotes/backslashes
      return JSON.stringify(arg);
    }
    if (typeof arg === "number" || typeof arg === "boolean") {
      return String(arg);
    }
    if (Array.isArray(arg)) {
      const inner = arg.map(a => this.serializeArg(a)).join(",");
      return `[${inner}]`;
    }
    // fallback: stringify
    return JSON.stringify(arg);
  }

  // builds: methodName(param1,param2)
  private buildCallString(methodName: string, params?: any[]): string {
    if (!params || params.length === 0) return `${methodName}()`;
    const s = params.map(p => this.serializeArg(p)).join(",");
    return `${methodName}(${s})`;
  }

  // generic call to node /v1a/nano_contract/state?id=...&calls[]=...
  async callView(methodName: string, params?: any[], contractId?: string): Promise<any> {
    const id = contractId ?? this.contractId;
    if (!id) throw new Error("contractId is required (either pass in constructor or to callView).");

    const callStr = this.buildCallString(methodName, params);
    const baseUrl = this.nodeUrl.endsWith('/') ? this.nodeUrl : `${this.nodeUrl}/`;
    const urlBase = `${baseUrl}v1a/nano_contract/state`;
    // Build URL with repeated calls[] params (we'll send only one here, but code supports multiple)
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
      const result = json.calls[callStr];

      if (result && result.errmsg) {
        throw new Error(`Smart contract error: ${result.errmsg}`);
      }

      if (result && result.hasOwnProperty('value')) {
        return result.value;
      }

      // Fallback for methods that don't return a value property
      return result;
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error(`Request timed out after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  // --- Wrappers para todos os @view methods listados ---
  async is_name_available(name: string, contractId?: string) {
    const now_timestamp = Math.floor(Date.now() / 1000);
    return this.callView("is_name_available", [name, now_timestamp], contractId);
  }

  async resolve_name(name: string, contractId?: string) {
    const now_timestamp = Math.floor(Date.now() / 1000);
    const hexAddress = await this.callView("resolve_name", [name, now_timestamp], contractId);
    if (typeof hexAddress === 'string' && /^[0-9a-fA-F]+$/.test(hexAddress)) {
        const buffer = Buffer.from(hexAddress, 'hex');
        return encode(buffer);
    }
    return hexAddress;
  }

  async get_name_data(name: string, contractId?: string) {
    return this.callView("get_name_data", [name], contractId);
  }

  async get_name_owner(name: string, contractId?: string) {
    const hexAddress = await this.callView("get_name_owner", [name], contractId);
    if (typeof hexAddress === 'string' && /^[0-9a-fA-F]+$/.test(hexAddress)) {
        const buffer = Buffer.from(hexAddress, 'hex');
        return encode(buffer);
    }
    return hexAddress;
  }

  async get_name_expiration_info(name: string, contractId?: string) {
    const now_timestamp = Math.floor(Date.now() / 1000);
    return this.callView("get_name_expiration_info", [name, now_timestamp], contractId);
  }

  async get_name_expiration_date(name: string, contractId?: string) {
    return this.callView("get_name_expiration_date", [name], contractId);
  }

  async validate_name(name: string, contractId?: string) {
    return this.callView("validate_name", [name], contractId);
  }

  async validate_key_format(key: string, value: string, contractId?: string) {
    return this.callView("validate_key_format", [key, value], contractId);
  }

  async get_dev_address(contractId?: string) {
    return this.callView("get_dev_address", [], contractId);
  }

  async get_contract_domain(contractId?: string) {
    return this.callView("get_contract_domain", [], contractId);
  }

  async check_name_ownership(name: string, address: string, contractId?: string) {
    const now_timestamp = Math.floor(Date.now() / 1000);
    return this.callView("check_name_ownership", [name, address, now_timestamp], contractId);
  }

  async check_name_status(name: string, contractId?: string) {
    const now_timestamp = Math.floor(Date.now() / 1000);
    return this.callView("check_name_status", [name, now_timestamp], contractId);
  }

  async get_fee_info(name: string, contractId?: string) {
    return this.callView("get_fee_info", [name], contractId);
  }

  async calculate_fee(name: string, contractId?: string) {
    return this.callView("calculate_fee", [name], contractId);
  }

  async get_fee_multiplier(length: number, contractId?: string) {
    return this.callView("get_fee_multiplier", [length], contractId);
  }

  async get_manager_names(manager_address: string, contractId?: string) {
    return this.callView("get_manager_names", [manager_address], contractId);
  }

  async get_manager_primary_name(manager_address: string, contractId?: string) {
    return this.callView("get_manager_primary_name", [manager_address], contractId);
  }

  async get_fee_structure(contractId?: string) {
    return this.callView("get_fee_structure", [], contractId);
  }

  async get_max_profile_data_entries(contractId?: string) {
    return this.callView("get_max_profile_data_entries", [], contractId);
  }

  async get_max_profile_key_length(contractId?: string) {
    return this.callView("get_max_profile_key_length", [], contractId);
  }

  async get_max_profile_value_length(contractId?: string) {
    return this.callView("get_max_profile_value_length", [], contractId);
  }

  async get_max_token_symbol_length(contractId?: string) {
    return this.callView("get_max_token_symbol_length", [], contractId);
  }

  async get_max_total_profile_size(contractId?: string) {
    return this.callView("get_max_total_profile_size", [], contractId);
  }

  async get_grace_period_days(contractId?: string) {
    return this.callView("get_grace_period_days", [], contractId);
  }


  // --- utility: send multiple view calls in single request ---
  async callMultiple(calls: { method: string; params?: any[] }[], contractId?: string): Promise<any> {
    const id = contractId ?? this.contractId;
    if (!id) throw new Error("contractId is required (either pass in constructor or to callMultiple).");

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

    const results = callStrings.map(cs => {
        const result = json.calls[cs];
        if (result && result.errmsg) {
            throw new Error(`Smart contract error in method ${cs}: ${result.errmsg}`);
        }
        return result ? result.value : undefined;
    });

    return results;
  }
}

export default ThothIdSDK;
