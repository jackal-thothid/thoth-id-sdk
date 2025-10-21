# calculateFee()

Calculates the registration or renewal fee for a name.

## Parameters

- `name` (string): The full name to calculate the fee for (e.g., `example.htr`).

## Returns

- `Promise<number>`: A promise that resolves to the registration or renewal fee.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function calculateFee() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const fee = await sdk.calculateFee("example.htr");
    console.log("Fee for example.htr:", fee);

  } catch (error) {
    console.error("Error calculating fee:", error);
  }
}

calculateFee();
```
