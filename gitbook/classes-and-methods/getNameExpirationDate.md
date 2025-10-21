# getNameExpirationDate()

Gets the exact expiration date of a name.

## Parameters

- `name` (string): The full name to get the expiration date for (e.g., `example.htr`).

## Returns

- `Promise<number>`: A promise that resolves to the expiration date of the name as a Unix timestamp.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function getNameExpirationDate() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const expirationDate = await sdk.getNameExpirationDate("example.htr");
    console.log("Expiration date for example.htr:", new Date(expirationDate * 1000));

  } catch (error) {
    console.error("Error getting expiration date:", error);
  }
}

getNameExpirationDate();
```
