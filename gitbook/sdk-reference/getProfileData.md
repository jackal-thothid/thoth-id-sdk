# getProfileData()

Retrieves the profile data associated with a name.

## Parameters

- `name` (string): The full name to get the profile data for (e.g., `example.htr`).

## Returns

- `Promise<object>`: A promise that resolves to an object containing the name's profile data.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function getProfileData() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const profileData = await sdk.getProfileData("example.htr");
    console.log("Profile data for example.htr:", profileData);

  } catch (error) {
    console.error("Error getting profile data:", error);
  }
}

getProfileData();
```
