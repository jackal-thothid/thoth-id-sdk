import { ThothIdSDK } from "./sdk";

export type ThothSDKOptions = {
  nodeUrl?: string;
  contractId?: string | null;
  contractApiUrl?: string;
  timeoutMs?: number;
};

export { ThothIdSDK };
export default ThothIdSDK;