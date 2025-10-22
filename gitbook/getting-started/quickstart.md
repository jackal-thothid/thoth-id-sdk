# Getting Started 🚀

## (Very fast) quickstart

This is an example of simple usage of thoth.id Sdk:

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

// ... code ...
 
const sdk = new ThothIdSDK();

await sdk.loadContractIds();

const walletAddr = sdk.resolveName("example.htr");

// --- more code
```

For more information read other sections.

## Overview

First, import and instantiate the Sdk. The Sdk is configured by default to connect to the main Hathor network and the main thoth.id contract API.

After creating an instance of the Sdk, you must call `loadContractIds()` to fetch the map of available domain suffixes and their corresponding contract IDs. It must be done because the Sdk does not store information about Hathor Network Contract Ids.

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function initializeSDK() {
  // Connect to mainnet with default settings
  const sdk = new ThothIdSDK();

  // Load the contract ID map
  await sdk.loadContractIds();

  return sdk;
}

// --- Or connect to a testnet/local environment ---

async function initializeTestnetSDK() {
  const sdk = new ThothIdSDK({
    nodeUrl: "https://node1.testnet.hathor.network/",
    contractApiUrl: "http://localhost:3232/contract-ids", // Your custom contract API
  });

  await sdk.loadContractIds();

  return sdk;
}
```

It is possible to change `nodeUrl` and `contractApiUrl`, but we recommend using the default values. Custom URLs are intended primarily for testing purposes.

### Using a specific `contractId` (for testing) 🧪

For testing or development purposes, you can instantiate the Sdk with a specific `contractId`. This will bypass the contract resolution from the `contractApiUrl` and force the Sdk to use the provided `contractId` for all calls.

```typescript
async function initializeTestSDKWithContractId() {
  const sdk = new ThothIdSDK({
    nodeUrl: "http://localhost:8080/",
    contractId: "YOUR_CONTRACT_ID", // Replace with your contract ID
  });

  // No need to call loadContractIds() when using a specific contractId

  return sdk;
}
```

The next section will show examples of usage.
