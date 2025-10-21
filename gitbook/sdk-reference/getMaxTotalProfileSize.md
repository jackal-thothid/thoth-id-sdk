# getMaxTotalProfileSize()

Gets the maximum total size of a profile for a given domain.

## Parameters

- `domainSuffix` (string): The domain suffix (e.g., `htr`).

## Returns

- `Promise<number>`: A promise that resolves to the maximum total size of a profile.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function getMaxTotalProfileSize() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const maxSize = await sdk.getMaxTotalProfileSize("htr");
    console.log("Maximum total profile size for .htr domain:", maxSize);

  } catch (error) {
    console.error("Error getting max total profile size:", error);
  }
}

getMaxTotalProfileSize();
```
