# loadContractIds()

Fetches the map of available domain suffixes and their corresponding contract IDs.

## Parameters

- `url` (string, optional): The URL to fetch the contract ID map from. If not provided, the `contractApiUrl` from the constructor will be used.

## Returns

- `Promise<void>`: A promise that resolves when the contract ID map has been loaded.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function initializeSDK() {
  const sdk = new ThothIdSDK();
  await sdk.loadContractIds();
  return sdk;
}
```
