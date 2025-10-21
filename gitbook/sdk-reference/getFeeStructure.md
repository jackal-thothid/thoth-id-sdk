# getFeeStructure()

Retrieves the entire fee structure of a specific contract.

## Parameters

- `domainSuffix` (string): The domain suffix (e.g., `htr`).

## Returns

- `Promise<object>`: A promise that resolves to an object containing the fee structure.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function getFeeStructure() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const feeStructure = await sdk.getFeeStructure("htr");
    console.log("Fee structure for .htr domain:", feeStructure);

  } catch (error) {
    console.error("Error getting fee structure:", error);
  }
}

getFeeStructure();
```
