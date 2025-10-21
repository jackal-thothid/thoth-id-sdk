# SDK Reference 📖

This section provides a detailed overview of the classes and methods available in the Thoth ID SDK.

## Classes

### ThothIdSDK

The main class for interacting with the Thoth ID nano contracts.

## Methods

| Method | Description |
| --- | --- |
| [`constructor`](sdk-reference/constructor.md) | Creates a new instance of the SDK. |
| [`loadContractIds`](sdk-reference/loadContractIds.md) | Fetches the map of available domain suffixes and their corresponding contract IDs. |
| [`setNodeUrl`](sdk-reference/setNodeUrl.md) | Sets the Hathor full-node URL. |
| [`setContractId`](sdk-reference/setContractId.md) | Sets a specific contract ID to be used for all calls. |
| [`isNameAvailable`](sdk-reference/isNameAvailable.md) | Checks if a name is available to be registered. |
| [`resolveName`](sdk-reference/resolveName.md) | Resolves a name to its associated wallet address. |
| [`getNameData`](sdk-reference/getNameData.md) | Retrieves the raw data associated with a name. |
| [`getNameOwner`](sdk-reference/getNameOwner.md) | Gets the owner's address for a given name. |
| [`getNameExpirationInfo`](sdk-reference/getNameExpirationInfo.md) | Gets expiration information for a name. |
| [`getNameExpirationDate`](sdk-reference/getNameExpirationDate.md) | Gets the exact expiration date of a name. |
| [`validateName`](sdk-reference/validateName.md) | Validates the format of a name. |
| [`checkNameOwnership`](sdk-reference/checkNameOwnership.md) | Checks if a given address owns a name. |
| [`checkNameStatus`](sdk-reference/checkNameStatus.md) | Checks the current status of a name (e.g., active, expired). |
| [`getFeeInfo`](sdk-reference/getFeeInfo.md) | Gets information about the fees for a name. |
| [`calculateFee`](sdk-reference/calculateFee.md) | Calculates the registration or renewal fee for a name. |
| [`getFeeMultiplier`](sdk-reference/getFeeMultiplier.md) | Gets the fee multiplier for a name of a certain length for a given domain. |
| [`getFeeStructure`](sdk-reference/getFeeStructure.md) | Retrieves the entire fee structure of a specific contract. |
| [`getManagerNames`](sdk-reference/getManagerNames.md) | Gets all names managed by a specific address on a given domain. |
| [`getManagerPrimaryName`](sdk-reference/getManagerPrimaryName.md) | Gets the primary name set for a manager address on a given domain. |
| [`getDevAddress`](sdk-reference/getDevAddress.md) | Gets the developer address of the contract for a given domain. |
| [`getContractDomain`](sdk-reference/getContractDomain.md) | Gets the domain of the contract (e.g., `.htr`). |
| [`getGracePeriodDays`](sdk-reference/getGracePeriodDays.md) | Gets the grace period for name renewals for a given domain. |
| [`getMaxProfileDataEntries`](sdk-reference/getMaxProfileDataEntries.md) | Gets the maximum number of data entries in a profile for a given domain. |
| [`getMaxProfileKeyLength`](sdk-reference/getMaxProfileKeyLength.md) | Gets the maximum length of a profile data key for a given domain. |
| [`getMaxProfileValueLength`](sdk-reference/getMaxProfileValueLength.md) | Gets the maximum length of a profile data value for a given domain. |
| [`getMaxTokenSymbolLength`](sdk-reference/getMaxTokenSymbolLength.md) | Gets the maximum length of a token symbol for a given domain. |
| [`getMaxTotalProfileSize`](sdk-reference/getMaxTotalProfileSize.md) | Gets the maximum total size of a profile for a given domain. |
| [`validateKeyFormat`](sdk-reference/validateKeyFormat.md) | Validates the format of a key-value pair for profile data for a given domain. |
| [`callMultiple`](sdk-reference/callMultiple.md) | Allows making multiple view calls to a specific contract in a single request. ||
