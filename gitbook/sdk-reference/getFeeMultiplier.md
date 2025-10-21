# getFeeMultiplier()

Gets the fee multiplier for a name of a certain length for a given domain.

## Parameters

- `length` (number): The length of the name.
- `domainSuffix` (string): The domain suffix (e.g., `htr`).

## Returns

- `Promise<number>`: A promise that resolves to the fee multiplier.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function getFeeMultiplier() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const multiplier = await sdk.getFeeMultiplier(5, "htr");
    console.log("Fee multiplier for a 5-character name in .htr domain:", multiplier);

  } catch (error) {
    console.error("Error getting fee multiplier:", error);
  }
}

getFeeMultiplier();
```
