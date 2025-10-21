# getNameOwner()

Gets the owner's address for a given name.

## Parameters

- `name` (string): The full name to get the owner of (e.g., `example.htr`).

## Returns

- `Promise<string>`: A promise that resolves to the owner's wallet address.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function getNameOwner() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const owner = await sdk.getNameOwner("example.htr");
    console.log("The owner of example.htr is:", owner);

  } catch (error) {
    console.error("Error getting name owner:", error);
  }
}

getNameOwner();
```
