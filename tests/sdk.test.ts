import { ThothIdSDK, ThothSDKOptions } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

// Load test configuration
const configPath = path.resolve(__dirname, 'test-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const sdkOptions: ThothSDKOptions = config.sdkOptions;
const testData = config.testData;

describe('ThothIdSDK', () => {
  let sdk: ThothIdSDK;

  beforeAll(() => {
    sdk = new ThothIdSDK(sdkOptions);
  });

  // Test for is_name_available
  it('should check if a name is available', async () => {
    const isAvailable = await sdk.is_name_available(testData.availableName);
    expect(isAvailable).toBe(true);

    const isNotAvailable = await sdk.is_name_available(testData.existingName);
    expect(isNotAvailable).toBe(false);
  }, 30000);

  // Test for resolve_name
  it('should resolve a name', async () => {
    // This test will fail until you provide the correct ownerAddress in test-config.json
    const ownerAddress = await sdk.resolve_name(testData.existingName);
    expect(ownerAddress).toBe(testData.ownerAddress);
  }, 30000);

  // Test for get_name_data
  it('should get data for a name', async () => {
    const nameData = await sdk.get_name_data(testData.existingName);
    expect(nameData).toBeDefined();
  }, 30000);

  // Test for get_name_owner
  it('should get the owner of a name', async () => {
    // This test will fail until you provide the correct ownerAddress in test-config.json
    const owner = await sdk.get_name_owner(testData.existingName);
    expect(owner).toBe(testData.ownerAddress);
  }, 30000);

  // Test for get_name_expiration_info
  it('should get expiration info for a name', async () => {
    const expirationInfo = await sdk.get_name_expiration_info(testData.existingName);
    expect(expirationInfo).toBeDefined();
  }, 30000);

  // Test for get_name_expiration_date
  it('should get the expiration date of a name', async () => {
    const expirationDate = await sdk.get_name_expiration_date(testData.existingName);
    expect(expirationDate).toBeDefined();
  }, 30000);

  // Test for validate_name
  it('should validate a name', async () => {
    const isValid = await sdk.validate_name(testData.nameForValidation);
    expect(isValid).toBe(true);

    const isInvalid = await sdk.validate_name(testData.invalidNameForValidation);
    expect(isInvalid).toBe(false);
  }, 30000);

  // Test for validate_key_format
  it('should validate a key format', async () => {
    const isValid = await sdk.validate_key_format('profile_website', 'https://example.com');
    expect(isValid).toBe(true);
  }, 30000);

  // Test for get_dev_address
  it('should get the developer address', async () => {
    const devAddress = await sdk.get_dev_address();
    expect(devAddress).toBeDefined();
  }, 30000);

  // Test for get_contract_domain
  it('should get the contract domain', async () => {
    const domain = await sdk.get_contract_domain();
    expect(domain).toBeDefined();
  }, 30000);

  // Test for check_name_ownership
  it('should check name ownership', async () => {
    // This test will fail until you provide the correct ownerAddress in test-config.json
    const isOwner = await sdk.check_name_ownership(testData.existingName, testData.ownerAddress);
    expect(isOwner).toBe(true);
  }, 30000);

  // Test for check_name_status
  it('should check the status of a name', async () => {
    const status = await sdk.check_name_status(testData.existingName);
    expect(status).toBeDefined();
  }, 30000);

  // Test for get_fee_info
  it('should get fee info for a name', async () => {
    const feeInfo = await sdk.get_fee_info(testData.nameForFeeCalculation);
    expect(feeInfo).toBeDefined();
  }, 30000);

  // Test for calculate_fee
  it('should calculate the fee for a name', async () => {
    const fee = await sdk.calculate_fee(testData.nameForFeeCalculation);
    expect(fee).toBeDefined();
  }, 30000);

  // Test for get_fee_multiplier
  it('should get the fee multiplier for a name length', async () => {
    const multiplier = await sdk.get_fee_multiplier(5);
    expect(multiplier).toBeDefined();
  }, 30000);

  // Test for get_manager_names
  it('should get names for a manager', async () => {
    // This test will fail until you provide a managerAddress in test-config.json
    const names = await sdk.get_manager_names(testData.managerAddress);
    expect(names).toBeDefined();
    expect(Array.isArray(names)).toBe(true);
  }, 30000);

  // Test for get_manager_primary_name
  it('should get the primary name for a manager', async () => {
    // This test will fail until you provide a managerAddress in test-config.json
    const primaryName = await sdk.get_manager_primary_name(testData.managerAddress);
    expect(primaryName).toBeDefined();
  }, 30000);

  // Test for get_fee_structure
  it('should get the fee structure', async () => {
    const feeStructure = await sdk.get_fee_structure();
    expect(feeStructure).toBeDefined();
  }, 30000);

  // Test for get_max_profile_data_entries
  it('should get max profile data entries', async () => {
    const maxEntries = await sdk.get_max_profile_data_entries();
    expect(typeof maxEntries).toBe('number');
  }, 30000);

  // Test for get_max_profile_key_length
  it('should get max profile key length', async () => {
    const maxLength = await sdk.get_max_profile_key_length();
    expect(typeof maxLength).toBe('number');
  }, 30000);

  // Test for get_max_profile_value_length
  it('should get max profile value length', async () => {
    const maxLength = await sdk.get_max_profile_value_length();
    expect(typeof maxLength).toBe('number');
  }, 30000);

  // Test for get_max_token_symbol_length
  it('should get max token symbol length', async () => {
    const maxLength = await sdk.get_max_token_symbol_length();
    expect(typeof maxLength).toBe('number');
  }, 30000);

  // Test for get_max_total_profile_size
  it('should get max total profile size', async () => {
    const maxSize = await sdk.get_max_total_profile_size();
    expect(typeof maxSize).toBe('number');
  }, 30000);

  // Test for get_grace_period_days
  it('should get grace period days', async () => {
    const gracePeriod = await sdk.get_grace_period_days();
    expect(typeof gracePeriod).toBe('number');
  }, 30000);


  // Test for callMultiple
  it('should make multiple calls in one request', async () => {
    const results = await sdk.callMultiple([
      { method: 'get_contract_domain' }
    ]);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(1);
    expect(typeof results[0]).toBe('string');
  }, 30000);
});
