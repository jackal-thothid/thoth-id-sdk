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
    const isAvailable = await sdk.isNameAvailable(testData.availableName);
    expect(isAvailable).toBe(true);

    const isNotAvailable = await sdk.isNameAvailable(testData.existingName);
    expect(isNotAvailable).toBe(false);
  }, 30000);

  // Test for resolveName
  it('should resolve a name', async () => {
    const ownerAddress = await sdk.resolveName(testData.existingName);
    expect(ownerAddress).toBe(testData.ownerAddress);
  }, 30000);

  // Test for getNameData
  it('should get data for a name', async () => {
    const nameData = await sdk.getNameData(testData.existingName);
    expect(nameData).toBeDefined();
  }, 30000);

  // Test for getNameOwner
  it('should get the owner of a name', async () => {
    const owner = await sdk.getNameOwner(testData.existingName);
    expect(owner).toBe(testData.ownerAddress);
  }, 30000);

  // Test for getNameExpirationInfo
  it('should get expiration info for a name', async () => {
    const expirationInfo = await sdk.getNameExpirationInfo(testData.existingName);
    expect(expirationInfo).toBeDefined();
  }, 30000);

  // Test for getNameExpirationDate
  it('should get the expiration date of a name', async () => {
    const expirationDate = await sdk.getNameExpirationDate(testData.existingName);
    expect(expirationDate).toBeDefined();
  }, 30000);

  // Test for validateName
  it('should validate a name', async () => {
    const isValid = await sdk.validateName(testData.nameForValidation);
    expect(isValid).toBe(true);

    const isInvalid = await sdk.validateName(testData.invalidNameForValidation);
    expect(isInvalid).toBe(false);
  }, 30000);

  // Test for validateKeyFormat
  it('should validate a key format', async () => {
    const isValid = await sdk.validateKeyFormat('profile_website', 'https://example.com', domainSuffix);
    expect(isValid).toBe(true);
  }, 30000);

  // Test for getDevAddress
  it('should get the developer address', async () => {
    const devAddress = await sdk.getDevAddress(domainSuffix);
    expect(devAddress).toBeDefined();
  }, 30000);

  // Test for getContractDomain
  it('should get the contract domain', async () => {
    const domain = await sdk.getContractDomain(domainSuffix);
    expect(domain).toBeDefined();
  }, 30000);

  // Test for checkNameOwnership
  it('should check name ownership', async () => {
    const isOwner = await sdk.checkNameOwnership(testData.existingName, testData.ownerAddress);
    expect(isOwner).toBe(true);
  }, 30000);

  // Test for checkNameStatus
  it('should check the status of a name', async () => {
    const status = await sdk.checkNameStatus(testData.existingName);
    expect(status).toBeDefined();
  }, 30000);

  // Test for getFeeInfo
  it('should get fee info for a name', async () => {
    const feeInfo = await sdk.getFeeInfo(testData.nameForFeeCalculation);
    expect(feeInfo).toBeDefined();
  }, 30000);

  // Test for calculateFee
  it('should calculate the fee for a name', async () => {
    const fee = await sdk.calculateFee(testData.nameForFeeCalculation);
    expect(fee).toBeDefined();
  }, 30000);

  // Test for getFeeMultiplier
  it('should get the fee multiplier for a name length', async () => {
    const multiplier = await sdk.getFeeMultiplier(5, domainSuffix);
    expect(multiplier).toBeDefined();
  }, 30000);

  // Test for getManagerNames
  it('should get names for a manager', async () => {
    const names = await sdk.getManagerNames(testData.managerAddress, domainSuffix);
    expect(names).toBeDefined();
    expect(Array.isArray(names)).toBe(true);
  }, 30000);

  // Test for getManagerPrimaryName
  it('should get the primary name for a manager', async () => {
    const primaryName = await sdk.getManagerPrimaryName(testData.managerAddress, domainSuffix);
    expect(primaryName).toBeDefined();
  }, 30000);

  // Test for getFeeStructure
  it('should get the fee structure', async () => {
    const feeStructure = await sdk.getFeeStructure(domainSuffix);
    expect(feeStructure).toBeDefined();
  }, 30000);

  // Test for getMaxProfileDataEntries
  it('should get max profile data entries', async () => {
    const maxEntries = await sdk.getMaxProfileDataEntries(domainSuffix);
    expect(typeof maxEntries).toBe('number');
  }, 30000);

  // Test for getMaxProfileKeyLength
  it('should get max profile key length', async () => {
    const maxLength = await sdk.getMaxProfileKeyLength(domainSuffix);
    expect(typeof maxLength).toBe('number');
  }, 30000);

  // Test for getMaxProfileValueLength
  it('should get max profile value length', async () => {
    const maxLength = await sdk.getMaxProfileValueLength(domainSuffix);
    expect(typeof maxLength).toBe('number');
  }, 30000);

  // Test for getMaxTokenSymbolLength
  it('should get max token symbol length', async () => {
    const maxLength = await sdk.getMaxTokenSymbolLength(domainSuffix);
    expect(typeof maxLength).toBe('number');
  }, 30000);

  // Test for getMaxTotalProfileSize
  it('should get max total profile size', async () => {
    const maxSize = await sdk.getMaxTotalProfileSize(domainSuffix);
    expect(typeof maxSize).toBe('number');
  }, 30000);

  // Test for getGracePeriodDays
  it('should get grace period days', async () => {
    const gracePeriod = await sdk.getGracePeriodDays(domainSuffix);
    expect(typeof gracePeriod).toBe('number');
  }, 30000);


  // Test for callMultiple
  it('should make multiple calls in one request', async () => {
    const results = await sdk.callMultiple([
      { method: 'get_contract_domain' }
    ], domainSuffix);
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(1);
    expect(typeof results[0]).toBe('string');
  }, 30000);
});