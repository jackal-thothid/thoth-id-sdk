# getManagerNames()

Gets all names managed by a specific address on a given domain.

## Parameters

- `managerAddress` (string): The manager's wallet address.
- `domainSuffix` (string): The domain suffix (e.g., `htr`).

## Returns

- `Promise<string[]>`: A promise that resolves to an array of names managed by the address.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function getManagerNames() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const names = await sdk.getManagerNames("WALLET_ADDRESS", "htr");
    console.log("Names managed by the address:", names);

  } catch (error) {
    console.error("Error getting manager names:", error);
  }
}

getManagerNames();
```
