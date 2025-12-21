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
  let domainSuffix: string;

  beforeAll(async () => {
    sdk = new ThothIdSDK(sdkOptions);
    await sdk.loadContractIds();
    domainSuffix = testData.existingName.split('.').pop() || '';
  });

  // Test for isNameAvailable
  it('should check if a name is available', async () => {
    console.log('\n--- Test: isNameAvailable ---');
    const isAvailable = await sdk.isNameAvailable(testData.availableName);
    console.log('  - Checking available name:');
    console.log('    - Expected:', true);
    console.log('    - Received:', isAvailable);
    expect(isAvailable).toBe(true);

    const isNotAvailable = await sdk.isNameAvailable(testData.existingName);
    console.log('  - Checking existing name:');
    console.log('    - Expected:', false);
    console.log('    - Received:', isNotAvailable);
    expect(isNotAvailable).toBe(false);
    console.log('---------------------------------\n');
  }, 30000);

  // Test for resolveName
  it('should resolve a name', async () => {
    console.log('\n--- Test: resolveName ---');
    const ownerAddress = await sdk.resolveName(testData.existingName);
    console.log('  - Expected:', testData.ownerAddress);
    console.log('  - Received:', ownerAddress);
    expect(ownerAddress).toBe(testData.ownerAddress);
    console.log('--------------------------\n');
  }, 30000);

  // Test for getNameData
  it('should get data for a name', async () => {
    console.log('\n--- Test: getNameData ---');
    const nameData = await sdk.getNameData(testData.existingName);
    console.log('  - Received:', nameData);
    expect(nameData).toBeDefined();
    console.log('---------------------------\n');
  }, 30000);

  // Test for getProfileData
  it('should get profile data for a name', async () => {
    console.log('\n--- Test: getProfileData ---');
    const profileData = await sdk.getProfileData(testData.existingName);
    console.log('  - Received:', profileData);
    expect(profileData).toBeDefined();
    expect(typeof profileData).toBe('object');
    console.log('------------------------------\n');
  }, 30000);

  // Test for getNameOwner
  it('should get the owner of a name', async () => {
    console.log('\n--- Test: getNameOwner ---');
    const owner = await sdk.getNameOwner(testData.existingName);
    console.log('  - Expected:', testData.ownerAddress);
    console.log('  - Received:', owner);
    expect(owner).toBe(testData.ownerAddress);
    console.log('----------------------------\n');
  }, 30000);

  // Test for getNameExpirationInfo
  it('should get expiration info for a name', async () => {
    console.log('\n--- Test: getNameExpirationInfo ---');
    const expirationInfo = await sdk.getNameExpirationInfo(testData.existingName);
    console.log('  - Received:', expirationInfo);
    expect(expirationInfo).toBeDefined();
    console.log('--------------------------------------\n');
  }, 30000);

  // Test for getNameExpirationDate
  it('should get the expiration date of a name', async () => {
    console.log('\n--- Test: getNameExpirationDate ---');
    const expirationDate = await sdk.getNameExpirationDate(testData.existingName);
    console.log('  - Received:', expirationDate);
    expect(expirationDate).toBeDefined();
    console.log('--------------------------------------\n');
  }, 30000);

  // Test for validateName
  it('should validate a name', async () => {
    console.log('\n--- Test: validateName ---');
    const isValid = await sdk.validateName(testData.nameForValidation);
    console.log('  - Checking valid name:');
    console.log('    - Expected:', true);
    console.log('    - Received:', isValid);
    expect(isValid).toBe(true);

    const isInvalid = await sdk.validateName(testData.invalidNameForValidation);
    console.log('  - Checking invalid name:');
    console.log('    - Expected:', false);
    console.log('    - Received:', isInvalid);
    expect(isInvalid).toBe(false);
    console.log('---------------------------\n');
  }, 30000);

  // Test for validateKeyFormat
  it('should validate a key format', async () => {
    console.log('\n--- Test: validateKeyFormat ---');
    const isValid = await sdk.validateKeyFormat('profile_website', 'https://example.com', domainSuffix);
    console.log('  - Expected:', true);
    console.log('  - Received:', isValid);
    expect(isValid).toBe(true);
    console.log('---------------------------------\n');
  }, 30000);

  // Test for getDevAddress
  it('should get the developer address', async () => {
    console.log('\n--- Test: getDevAddress ---');
    const devAddress = await sdk.getDevAddress(domainSuffix);
    console.log('  - Received:', devAddress);
    expect(devAddress).toBeDefined();
    console.log('-----------------------------\n');
  }, 30000);

  // Test for getContractDomain
  it('should get the contract domain', async () => {
    console.log('\n--- Test: getContractDomain ---');
    const domain = await sdk.getContractDomain(domainSuffix);
    console.log('  - Received:', domain);
    expect(domain).toBeDefined();
    console.log('---------------------------------\n');
  }, 30000);

  // Test for checkNameOwnership
  it('should check name ownership', async () => {
    console.log('\n--- Test: checkNameOwnership ---');
    const isOwner = await sdk.checkNameOwnership(testData.existingName, testData.ownerAddress);
    console.log('  - Expected:', true);
    console.log('  - Received:', isOwner);
    expect(isOwner).toBe(true);
    console.log('----------------------------------\n');
  }, 30000);

  // Test for checkNameStatus
  it('should check the status of a name', async () => {
    console.log('\n--- Test: checkNameStatus ---');
    const status = await sdk.checkNameStatus(testData.existingName);
    console.log('  - Received:', status);
    expect(status).toBeDefined();
    console.log('---------------------------------\n');
  }, 30000);

  // Test for getFeeInfo
  it('should get fee info for a name', async () => {
    console.log('\n--- Test: getFeeInfo ---');
    const feeInfo = await sdk.getFeeInfo(testData.nameForFeeCalculation);
    console.log('  - Received:', feeInfo);
    expect(feeInfo).toBeDefined();
    console.log('----------------------------\n');
  }, 30000);

  // Test for calculateFee
  it('should calculate the fee for a name', async () => {
    console.log('\n--- Test: calculateFee ---');
    const fee = await sdk.calculateFee(testData.nameForFeeCalculation);
    console.log('  - Received:', fee);
    expect(fee).toBeDefined();
    console.log('-----------------------------\n');
  }, 30000);

  // Test for getFeeMultiplier
  it('should get the fee multiplier for a name length', async () => {
    console.log('\n--- Test: getFeeMultiplier ---');
    const multiplier = await sdk.getFeeMultiplier(5, domainSuffix);
    console.log('  - Received:', multiplier);
    expect(multiplier).toBeDefined();
    console.log('----------------------------------\n');
  }, 30000);

  // Test for getManagerNames
  it('should get names for a manager', async () => {
    console.log('\n--- Test: getManagerNames ---');
    const names = await sdk.getManagerNames(testData.managerAddress, domainSuffix);
    console.log('  - Received:', names);
    expect(names).toBeDefined();
    expect(Array.isArray(names)).toBe(true);
    console.log('-------------------------------\n');
  }, 30000);

  // Test for getManagerPrimaryName
  it('should get the primary name for a manager', async () => {
    console.log('\n--- Test: getManagerPrimaryName ---');
    const primaryName = await sdk.getManagerPrimaryName(testData.managerAddress, domainSuffix);
    console.log('  - Received:', primaryName);
    expect(primaryName).toBeDefined();
    console.log('--------------------------------------\n');
  }, 30000);

  // Test for getFeeStructure
  it('should get the fee structure', async () => {
    console.log('\n--- Test: getFeeStructure ---');
    const feeStructure = await sdk.getFeeStructure(domainSuffix);
    console.log('  - Received:', feeStructure);
    expect(feeStructure).toBeDefined();
    console.log('-------------------------------\n');
  }, 30000);

  // Test for getMaxProfileDataEntries
  it('should get max profile data entries', async () => {
    console.log('\n--- Test: getMaxProfileDataEntries ---');
    const maxEntries = await sdk.getMaxProfileDataEntries(domainSuffix);
    console.log('  - Received:', maxEntries);
    expect(typeof maxEntries).toBe('number');
    console.log('------------------------------------------\n');
  }, 30000);

  // Test for getMaxProfileKeyLength
  it('should get max profile key length', async () => {
    console.log('\n--- Test: getMaxProfileKeyLength ---');
    const maxLength = await sdk.getMaxProfileKeyLength(domainSuffix);
    console.log('  - Received:', maxLength);
    expect(typeof maxLength).toBe('number');
    console.log('----------------------------------------\n');
  }, 30000);

  // Test for getMaxProfileValueLength
  it('should get max profile value length', async () => {
    console.log('\n--- Test: getMaxProfileValueLength ---');
    const maxLength = await sdk.getMaxProfileValueLength(domainSuffix);
    console.log('  - Received:', maxLength);
    expect(typeof maxLength).toBe('number');
    console.log('------------------------------------------\n');
  }, 30000);

  // Test for getMaxTokenSymbolLength
  it('should get max token symbol length', async () => {
    console.log('\n--- Test: getMaxTokenSymbolLength ---');
    const maxLength = await sdk.getMaxTokenSymbolLength(domainSuffix);
    console.log('  - Received:', maxLength);
    expect(typeof maxLength).toBe('number');
    console.log('-----------------------------------------\n');
  }, 30000);

  // Test for getMaxTotalProfileSize
  it('should get max total profile size', async () => {
    console.log('\n--- Test: getMaxTotalProfileSize ---');
    const maxSize = await sdk.getMaxTotalProfileSize(domainSuffix);
    console.log('  - Received:', maxSize);
    expect(typeof maxSize).toBe('number');
    console.log('---------------------------------------\n');
  }, 30000);

  // Test for getGracePeriodDays
  it('should get grace period days', async () => {
    console.log('\n--- Test: getGracePeriodDays ---');
    const gracePeriod = await sdk.getGracePeriodDays(domainSuffix);
    console.log('  - Received:', gracePeriod);
    expect(typeof gracePeriod).toBe('number');
console.log('---------------------------------\n');
  }, 30000);


  // Test for callMultiple
  it('should make multiple calls in one request', async () => {
    console.log('\n--- Test: callMultiple ---');
    const results = await sdk.callMultiple([
      { method: 'get_contract_domain' }
    ], domainSuffix);
    console.log('  - Received:', results);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(1);
    expect(typeof results[0]).toBe('string');
    console.log('--------------------------\n');
  }, 30000);
});
