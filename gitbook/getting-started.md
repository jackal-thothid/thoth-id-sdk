# Getting Started 🚀

> 🚧 **Disclaimer: Project Status** 🚧
>
> The thoth.id project is currently under development.
> * The nano contract has **not yet been launched** to any public Hathor network.
> * The official API endpoint `domains.thoth.id` is **not yet active**.
>
> This Sdk is provided for testing and integration purposes. You can use it with a local development environment or a testnet contract.

First, import and instantiate the Sdk. The Sdk is configured by default to connect to the main Hathor network and the main thoth.id contract API.

After creating an instance of the Sdk, you must call `loadContractIds()` to fetch the map of available domain suffixes and their corresponding contract IDs.

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

## Examples 📖

Here are some examples of how to use the thoth.id Sdk.

### Resolve a Name

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

### Check Name Availability

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

### Check Name Status

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