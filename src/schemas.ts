import { z } from 'zod';

// Base schema for the raw API response structure.
// A call that fails comes back as `{ "errmsg": "..." }` with no `value` key at
// all, so `value` has to be optional — otherwise parsing dies before the
// `errmsg` can be read and every contract error turns into a schema error.
export const CallResultSchema = z.object({
  errmsg: z.string().optional(),
  value: z.any().optional(),
}).loose();

export const ApiResponseSchema = z.object({
  calls: z.record(z.string(), CallResultSchema),
}).loose();

// --- Schemas for the node endpoints used to discover contract IDs ---

// `GET /v1a/nano_contract/creation?search=<blueprintId>`
export const NanoContractCreationTxSchema = z.object({
  nano_contract_id: z.string(),
  blueprint_id: z.string().optional(),
  blueprint_name: z.string().optional(),
  created_at: z.number().optional(),
  last_tx_timestamp: z.number().optional(),
  total_txs: z.number().optional(),
}).loose();

export const NanoContractCreationResponseSchema = z.object({
  success: z.boolean().optional(),
  nc_creation_txs: z.array(NanoContractCreationTxSchema),
  has_more: z.boolean().optional(),
}).loose();

// `GET /v1a/nano_contract/history?id=<ncId>&order=asc&count=1`
export const NanoContractHistoryTxSchema = z.object({
  nc_method: z.string().optional(),
  nc_args_decoded: z.array(z.any()).optional(),
  is_voided: z.boolean().optional(),
}).loose();

export const NanoContractHistoryResponseSchema = z.object({
  success: z.boolean().optional(),
  history: z.array(NanoContractHistoryTxSchema),
}).loose();

// The node reports handled failures as `{ success: false, error: "..." }`.
export const NodeErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
}).loose();

// --- Schemas for the 'value' of each specific SDK method ---

export const IsNameAvailableResponseSchema = z.boolean();

export const ResolveNameResponseSchema = z.string();

export const GetNameDataResponseSchema = z.object({
  token_uid: z.string(),
  owner_address: z.string(),
  is_deposited: z.string(),
  manager_address: z.string(),
  resolving_address: z.string(),
  expiration_date: z.string(),
}).strict();

export const GetProfileDataResponseSchema = z.record(z.string(), z.string());

export const GetNameOwnerResponseSchema = z.string();

export const GetNameExpirationInfoResponseSchema = z.object({
  expiration_date: z.string(),
  grace_period_end: z.string(),
  status: z.string(),
});

export const GetNameExpirationDateResponseSchema = z.number();

export const ValidateNameResponseSchema = z.boolean();

export const ValidateKeyFormatResponseSchema = z.boolean();

export const GetDevAddressResponseSchema = z.string();

export const GetContractDomainResponseSchema = z.string();

export const CheckNameOwnershipResponseSchema = z.boolean();

export const CheckNameStatusResponseSchema = z.string();

export const GetFeeInfoResponseSchema = z.object({
  base_fee: z.number(),
  multiplier: z.number(),
  total_fee: z.number(),
});

export const CalculateFeeResponseSchema = z.number();

export const GetFeeMultiplierResponseSchema = z.number();

export const GetManagerNamesResponseSchema = z.array(z.string());

export const GetManagerPrimaryNameResponseSchema = z.string();

export const GetFeeStructureResponseSchema = z.object({
  base_fee: z.number(),
  three_length_multiplier: z.number(),
  four_length_multiplier: z.number(),
  five_plus_length_multiplier: z.number(),
  default_multiplier: z.number(),
});

export const GetMaxProfileDataEntriesResponseSchema = z.number();

export const GetMaxProfileKeyLengthResponseSchema = z.number();

export const GetMaxProfileValueLengthResponseSchema = z.number();

export const GetMaxTokenSymbolLengthResponseSchema = z.number();

export const GetMaxTotalProfileSizeResponseSchema = z.number();

export const GetGracePeriodDaysResponseSchema = z.number();
