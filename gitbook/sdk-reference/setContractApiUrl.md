# setContractApiUrl()

Method to update the `contractApiUrl` of the SDK. This is useful if you want to switch between different contract API endpoints.

## Signature

```typescript
setContractApiUrl(url: string): void
```

## Parameters

### url
The new URL for the contract API.

- Type: `string`
- Required: `true`

## Returns
`void`

## Example

```typescript
import { ThothIdSDK } from "thoth-id-sdk";

const sdk = new ThothIdSDK();
sdk.setContractApiUrl("https://my-custom-api.com/contract-ids");
```
