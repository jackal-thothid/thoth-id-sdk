# thoth.id Sdk

[![npm version](https://img.shields.io/npm/v/thoth-id-sdk.svg)](https://www.npmjs.com/package/thoth-id-sdk)

The thoth.id Sdk provides a convenient way to interact with the thoth.id decentralized naming service on the Hathor Network. It allows you to manage human-readable names (e.g., `username.htr`) and their associated wallet addresses, simplifying decentralized identity and transactions.

## Features

*   Resolve thoth.id names to wallet addresses.
*   Check name availability and status.
*   Calculate registration and renewal fees.
*   Get name ownership and profile data.
*   Discover the nano contract behind each domain straight from the Hathor node — no registry API to configure.

## Installation

```bash
npm install thoth-id-sdk
```

or

```bash
yarn add thoth-id-sdk
```

## Usage

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

const sdk = new ThothIdSDK();

// The domain -> contract map is collected from the node on first use,
// then reused for every later call
const walletAddr = await sdk.resolveName("example.htr");
```

Every thoth.id domain is a nano contract created from the ThothNamer blueprint, and each one registers its domain in its `initialize` call. That is all the Sdk needs to build the `domain suffix -> contract ID` map itself, so there is no registry endpoint to configure and nothing to keep in sync with the chain.

Collect once, use many — persist the map to skip discovery on later runs:

```typescript
const CACHE_KEY = "thoth-contract-ids";

async function getSdk() {
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    // Zero discovery requests
    return new ThothIdSDK({ contractIds: JSON.parse(cached) });
  }

  const sdk = new ThothIdSDK();
  await sdk.loadContractIds();
  localStorage.setItem(CACHE_KEY, JSON.stringify(sdk.exportContractIds()));
  return sdk;
}
```

> **Upgrading from v2?** The `contractApiUrl` option and `setContractApiUrl()` are gone, and
> `loadContractIds()` is no longer required — it now returns the map it collected and happens
> automatically on first use. See the migration guide in the documentation.

## Development

```bash
npm install
npm run build
npm test            # runs against the public Hathor testnet
npm run test:verbose
```

The test suite talks to the live testnet and needs no local environment: it discovers the real ThothNamer registries from the node and asserts against them. `tests/test-config.json` holds the expected testnet state — the registries listed there must be discovered and must point at exactly those contracts, while registries added to testnet later are tolerated.

Public nodes rate-limit to roughly one request per second, so a full run takes about a minute.

## Documentation

For comprehensive guides, API reference, and detailed examples, please visit our official documentation:
[thoth.id Sdk Documentation](https://docs.thoth.id) and see [thoth.id](https://testnet.thoth.id)

## License

This Sdk is released under the [MIT License](LICENSE).
