# Classes and Methods

This section provides a detailed overview of the classes and methods available in the Thoth ID SDK.

## Classes

### ThothIdSDK

The main class for interacting with the Thoth ID nano contracts.

## Methods

| Method | Description |
| --- | --- |
| [`constructor`](classes-and-methods/constructor.md) | Creates a new instance of the SDK. |
| [`loadContractIds`](classes-and-methods/loadContractIds.md) | Fetches the map of available domain suffixes and their corresponding contract IDs. |
| [`setNodeUrl`](classes-and-methods/setNodeUrl.md) | Sets the Hathor full-node URL. |
| [`setContractId`](classes-and-methods/setContractId.md) | Sets a specific contract ID to be used for all calls. |
| [`isNameAvailable`](classes-and-methods/isNameAvailable.md) | Checks if a name is available to be registered. |
| [`resolveName`](classes-and-methods/resolveName.md) | Resolves a name to its associated wallet address. |
| [`getNameData`](classes-and-methods/getNameData.md) | Retrieves the raw data associated with a name. |
| [`getNameOwner`](classes-and-methods/getNameOwner.md) | Gets the owner's address for a given name. |
| [`getNameExpirationInfo`](classes-and-methods/getNameExpirationInfo.md) | Gets expiration information for a name. |
| [`getNameExpirationDate`](classes-and-methods/getNameExpirationDate.md) | Gets the exact expiration date of a name. |
| [`validateName`](classes-and-methods/validateName.md) | Validates the format of a name. |
| [`checkNameOwnership`](classes-and-methods/checkNameOwnership.md) | Checks if a given address owns a name. |
| [`checkNameStatus`](classes-and-methods/checkNameStatus.md) | Checks the current status of a name (e.g., active, expired). |
| [`getFeeInfo`](classes-and-methods/getFeeInfo.md) | Gets information about the fees for a name. |
| [`calculateFee`](classes-and-methods/calculateFee.md) | Calculates the registration or renewal fee for a name. |
| [`getFeeMultiplier`](classes-and-methods/getFeeMultiplier.md) | Gets the fee multiplier for a name of a certain length for a given domain. |
| [`getFeeStructure`](classes-and-methods/getFeeStructure.md) | Retrieves the entire fee structure of a specific contract. |
| [`getManagerNames`](classes-and-methods/getManagerNames.md) | Gets all names managed by a specific address on a given domain. |
| [`getManagerPrimaryName`](classes-and-methods/getManagerPrimaryName.md) | Gets the primary name set for a manager address on a given domain. |
| [`getDevAddress`](classes-and-methods/getDevAddress.md) | Gets the developer address of the contract for a given domain. |
| [`getContractDomain`](classes-and-methods/getContractDomain.md) | Gets the domain of the contract (e.g., `.htr`). |
| [`getGracePeriodDays`](classes-and-methods/getGracePeriodDays.md) | Gets the grace period for name renewals for a given domain. |
| [`getMaxProfileDataEntries`](classes-and-methods/getMaxProfileDataEntries.md) | Gets the maximum number of data entries in a profile for a given domain. |
| [`getMaxProfileKeyLength`](classes-and-methods/getMaxProfileKeyLength.md) | Gets the maximum length of a profile data key for a given domain. |
| [`getMaxProfileValueLength`](classes-and-methods/getMaxProfileValueLength.md) | Gets the maximum length of a profile data value for a given domain. |
| [`getMaxTokenSymbolLength`](classes-and-methods/getMaxTokenSymbolLength.md) | Gets the maximum length of a token symbol for a given domain. |
| [`getMaxTotalProfileSize`](classes-and-methods/getMaxTotalProfileSize.md) | Gets the maximum total size of a profile for a given domain. |
| [`validateKeyFormat`](classes-and-methods/validateKeyFormat.md) | Validates the format of a key-value pair for profile data for a given domain. |
| [`callMultiple`](classes-and-methods/callMultiple.md) | Allows making multiple view calls to a specific contract in a single request. |
