# getMaxProfileValueLength()

Gets the maximum length of a profile data value for a given domain.

## Parameters

- `domainSuffix` (string): The domain suffix (e.g., `htr`).

## Returns

- `Promise<number>`: A promise that resolves to the maximum length of a profile data value.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function getMaxProfileValueLength() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const maxLength = await sdk.getMaxProfileValueLength("htr");
    console.log("Maximum profile value length for .htr domain:", maxLength);

  } catch (error) {
    console.error("Error getting max profile value length:", error);
  }
}

getMaxProfileValueLength();
```
