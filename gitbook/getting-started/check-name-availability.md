# Check Name Availability

This example shows how to check if a name is available to be registered.

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function checkAvailability() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const isAvailable = await sdk.isNameAvailable("newname.htr");
    if (isAvailable) {
      console.log("The name 'newname.htr' is available! ✅");
    } else {
      console.log("The name 'newname.htr' is already taken. ❌");
    }

  } catch (error) {
    console.error("Error checking name availability:", error);
  }
}

checkAvailability();
```