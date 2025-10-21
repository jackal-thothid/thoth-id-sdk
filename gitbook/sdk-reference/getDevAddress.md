# getDevAddress()

Gets the developer address of the contract for a given domain.

## Parameters

- `domainSuffix` (string): The domain suffix (e.g., `htr`).

## Returns

- `Promise<string>`: A promise that resolves to the developer address.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function getDevAddress() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const devAddress = await sdk.getDevAddress("htr");
    console.log("Developer address for .htr domain:", devAddress);

  } catch (error) {
    console.error("Error getting developer address:", error);
  }
}

getDevAddress();
```
