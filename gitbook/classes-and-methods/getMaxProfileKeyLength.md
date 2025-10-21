# getMaxProfileKeyLength()

Gets the maximum length of a profile data key for a given domain.

## Parameters

- `domainSuffix` (string): The domain suffix (e.g., `htr`).

## Returns

- `Promise<number>`: A promise that resolves to the maximum length of a profile data key.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function getMaxProfileKeyLength() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const maxLength = await sdk.getMaxProfileKeyLength("htr");
    console.log("Maximum profile key length for .htr domain:", maxLength);

  } catch (error) {
    console.error("Error getting max profile key length:", error);
  }
}

getMaxProfileKeyLength();
```
