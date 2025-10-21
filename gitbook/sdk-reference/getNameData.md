# getNameData()

Retrieves the raw data associated with a name.

## Parameters

- `name` (string): The full name to get the data for (e.g., `example.htr`).

## Returns

- `Promise<object>`: A promise that resolves to an object containing the name's data.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function getNameData() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const nameData = await sdk.getNameData("example.htr");
    console.log("Name data for example.htr:", nameData);

  } catch (error) {
    console.error("Error getting name data:", error);
  }
}

getNameData();
```
