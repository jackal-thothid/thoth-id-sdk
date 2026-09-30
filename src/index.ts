import { ThothIdSDK, DEFAULT_BLUEPRINT_ID, DEFAULT_NODE_URL } from "./sdk";

/** Map of domain suffix (lower-case, e.g. `htr`) to nano contract ID. */
export type ContractIdMap = Record<string, string>;

export type ThothSDKOptions = {
  nodeUrl?: string;
  contractId?: string | null;
  /**
   * Blueprint ID of the ThothNamer nano contract. Every contract created from
   * this blueprint is a domain registry, which is how the Sdk discovers the
   * domain suffix -> contract ID map straight from the node.
   */
  blueprintId?: string;
  /**
   * Pre-collected `domain suffix -> contract ID` map. Seeding it (e.g. from
   * `localStorage`) makes the instance skip discovery entirely.
   */
  contractIds?: ContractIdMap;
  timeoutMs?: number;
  /**
   * Headers sent with every request to the node, e.g. an API key for a
   * private node. Entries whose value is `undefined` are dropped, so an unset
   * environment variable simply sends nothing.
   */
  headers?: Record<string, string | undefined>;
  /**
   * How many times a request is retried after a rate limit (`429`), a
   * transient gateway error (`502`/`503`/`504`), a timeout or a dropped
   * connection. Applies to discovery and view calls alike. Defaults to 3.
   */
  retries?: number;
};

/** Outcome of one call in `callMultipleSettled`, like `Promise.allSettled`. */
export type CallResult =
  | { ok: true; value: any }
  | { ok: false; error: string };

export { ThothIdSDK, DEFAULT_BLUEPRINT_ID, DEFAULT_NODE_URL };
export default ThothIdSDK;
