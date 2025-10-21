# getManagerPrimaryName()

Gets the primary name set for a manager address on a given domain.

## Parameters

- `manager_address` (string): The manager's wallet address.
- `domainSuffix` (string): The domain suffix (e.g., `htr`).

## Returns

- `Promise<string>`: A promise that resolves to the primary name set for the manager address.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function getManagerPrimaryName() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const primaryName = await sdk.getManagerPrimaryName("WALLET_ADDRESS", "htr");
    console.log("Primary name for the address:", primaryName);

  } catch (error) {
    console.error("Error getting manager primary name:", error);
  }
}

getManagerPrimaryName();
```
