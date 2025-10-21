# getNameExpirationInfo()

Gets expiration information for a name.

## Parameters

- `name` (string): The full name to get the expiration info for (e.g., `example.htr`).

## Returns

- `Promise<object>`: A promise that resolves to an object containing the name's expiration information.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function getNameExpirationInfo() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const expirationInfo = await sdk.getNameExpirationInfo("example.htr");
    console.log("Expiration info for example.htr:", expirationInfo);

  } catch (error) {
    console.error("Error getting expiration info:", error);
  }
}

getNameExpirationInfo();
```
