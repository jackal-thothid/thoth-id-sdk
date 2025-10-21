# getFeeInfo()

Gets information about the fees for a name.

## Parameters

- `name` (string): The full name to get the fee info for (e.g., `example.htr`).

## Returns

- `Promise<object>`: A promise that resolves to an object containing the fee information.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function getFeeInfo() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const feeInfo = await sdk.getFeeInfo("example.htr");
    console.log("Fee info for example.htr:", feeInfo);

  } catch (error) {
    console.error("Error getting fee info:", error);
  }
}

getFeeInfo();
```
