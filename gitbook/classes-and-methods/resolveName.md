# resolveName()

Resolves a name to its associated wallet address.

## Parameters

- `name` (string): The full name to resolve (e.g., `example.htr`).

## Returns

- `Promise<string>`: A promise that resolves to the wallet address associated with the name.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function resolveName() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const ownerAddress = await sdk.resolveName("example.htr");
    console.log(`The address for example.htr is:`, ownerAddress);

  } catch (error) {
    console.error("Error resolving name:", error);
  }
}

resolveName();
```
