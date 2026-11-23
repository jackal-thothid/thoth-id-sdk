import {
  ThothIdSDK,
  DEFAULT_BLUEPRINT_ID,
  DEFAULT_NETWORK,
  DEFAULT_NODE_URL,
  MAINNET_BLUEPRINT_IDS,
  MAINNET_NODE_URL,
  NETWORKS,
  TESTNET_BLUEPRINT_IDS,
  TESTNET_NODE_URL,
} from "./sdk";

/** Hathor network the Sdk talks to. */
export type Network = "testnet" | "mainnet";

/** Defaults a network brings: where its node is and which blueprints are registries. */
export type NetworkConfig = {
  nodeUrl: string;
  blueprintIds: string[];
};

/** Map of domain suffix (lower-case, e.g. `htr`) to nano contract ID. */
export type ContractIdMap = Record<string, string>;

export type ThothSDKOptions = {
  /**
   * Network whose node and ThothNamer blueprints are used by default.
   * Defaults to `"mainnet"`. `nodeUrl`, `blueprintIds` and `blueprintId`
   * still override what the network brings.
   */
  network?: Network;
  nodeUrl?: string;
  contractId?: string | null;
  /**
   * Blueprint IDs of the ThothNamer nano contract, one per released version.
   * Every contract created from any of them is a domain registry, which is how
   * the Sdk discovers the domain suffix -> contract ID map straight from the
   * node. A contract is listed under the blueprint it was *created* from, even
   * after it is upgraded, so every version has to be searched.
   */
  blueprintIds?: string[];
  /** Single-blueprint shorthand for `blueprintIds`, kept for v3.0 callers. */
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

/**
 * A domain whose first registry now runs a blueprint outside the trusted list,
 * e.g. after an upgrade to code that is not a ThothNamer release. It resolves
 * to nothing rather than falling through to the next contract claiming it.
 */
export type BlockedDomain = {
  /** The domain's first registry. */
  contractId: string;
  /** Blueprint that registry runs now. */
  blueprintId: string;
};

/** Outcome of one call in `callMultipleSettled`, like `Promise.allSettled`. */
export type CallResult =
  | { ok: true; value: any }
  | { ok: false; error: string };

export {
  ThothIdSDK,
  DEFAULT_BLUEPRINT_ID,
  DEFAULT_NETWORK,
  DEFAULT_NODE_URL,
  MAINNET_BLUEPRINT_IDS,
  MAINNET_NODE_URL,
  NETWORKS,
  TESTNET_BLUEPRINT_IDS,
  TESTNET_NODE_URL,
};
export default ThothIdSDK;
