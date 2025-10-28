# Resolve a Name

This example shows how to resolve a thoth.id name to its associated wallet address.

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function resolveName() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const walletAddress = await sdk.resolveName("example.htr");
    console.log(`The address for example.htr is:`, walletAddress);

  } catch (error) {
    console.error("Error resolving name:", error);
  }
}

resolveName();
```
Or in a simple way:

```typescript

import { ThothIdSDK } from "thoth-id-sdk";

async function main() {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const walletAddr = await sdk.resolveName("example.htr");
}

main();
```
