# callMultiple()

Allows making multiple view calls to a specific contract in a single request.

## Parameters

- `calls` (Array<{ method: string; params?: any[] }>): An array of objects, where each object represents a call to be made. Each object should have a `method` property with the name of the method to call, and an optional `params` property with an array of parameters for that method.
- `domainSuffix` (string): The domain suffix (e.g., `htr`).

## Returns

- `Promise<any[]>`: A promise that resolves to an array of results from the calls.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function callMultiple() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const results = await sdk.callMultiple([
      { method: 'get_contract_domain' },
      { method: 'get_fee_structure' },
    ], "htr");
    console.log("Results from multiple calls:", results);

  } catch (error) {
    console.error("Error making multiple calls:", error);
  }
}

callMultiple();
```
