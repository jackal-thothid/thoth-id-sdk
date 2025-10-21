# getMaxTokenSymbolLength()

Gets the maximum length of a token symbol for a given domain.

## Parameters

- `domainSuffix` (string): The domain suffix (e.g., `htr`).

## Returns

- `Promise<number>`: A promise that resolves to the maximum length of a token symbol.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function getMaxTokenSymbolLength() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const maxLength = await sdk.getMaxTokenSymbolLength("htr");
    console.log("Maximum token symbol length for .htr domain:", maxLength);

  } catch (error) {
    console.error("Error getting max token symbol length:", error);
  }
}

getMaxTokenSymbolLength();
```
