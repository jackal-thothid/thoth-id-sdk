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
};

export { ThothIdSDK, DEFAULT_BLUEPRINT_ID, DEFAULT_NODE_URL };
export default ThothIdSDK;
