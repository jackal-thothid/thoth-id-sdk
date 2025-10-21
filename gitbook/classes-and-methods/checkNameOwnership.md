# checkNameOwnership()

Checks if a given address owns a name.

## Parameters

- `name` (string): The full name to check (e.g., `example.htr`).
- `address` (string): The wallet address to check.

## Returns

- `Promise<boolean>`: A promise that resolves to `true` if the address owns the name, and `false` otherwise.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function checkNameOwnership() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const isOwner = await sdk.checkNameOwnership("example.htr", "WALLET_ADDRESS");
    if (isOwner) {
      console.log("The address owns the name.");
    } else {
      console.log("The address does not own the name.");
    }

  } catch (error) {
    console.error("Error checking name ownership:", error);
  }
}

checkNameOwnership();
```
