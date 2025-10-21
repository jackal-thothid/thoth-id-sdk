# validateKeyFormat()

Validates the format of a key-value pair for profile data for a given domain.

## Parameters

- `key` (string): The key to validate.
- `value` (string): The value to validate.
- `domainSuffix` (string): The domain suffix (e.g., `htr`).

## Returns

- `Promise<boolean>`: A promise that resolves to `true` if the key-value pair format is valid, and `false` otherwise.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function validateKeyFormat() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const isValid = await sdk.validateKeyFormat("profile_website", "https://example.com", "htr");
    console.log("Is key-value pair valid?", isValid);

  } catch (error) {
    console.error("Error validating key format:", error);
  }
}

validateKeyFormat();
```
