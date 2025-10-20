# Thoth ID SDK

[![npm version](https://img.shields.io/npm/v/thoth-id-sdk.svg)](https://www.npmjs.com/package/thoth-id-sdk)

SDK to consult @view methods of ThothNamer nano contract.

Thoth ID is a decentralized naming service built on the Hathor Network. It allows you to map human-readable names (e.g., `username.hathor`) to wallet addresses, effectively creating a digital identity on the blockchain.

This SDK simplifies interaction with the Thoth ID nano contracts, allowing developers to easily integrate Thoth ID functionalities into their applications.

## Installation

```bash
npm install thoth-id-sdk
```

or

```bash
yarn add thoth-id-sdk
```

## Getting Started

First, import and instantiate the SDK. The SDK is configured by default to connect to the main Hathor network and the main Thoth ID contract API.

After creating an instance of the SDK, you must call `loadContractIds()` to fetch the map of available domain suffixes and their corresponding contract IDs.

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

## Usage Example

Here's how you can resolve a Thoth ID name to get its associated wallet address:

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

async function main() {
  try {
    const sdk = new ThothIdSDK();
    await sdk.loadContractIds();

    const ownerAddress = await sdk.resolveName("example.htr");
    console.log(`The address for example.htr is:`, ownerAddress);

  } catch (error) {
    console.error("Error resolving name:", error);
  }
}

main();
```

## API Reference

All methods return a `Promise` that resolves with the data from the nano contract.

### SDK Setup

- `new ThothIdSDK(options?: ThothSDKOptions)`: Creates a new SDK instance.
  - `options.nodeUrl`: URL of the Hathor full-node. Defaults to mainnet.
  - `options.contractApiUrl`: URL of the API that provides the contract ID map. Defaults to the main Thoth ID API.
  - `options.useSsl`: Whether to use SSL for the default `contractApiUrl`. Defaults to `true`.
  - `options.contractId`: For testing purposes, overrides all other contract resolution. Defaults to `null`.
- `loadContractIds(url?: string)`: Fetches the contract ID map from the provided URL or the `contractApiUrl` from the constructor. **This must be called before using the SDK.**

### Name Information

- `isNameAvailable(name: string)`: Checks if a name (e.g., `newname.htr`) is available to be registered.
- `resolveName(name: string)`: Resolves a name to its associated wallet address.
- `getNameData(name: string)`: Retrieves the raw data associated with a name.
- `getNameOwner(name: string)`: Gets the owner's address for a given name.
- `getNameExpirationInfo(name: string)`: Gets expiration information for a name.
- `getNameExpirationDate(name: string)`: Gets the exact expiration date of a name.
- `validateName(name: string)`: Validates the format of a name.
- `checkNameOwnership(name: string, address: string)`: Checks if a given address owns a name.
- `checkNameStatus(name: string)`: Checks the current status of a name (e.g., active, expired).

### Fee Information

- `getFeeInfo(name: string)`: Gets information about the fees for a name.
- `calculateFee(name: string)`: Calculates the registration or renewal fee for a name.
- `getFeeMultiplier(length: number, domainSuffix: string)`: Gets the fee multiplier for a name of a certain length for a given domain.
- `getFeeStructure(domainSuffix: string)`: Retrieves the entire fee structure of a specific contract.

### Manager Information

- `getManagerNames(manager_address: string, domainSuffix: string)`: Gets all names managed by a specific address on a given domain.
- `getManagerPrimaryName(manager_address: string, domainSuffix: string)`: Gets the primary name set for a manager address on a given domain.

### Contract Configuration

- `getDevAddress(domainSuffix: string)`: Gets the developer address of the contract for a given domain.
- `getContractDomain(domainSuffix: string)`: Gets the domain of the contract (e.g., `.htr`).
- `getGracePeriodDays(domainSuffix: string)`: Gets the grace period for name renewals for a given domain.
- `getMaxProfileDataEntries(domainSuffix: string)`: Gets the maximum number of data entries in a profile for a given domain.
- `getMaxProfileKeyLength(domainSuffix: string)`: Gets the maximum length of a profile data key for a given domain.
- `getMaxProfileValueLength(domainSuffix: string)`: Gets the maximum length of a profile data value for a given domain.
- `getMaxTokenSymbolLength(domainSuffix: string)`: Gets the maximum length of a token symbol for a given domain.
- `getMaxTotalProfileSize(domainSuffix: string)`: Gets the maximum total size of a profile for a given domain.
- `validateKeyFormat(key: string, value: string, domainSuffix: string)`: Validates the format of a key-value pair for profile data for a given domain.

### Multiple Calls

- `callMultiple(calls: { method: string; params?: any[] }[], domainSuffix: string)`: Allows making multiple view calls to a specific contract in a single request.

## About Hathor Network

Hathor is a scalable and easy-to-use blockchain for digital assets. It is a novel architecture, designed by PhDs, that combines a DAG of transactions with a blockchain of blocks. This design reportedly solves the scalability and decentralization maintenance issues of many blockchain-based platforms. For more information, visit [hathor.network](https://hathor.network/).

## License

This SDK is released under the [MIT License](LICENSE).