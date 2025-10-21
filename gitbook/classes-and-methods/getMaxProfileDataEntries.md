# getMaxProfileDataEntries()

Gets the maximum number of data entries in a profile for a given domain.

## Parameters

- `domainSuffix` (string): The domain suffix (e.g., `htr`).

## Returns

- `Promise<number>`: A promise that resolves to the maximum number of data entries.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function getMaxProfileDataEntries() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const maxEntries = await sdk.getMaxProfileDataEntries("htr");
    console.log("Maximum profile data entries for .htr domain:", maxEntries);

  } catch (error) {
    console.error("Error getting max profile data entries:", error);
  }
}

getMaxProfileDataEntries();
```
