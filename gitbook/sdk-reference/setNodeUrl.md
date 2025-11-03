# setNodeUrl()

Sets the Hathor full-node URL.

## Parameters

- `url` (string): The new Hathor full-node URL.

## Returns

- `void`

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

const sdk = new ThothIdSDK();
sdk.setNodeUrl("https://node1.mainnet.hathor.network/v1a/nano_contract/state");
```
