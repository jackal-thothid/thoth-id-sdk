# loadContractIds() 📥

Fetches the map of available domain suffixes (e.g., `.htr`, `.test`) and their corresponding nano contract IDs.

## Description

To remain flexible and support multiple domains, the Sdk does **not** come with a hard-coded list of contract IDs. Instead, it must fetch this information from a trusted external source.

By default, it will query the official thoth.id API endpoint at `https://domains.thoth.id/contract-ids`. This endpoint provides a JSON object mapping each domain suffix to its active nano contract ID.

You must call this method after instantiating the Sdk to ensure it knows which contracts to interact with for each domain.

## Parameters

- `url` (string, optional): An optional URL to fetch the contract ID map from. If you provide a URL here, it will be used instead of the default `contractApiUrl` that was configured in the Sdk's constructor. This is useful for testing or using a custom contract registry.

## Returns

- `Promise<void>`: A promise that resolves when the contract ID map has been successfully loaded into the Sdk instance.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function initializeSDK() {
  // Create a new Sdk instance
  const sdk = new ThothIdSDK();

  // Load the contract ID map from the default endpoint
  await sdk.loadContractIds();

  console.log("Contract IDs loaded!");

  return sdk;
}

initializeSDK();
```