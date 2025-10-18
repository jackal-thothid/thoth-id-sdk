# Thoth ID SDK

[![npm version](https://img.shields.io/npm/v/thoth-id-sdk.svg)](https://www.npmjs.com/package/thoth-id-sdk)

SDK to consult @view methods of ThothNamer nanocontract.

Thoth ID is a decentralized naming service built on the Hathor Network. It allows you to map human-readable names (e.g., `username.hathor`) to wallet addresses, effectively creating a digital identity on the blockchain.

This SDK simplifies interaction with the Thoth ID smart contracts, allowing developers to easily integrate Thoth ID functionalities into their applications.

## Installation

```bash
npm install thoth-id-sdk
```

or

```bash
yarn add thoth-id-sdk
```

## Getting Started

First, import and instantiate the SDK. You can connect to the Hathor mainnet or a testnet by specifying the `nodeUrl`.

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

// Connect to mainnet by using the default nodeUrl
const sdk = new ThothIdSDK();

// Or connect to a testnet/local node
const testnetSDK = new ThothIdSDK({
  nodeUrl: "https://node1.testnet.hathor.network/",
  contractId: "CONTRACT-ID-HERE" // Replace with your testnet contract ID
});
```

## Usage Example

Here's how you can resolve a Thoth ID name to get its associated data:

```typescript
async function resolveName(name: string) {
  try {
    const nameData = await sdk.resolveName(name);
    console.log(`Data for ${name}:`, nameData);
    return nameData;
  } catch (error) {
    console.error("Error resolving name:", error);
  }
}

resolveName("example.hathor");
```

## API Reference

All methods return a `Promise` that resolves with the data from the smart contract.

### Name Information

- `isNameAvailable(name: string, contractId?: string)`: Checks if a name is available to be registered.
- `resolveName(name: string, contractId?: string)`: Resolves a name to its associated data.
- `getNameData(name: string, contractId?: string)`: Retrieves the raw data associated with a name.
- `getNameOwner(name: string, contractId?: string)`: Gets the owner's address for a given name.
- `getNameExpirationInfo(name: string, contractId?: string)`: Gets expiration information for a name.
- `getNameExpirationDate(name: string, contractId?: string)`: Gets the exact expiration date of a name.
- `validateName(name: string, contractId?: string)`: Validates the format of a name.
- `checkNameOwnership(name: string, address: string, contractId?: string)`: Checks if a given address owns a name.
- `checkNameStatus(name: string, contractId?: string)`: Checks the current status of a name (e.g., active, expired).

### Fee Information

- `getFeeInfo(name: string, contractId?: string)`: Gets information about the fees for a name.
- `calculateFee(name: string, contractId?: string)`: Calculates the registration or renewal fee for a name.
- `getFeeMultiplier(length: number, contractId?: string)`: Gets the fee multiplier for a name of a certain length.
- `getFeeStructure(contractId?: string)`: Retrieves the entire fee structure of the contract.

### Manager Information

- `getManagerNames(manager_address: string, contractId?: string)`: Gets all names managed by a specific address.
- `getManagerPrimaryName(manager_address: string, contractId?: string)`: Gets the primary name set for a manager address.

### Contract Configuration

- `getDevAddress(contractId?: string)`: Gets the developer address of the contract.
- `getContractDomain(contractId?: string)`: Gets the domain of the contract (e.g., `.hathor`).
- `getGracePeriodDays(contractId?: string)`: Gets the grace period for name renewals.
- `getMaxProfileDataEntries(contractId?: string)`: Gets the maximum number of data entries in a profile.
- `getMaxProfileKeyLength(contractId?: string)`: Gets the maximum length of a profile data key.
- `getMaxProfileValueLength(contractId?: string)`: Gets the maximum length of a profile data value.
- `getMaxTokenSymbolLength(contractId?: string)`: Gets the maximum length of a token symbol.
- `getMaxTotalProfileSize(contractId?: string)`: Gets the maximum total size of a profile.
- `validateKeyFormat(key: string, value: string, contractId?: string)`: Validates the format of a key-value pair for profile data.

### Multiple Calls

- `callMultiple(calls: { method: string; params?: any[] }[], contractId?: string)`: Allows making multiple view calls in a single request for efficiency.

## About Hathor Network

Hathor is a scalable and easy-to-use blockchain for digital assets. It is a novel architecture, designed by PhDs, that combines a DAG of transactions with a blockchain of blocks. This design reportedly solves the scalability and decentralization maintenance issues of many blockchain-based platforms. For more information, visit [hathor.network](https://hathor.network/).

## License

This SDK is released under the [MIT License](LICENSE).