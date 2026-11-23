# thoth.id Sdk

[![npm version](https://img.shields.io/npm/v/thoth-id-sdk.svg)](https://www.npmjs.com/package/thoth-id-sdk)

The thoth.id Sdk provides a convenient way to interact with the thoth.id decentralized naming service on the Hathor Network. It allows you to manage human-readable names (e.g., `username.htr`) and their associated wallet addresses, simplifying decentralized identity and transactions.

## Features

*   Resolve thoth.id names to wallet addresses.
*   Check name availability and status.
*   Calculate registration and renewal fees.
*   Get name ownership and profile data.
*   Discover the nano contract behind each domain straight from the Hathor node — no registry API to configure.
*   Works on mainnet (the default) and testnet.

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

// Mainnet is the default; pass { network: "testnet" } for testnet
const sdk = new ThothIdSDK();

// The domain -> contract map is collected from the node on first use,
// then reused for every later call
const walletAddr = await sdk.resolveName("example.htr");
```

Every thoth.id domain is a nano contract created from a ThothNamer blueprint, and each one registers its domain in its `initialize` call. That is all the Sdk needs to build the `domain suffix -> contract ID` map itself, so there is no registry endpoint to configure and nothing to keep in sync with the chain.

Collect once, use many — persist the map to skip discovery on later runs. A map belongs to one network, so key the cache by network:

```typescript
import { ThothIdSDK, Network } from "thoth-id-sdk";

async function getSdk(network: Network = "mainnet") {
  const cacheKey = `thoth-contract-ids:${network}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    // Zero discovery requests
    return new ThothIdSDK({ network, contractIds: JSON.parse(cached) });
  }

  const sdk = new ThothIdSDK({ network });
  await sdk.loadContractIds();
  localStorage.setItem(cacheKey, JSON.stringify(sdk.exportContractIds()));
  return sdk;
}

const mainnet = await getSdk("mainnet");
```

> A cached map skips discovery, and with it the blocked-domain check below. Refresh it now and then with `sdk.refreshContractIds()` so a registry upgraded to an untrusted blueprint is caught.

### Networks

The Sdk talks to **mainnet** unless told otherwise: the public mainnet node and every mainnet ThothNamer blueprint. Pass `network: "testnet"` for testnet.

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

const sdk = new ThothIdSDK(); // mainnet

await sdk.resolveName("jackal.htr");      // "H93A2s655jatS1zfdMF5pwf6E4s5FHnUmh"
await sdk.checkNameStatus("jackal.htr");  // "active"
await sdk.isNameAvailable("jackal.htr");  // false

// Registration fee, in the token's smallest unit (100000 = 1,000.00 HTR)
await sdk.calculateFee("abcde.htr");      // 100000
await sdk.calculateFee("abc.htr");        // 2000000 — short names cost more

// Reverse lookup: the primary name of an address on .htr
await sdk.getManagerPrimaryName("H93A2s655jatS1zfdMF5pwf6E4s5FHnUmh", "htr"); // "vulture"
```

Batch lookups work the same way. With `callMultipleSettled` an invalid address fails only its own entry:

```typescript
const results = await sdk.callMultipleSettled(
  ["H93A2s655jatS1zfdMF5pwf6E4s5FHnUmh", "notanaddress"].map((address) => ({
    method: "get_manager_primary_name",
    params: [address],
  })),
  "htr"
);
// [
//   { ok: true, value: "vulture" },
//   { ok: false, error: "InvalidAddress('Address size must have 25 bytes')" }
// ]
```

Mainnet addresses start with `H`, testnet ones with `W`, and each network has its own registries — a name registered on testnet does not exist on mainnet. An app that serves both can keep one instance per network, or switch an existing one:

```typescript
const sdk = new ThothIdSDK();  // mainnet
sdk.setNetwork("testnet");      // drops the mainnet map; testnet's is collected on next use
```

| Network | Node | ThothNamer blueprints |
| --- | --- | --- |
| `mainnet` (default) | `node1.mainnet.hathor.network` | v1.0 `000000420ca7…3e92`, v1.1 `000000203247…3183` |
| `testnet` | `node1.testnet.hathor.network` | `000000009108…0dd3` |

A contract stays listed under the blueprint it was *created* from even after it is upgraded, so discovery searches every version's blueprint and, when two registries claim the same domain, the oldest one wins. `nodeUrl`, `blueprintIds` and `blueprintId` still override what the network brings, and `setNetwork("testnet")` switches an existing instance (dropping its cached map). The presets are exported as `NETWORKS`, `DEFAULT_NETWORK`, `MAINNET_NODE_URL`, `MAINNET_BLUEPRINT_IDS`, `TESTNET_NODE_URL` and `TESTNET_BLUEPRINT_IDS`.

> **Upgrading from v3.2?** The default network changed from testnet to mainnet. Code that relied on the default to reach testnet must now pass `network: "testnet"`. A saved testnet map passed through `contractIds` without `network: "testnet"` would be used against the mainnet node, so add the option there too. `DEFAULT_NODE_URL` and `DEFAULT_BLUEPRINT_ID` keep their testnet values for compatibility and are deprecated — use `TESTNET_NODE_URL` / `TESTNET_BLUEPRINT_IDS`, or `NETWORKS[DEFAULT_NETWORK]` for the default.

### Trusted blueprints and blocked domains

Whoever creates a registry can later upgrade it to any code, so being *created* from a ThothNamer blueprint is not enough. During discovery the Sdk also reads the blueprint the first registry of each domain runs **now**:

- if it is one of `blueprintIds` (any ThothNamer release), the domain resolves to that registry as usual;
- if it is not, the domain is **blocked**: names under it throw instead of resolving, and the domain is *not* handed to the next contract claiming it — the first registry still owns it.

```typescript
sdk.getBlockedDomains();
// { xyz: { contractId: "0000…", blueprintId: "<blueprint it runs now>" } }
```

This costs one extra request per domain. It also sets the order for shipping a new ThothNamer release: publish the blueprint, release an Sdk that lists it, and only then upgrade the registries — an older Sdk sees a registry upgraded to a blueprint it does not know as blocked. Until then an app can trust the new release itself with `blueprintIds: [...MAINNET_BLUEPRINT_IDS, "<new blueprint>"]`.

### Private nodes

Pass `headers` to authenticate against a node that needs it — they are sent with every request, discovery included. A header whose value is `undefined` is left out:

```typescript
const sdk = new ThothIdSDK({
  network: "testnet",
  nodeUrl: "https://node.testnet.dozer.finance/v1a/nano_contract/state",
  headers: { "X-API-Key": process.env.NODE_API_KEY },
});
```

`nodeUrl` only changes the node, not the network: a private testnet node needs `network: "testnet"` too, or the Sdk looks for the mainnet blueprints on it.

In a browser, custom headers trigger a CORS preflight, so the node must allow them.

### Retries

Every request — discovery and view calls alike — is retried on `429`, `502`, `503`, `504`, timeouts and dropped connections, with exponential backoff (1s, 2s, 4s, …). Set how many times with `retries` (default `3`, `0` to disable):

```typescript
const sdk = new ThothIdSDK({ retries: 5 });
```

### Batching calls

`callMultiple` sends several view calls in one request and throws if any of them fails. `callMultipleSettled` sends the same request but returns each call's own outcome, so one invalid address doesn't sink the rest:

```typescript
const results = await sdk.callMultipleSettled(
  addresses.map((address) => ({ method: "get_manager_primary_name", params: [address] })),
  "htr"
);

for (const result of results) {
  if (result.ok) console.log(result.value);
  else console.warn(result.error); // e.g. "InvalidAddress('Invalid checksum of address')"
}
```

> **Upgrading from v2?** The `contractApiUrl` option and `setContractApiUrl()` are gone, and
> `loadContractIds()` is no longer required — it now returns the map it collected and happens
> automatically on first use. See the migration guide in the documentation.

## Development

```bash
npm install
npm run build
npm test              # a local suite, then the public testnet and mainnet
npm run test:testnet  # live suite on one network only
npm run test:mainnet
npm run test:verbose
```

The live suite talks to the public nodes and needs no local environment: it discovers the real ThothNamer registries from each node and asserts against them. `tests/config/<network>.json` holds the expected state of each network — the registries listed there must be discovered and must point at exactly those contracts, while registries added later are tolerated. Add a file there to cover another network, and set `THOTH_NETWORK` (comma-separated) to run a subset.

Public nodes rate-limit to roughly one request per second, so a full run takes a couple of minutes.

## Documentation

For comprehensive guides, API reference, and detailed examples, please visit our official documentation:
[thoth.id Sdk Documentation](https://docs.thoth.id) and see [thoth.id](https://testnet.thoth.id)

## License

This Sdk is released under the [MIT License](LICENSE).
