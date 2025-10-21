# getGracePeriodDays()

Gets the grace period for name renewals for a given domain.

## Parameters

- `domainSuffix` (string): The domain suffix (e.g., `htr`).

## Returns

- `Promise<number>`: A promise that resolves to the grace period in days.

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function getGracePeriodDays() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const gracePeriod = await sdk.getGracePeriodDays("htr");
    console.log("Grace period for .htr domain:", gracePeriod);

  } catch (error) {
    console.error("Error getting grace period:", error);
  }
}

getGracePeriodDays();
```
