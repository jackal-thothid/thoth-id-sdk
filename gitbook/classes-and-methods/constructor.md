# constructor()

Creates a new instance of the SDK.

## Parameters

- `opts` (ThothSDKOptions): An optional object with the following properties:
  - `nodeUrl` (string): URL of the Hathor full-node. Defaults to mainnet.
  - `contractApiUrl` (string): URL of the API that provides the contract ID map. Defaults to the main Thoth ID API.
  - `useSsl` (boolean): Whether to use SSL for the default `contractApiUrl`. Defaults to `true`.
  - `contractId` (string): For testing purposes, overrides all other contract resolution. Defaults to `null`.

## Returns

- `ThothIdSDK`: A new instance of the Thoth ID SDK.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

// Connect to mainnet with default settings
const sdk = new ThothIdSDK();

// Or connect to a testnet/local environment
const testnetSdk = new ThothIdSDK({
  nodeUrl: "https://node1.testnet.hathor.network/",
  contractApiUrl: "http://localhost:3232/contract-ids", // Your custom contract API
});
```
