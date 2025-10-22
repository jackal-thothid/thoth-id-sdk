# setContractId() 🧪

Sets a specific contract ID to be used for all subsequent calls, overriding any other contract resolution logic.

## Description

This method is primarily intended for **testing and development**.

It allows you to force the Sdk to use a specific nano contract, such as one you've deployed locally or on a testnet. When a contract ID is set via this method, the Sdk will ignore the `contractApiUrl` and the domain suffix-based resolution provided by `loadContractIds()`.

## Parameters

- `id` (string): The contract ID to use for all calls.

## Returns

- `void`

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

// Instantiate the Sdk
const sdk = new ThothIdSDK();

// For testing, force the Sdk to use a specific contract ID
sdk.setContractId("YOUR_TEST_CONTRACT_ID");

// Now, all calls will be directed to "YOUR_TEST_CONTRACT_ID"
// For example, this will try to resolve "example.htr" on your test contract
const owner = await sdk.resolveName("example.htr");
```