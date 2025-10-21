# checkNameStatus()

Checks the current status of a name (e.g., active, expired).

## Parameters

- `name` (string): The full name to check (e.g., `example.htr`).

## Returns

- `Promise<string>`: A promise that resolves to the current status of the name.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function checkStatus() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const status = await sdk.checkNameStatus("example.htr");
    console.log(`The status of 'example.htr' is:`, status);

  } catch (error) {
    console.error("Error checking name status:", error);
  }
}

checkStatus();
```
