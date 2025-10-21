# getContractDomain()

Gets the domain of the contract (e.g., `.htr`).

## Parameters

- `domainSuffix` (string): The domain suffix (e.g., `htr`).

## Returns

- `Promise<string>`: A promise that resolves to the contract domain.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function getContractDomain() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const domain = await sdk.getContractDomain("htr");
    console.log("Contract domain for .htr:", domain);

  } catch (error) {
    console.error("Error getting contract domain:", error);
  }
}

getContractDomain();
```
