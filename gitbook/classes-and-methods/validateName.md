# validateName()

Validates the format of a name.

## Parameters

- `name` (string): The full name to validate (e.g., `example.htr`).

## Returns

- `Promise<boolean>`: A promise that resolves to `true` if the name format is valid, and `false` otherwise.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function validateName() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const isValid = await sdk.validateName("validname.htr");
    console.log("Is 'validname.htr' valid?", isValid);

    const isInvalid = await sdk.validateName("Invalid-Name.htr");
    console.log("Is 'Invalid-Name.htr' valid?", isInvalid);

  } catch (error) {
    console.error("Error validating name:", error);
  }
}

validateName();
```
