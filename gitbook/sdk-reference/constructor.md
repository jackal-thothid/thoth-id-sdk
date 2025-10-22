# constructor() ⚙️

Creates a new instance of the SDK.

## Parameters

- `opts` (ThothSDKOptions): An optional object to configure the Sdk instance.

### ThothSDKOptions Schema

The `opts` parameter is an object of type `ThothSDKOptions` with the following properties:

| Property | Type | Description | Default |
| --- | --- | --- | --- |
| `nodeUrl` | `string` | URL of the Hathor full-node to connect to. | `"https://node1.mainnet.hathor.network/"` |
| `contractApiUrl` | `string` | URL of the API that provides the contract ID map. | `"https://domains.thoth.id/contract-ids"` |
| `useSsl` | `boolean` | Whether to use SSL for the default `contractApiUrl`. This is ignored if `contractApiUrl` is provided. | `true` |
| `contractId` | `string \| null` | A specific contract ID to use for all calls. This is mainly for testing purposes, allowing developers to use a local or test contract by overriding the contract ID resolution that would normally come from the `contractApiUrl`. | `null` |
| `timeoutMs` | `number` | The timeout in milliseconds for network requests to the Hathor node. | `15000` |

## Returns

- `ThothIdSDK`: A new instance of the thoth.id Sdk.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

// Connect to mainnet with default settings
const sdk = new ThothIdSDK();

// Or connect to a testnet/local environment with custom options
const testnetSdk = new ThothIdSDK({
  nodeUrl: "https://node1.testnet.hathor.network/",
  contractApiUrl: "http://localhost:3232/contract-ids", // Your custom contract API
  timeoutMs: 10000,
});
```