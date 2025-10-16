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
    console.log('\n--- Test: is_name_available ---');
    const isAvailable = await sdk.is_name_available(testData.availableName);
    console.log('  - Checking available name:');
    console.log('    - Expected:', true);
    console.log('    - Received:', isAvailable);
    expect(isAvailable).toBe(true);

    const isNotAvailable = await sdk.is_name_available(testData.existingName);
    console.log('  - Checking existing name:');
    console.log('    - Expected:', false);
    console.log('    - Received:', isNotAvailable);
    expect(isNotAvailable).toBe(false);
    console.log('---------------------------------\n');
  }, 30000);

  // Test for resolve_name
  it('should resolve a name', async () => {
    console.log('\n--- Test: resolve_name ---');
    const ownerAddress = await sdk.resolve_name(testData.existingName);
    console.log('  - Expected:', testData.ownerAddress);
    console.log('  - Received:', ownerAddress);
    expect(ownerAddress).toBe(testData.ownerAddress);
    console.log('--------------------------\n');
  }, 30000);

  // Test for get_name_data
  it('should get data for a name', async () => {
    console.log('\n--- Test: get_name_data ---');
    const nameData = await sdk.get_name_data(testData.existingName);
    console.log('  - Received:', nameData);
    expect(nameData).toBeDefined();
    console.log('---------------------------\n');
  }, 30000);

  // Test for get_name_owner
  it('should get the owner of a name', async () => {
    console.log('\n--- Test: get_name_owner ---');
    const owner = await sdk.get_name_owner(testData.existingName);
    console.log('  - Expected:', testData.ownerAddress);
    console.log('  - Received:', owner);
    expect(owner).toBe(testData.ownerAddress);
    console.log('----------------------------\n');
  }, 30000);

  // Test for get_name_expiration_info
  it('should get expiration info for a name', async () => {
    console.log('\n--- Test: get_name_expiration_info ---');
    const expirationInfo = await sdk.get_name_expiration_info(testData.existingName);
    console.log('  - Received:', expirationInfo);
    expect(expirationInfo).toBeDefined();
    console.log('--------------------------------------\n');
  }, 30000);

  // Test for get_name_expiration_date
  it('should get the expiration date of a name', async () => {
    console.log('\n--- Test: get_name_expiration_date ---');
    const expirationDate = await sdk.get_name_expiration_date(testData.existingName);
    console.log('  - Received:', expirationDate);
    expect(expirationDate).toBeDefined();
    console.log('--------------------------------------\n');
  }, 30000);

  // Test for validate_name
  it('should validate a name', async () => {
    console.log('\n--- Test: validate_name ---');
    const isValid = await sdk.validate_name(testData.nameForValidation);
    console.log('  - Checking valid name:');
    console.log('    - Expected:', true);
    console.log('    - Received:', isValid);
    expect(isValid).toBe(true);

    const isInvalid = await sdk.validate_name(testData.invalidNameForValidation);
    console.log('  - Checking invalid name:');
    console.log('    - Expected:', false);
    console.log('    - Received:', isInvalid);
    expect(isInvalid).toBe(false);
    console.log('---------------------------\n');
  }, 30000);

  // Test for validate_key_format
  it('should validate a key format', async () => {
    console.log('\n--- Test: validate_key_format ---');
    const isValid = await sdk.validate_key_format('profile_website', 'https://example.com');
    console.log('  - Expected:', true);
    console.log('  - Received:', isValid);
    expect(isValid).toBe(true);
    console.log('---------------------------------\n');
  }, 30000);

  // Test for get_dev_address
  it('should get the developer address', async () => {
    console.log('\n--- Test: get_dev_address ---');
    const devAddress = await sdk.get_dev_address();
    console.log('  - Received:', devAddress);
    expect(devAddress).toBeDefined();
    console.log('-----------------------------\n');
  }, 30000);

  // Test for get_contract_domain
  it('should get the contract domain', async () => {
    console.log('\n--- Test: get_contract_domain ---');
    const domain = await sdk.get_contract_domain();
    console.log('  - Received:', domain);
    expect(domain).toBeDefined();
    console.log('---------------------------------\n');
  }, 30000);

  // Test for check_name_ownership
  it('should check name ownership', async () => {
    console.log('\n--- Test: check_name_ownership ---');
    const isOwner = await sdk.check_name_ownership(testData.existingName, testData.ownerAddress);
    console.log('  - Expected:', true);
    console.log('  - Received:', isOwner);
    expect(isOwner).toBe(true);
    console.log('----------------------------------\n');
  }, 30000);

  // Test for check_name_status
  it('should check the status of a name', async () => {
    console.log('\n--- Test: check_name_status ---');
    const status = await sdk.check_name_status(testData.existingName);
    console.log('  - Received:', status);
    expect(status).toBeDefined();
    console.log('---------------------------------\n');
  }, 30000);

  // Test for get_fee_info
  it('should get fee info for a name', async () => {
    console.log('\n--- Test: get_fee_info ---');
    const feeInfo = await sdk.get_fee_info(testData.nameForFeeCalculation);
    console.log('  - Received:', feeInfo);
    expect(feeInfo).toBeDefined();
    console.log('----------------------------\n');
  }, 30000);

  // Test for calculate_fee
  it('should calculate the fee for a name', async () => {
    console.log('\n--- Test: calculate_fee ---');
    const fee = await sdk.calculate_fee(testData.nameForFeeCalculation);
    console.log('  - Received:', fee);
    expect(fee).toBeDefined();
    console.log('-----------------------------\n');
  }, 30000);

  // Test for get_fee_multiplier
  it('should get the fee multiplier for a name length', async () => {
    console.log('\n--- Test: get_fee_multiplier ---');
    const multiplier = await sdk.get_fee_multiplier(5);
    console.log('  - Received:', multiplier);
    expect(multiplier).toBeDefined();
    console.log('----------------------------------\n');
  }, 30000);

  // Test for get_manager_names
  it('should get names for a manager', async () => {
    console.log('\n--- Test: get_manager_names ---');
    const names = await sdk.get_manager_names(testData.managerAddress);
    console.log('  - Received:', names);
    expect(names).toBeDefined();
    expect(Array.isArray(names)).toBe(true);
    console.log('-------------------------------\n');
  }, 30000);

  // Test for get_manager_primary_name
  it('should get the primary name for a manager', async () => {
    console.log('\n--- Test: get_manager_primary_name ---');
    const primaryName = await sdk.get_manager_primary_name(testData.managerAddress);
    console.log('  - Received:', primaryName);
    expect(primaryName).toBeDefined();
    console.log('--------------------------------------\n');
  }, 30000);

  // Test for get_fee_structure
  it('should get the fee structure', async () => {
    console.log('\n--- Test: get_fee_structure ---');
    const feeStructure = await sdk.get_fee_structure();
    console.log('  - Received:', feeStructure);
    expect(feeStructure).toBeDefined();
    console.log('-------------------------------\n');
  }, 30000);

  // Test for get_max_profile_data_entries
  it('should get max profile data entries', async () => {
    console.log('\n--- Test: get_max_profile_data_entries ---');
    const maxEntries = await sdk.get_max_profile_data_entries();
    console.log('  - Received:', maxEntries);
    expect(typeof maxEntries).toBe('number');
    console.log('------------------------------------------\n');
  }, 30000);

  // Test for get_max_profile_key_length
  it('should get max profile key length', async () => {
    console.log('\n--- Test: get_max_profile_key_length ---');
    const maxLength = await sdk.get_max_profile_key_length();
    console.log('  - Received:', maxLength);
    expect(typeof maxLength).toBe('number');
    console.log('----------------------------------------\n');
  }, 30000);

  // Test for get_max_profile_value_length
  it('should get max profile value length', async () => {
    console.log('\n--- Test: get_max_profile_value_length ---');
    const maxLength = await sdk.get_max_profile_value_length();
    console.log('  - Received:', maxLength);
    expect(typeof maxLength).toBe('number');
    console.log('------------------------------------------\n');
  }, 30000);

  // Test for get_max_token_symbol_length
  it('should get max token symbol length', async () => {
    console.log('\n--- Test: get_max_token_symbol_length ---');
    const maxLength = await sdk.get_max_token_symbol_length();
    console.log('  - Received:', maxLength);
    expect(typeof maxLength).toBe('number');
    console.log('-----------------------------------------\n');
  }, 30000);

  // Test for get_max_total_profile_size
  it('should get max total profile size', async () => {
    console.log('\n--- Test: get_max_total_profile_size ---');
    const maxSize = await sdk.get_max_total_profile_size();
    console.log('  - Received:', maxSize);
    expect(typeof maxSize).toBe('number');
    console.log('---------------------------------------\n');
  }, 30000);

  // Test for get_grace_period_days
  it('should get grace period days', async () => {
    console.log('\n--- Test: get_grace_period_days ---');
    const gracePeriod = await sdk.get_grace_period_days();
    console.log('  - Received:', gracePeriod);
    expect(typeof gracePeriod).toBe('number');
console.log('---------------------------------\n');
  }, 30000);


  // Test for callMultiple
  it('should make multiple calls in one request', async () => {
    console.log('\n--- Test: callMultiple ---');
    const results = await sdk.callMultiple([
      { method: 'get_contract_domain' }
    ]);
    console.log('  - Received:', results);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(1);
    expect(typeof results[0]).toBe('string');
    console.log('--------------------------\n');
  }, 30000);
});