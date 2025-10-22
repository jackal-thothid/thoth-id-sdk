# Check Name Status

This example shows how to check the current status of a name (e.g., active, expired).

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