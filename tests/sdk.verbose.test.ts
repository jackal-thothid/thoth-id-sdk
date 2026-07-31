import { ThothIdSDK, ThothSDKOptions } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

// Same suite as sdk.test.ts, printing what it asked the testnet and what came
// back. Run it with `npm run test:v3:verbose` when a failure needs context.
const configPath = path.resolve(__dirname, 'test-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const sdkOptions: ThothSDKOptions = config.sdkOptions;
const settings = config.contractSettings;
const domains: any[] = config.domains;

const TIMEOUT = 30000;
const DISCOVERY_TIMEOUT = 120000;

/**
 * The registries the tests require, derived from the domains they exercise.
 * Discovery has to return each of these mapped to exactly this contract — but
 * this is a lower bound, not the whole set: testnet will gain domains over
 * time, and an extra registry must not fail the suite.
 */
const requiredRegistries: Record<string, string> = Object.fromEntries(
  domains.map((domain) => [domain.suffix, domain.contractId])
);

/** A name nobody can have registered, so it is always available. */
function freeName(suffix: string) {
  return `zz${Date.now()}${Math.floor(Math.random() * 1000)}.${suffix}`;
}

function log(label: string, expected: any, received: any) {
  console.log(`  - ${label}:`);
  console.log('    - Expected:', expected);
  console.log('    - Received:', received);
}

describe('ThothIdSDK on testnet', () => {
  let sdk: ThothIdSDK;

  beforeAll(async () => {
    console.log('\n=== Discovering the domain registries from the node ===');
    console.log('  - sdkOptions:', JSON.stringify(sdkOptions));
    sdk = new ThothIdSDK(sdkOptions);
    console.log('  - nodeUrl:', sdk.nodeUrl);
    console.log('  - blueprintId:', sdk.blueprintId);

    const startedAt = Date.now();
    const contractIds = await sdk.loadContractIds();
    console.log(`  - collected in ${Date.now() - startedAt}ms:`, contractIds);
    console.log('======================================================\n');
  }, DISCOVERY_TIMEOUT);

  describe('contract discovery', () => {
    it('discovers at least the required registries, each exactly', () => {
      console.log('\n--- Test: discovery result ---');
      log('required registries', requiredRegistries, sdk.contractIds);

      // Extra registries are expected as testnet grows, so this asserts the
      // required ones entry by entry instead of comparing the whole map.
      for (const [suffix, contractId] of Object.entries(requiredRegistries)) {
        log(`.${suffix}`, contractId, sdk.contractIds[suffix]);
        expect(sdk.contractIds[suffix]).toBe(contractId);
      }

      const extras = sdk.getDomains().filter((suffix) => !(suffix in requiredRegistries));
      console.log('  - Extra registries (not asserted):', extras.length > 0 ? extras : 'none');
      console.log('------------------------------\n');
    });

    it('exposes the discovered domains', () => {
      console.log('\n--- Test: getDomains / getContractIdForDomain ---');
      log('domains', `at least ${JSON.stringify(Object.keys(requiredRegistries))}`, sdk.getDomains());
      expect(sdk.getDomains()).toEqual(expect.arrayContaining(Object.keys(requiredRegistries)));

      for (const domain of domains) {
        log(`contract ID of .${domain.suffix}`, domain.contractId, sdk.getContractIdForDomain(domain.suffix));
        expect(sdk.getContractIdForDomain(domain.suffix)).toBe(domain.contractId);
      }
      console.log('-------------------------------------------------\n');
    });

    it('looks domains up case-insensitively', () => {
      console.log('\n--- Test: case-insensitive suffix lookup ---');
      const [domain] = domains;
      const upper = domain.suffix.toUpperCase();
      log(`contract ID of .${upper}`, domain.contractId, sdk.getContractIdForDomain(upper));
      expect(sdk.getContractIdForDomain(upper)).toBe(domain.contractId);
      console.log('--------------------------------------------\n');
    });

    it('collects the map only once', async () => {
      console.log('\n--- Test: second loadContractIds() is cached ---');
      const startedAt = Date.now();
      const contractIds = await sdk.loadContractIds();
      const elapsed = Date.now() - startedAt;

      log('elapsed (ms)', '< 500 (no network)', elapsed);
      expect(elapsed).toBeLessThan(500);
      expect(contractIds).toEqual(sdk.contractIds);
      console.log('------------------------------------------------\n');
    }, TIMEOUT);

    it('collects the map on first use, without an explicit load', async () => {
      console.log('\n--- Test: lazy collection on first use ---');
      const lazySdk = new ThothIdSDK(sdkOptions);
      log('domains before any call', [], lazySdk.getDomains());
      expect(lazySdk.getDomains()).toEqual([]);

      const [domain] = domains;
      const contractDomain = await lazySdk.getContractDomain(domain.suffix);
      log(`getContractDomain("${domain.suffix}")`, domain.suffix, contractDomain);
      expect(contractDomain).toBe(domain.suffix);

      log('domains after the call', domain.contractId, lazySdk.getContractIdForDomain(domain.suffix));
      expect(lazySdk.getContractIdForDomain(domain.suffix)).toBe(domain.contractId);
      console.log('------------------------------------------\n');
    }, DISCOVERY_TIMEOUT);

    it('reuses an exported map without any discovery', async () => {
      console.log('\n--- Test: exportContractIds() round trip ---');
      const exported = JSON.parse(JSON.stringify(sdk.exportContractIds()));
      console.log('  - exported:', exported);

      const seededSdk = new ThothIdSDK({ ...sdkOptions, contractIds: exported });
      log('domains before any call', sdk.getDomains(), seededSdk.getDomains());
      expect(seededSdk.getDomains()).toEqual(sdk.getDomains());

      const [domain] = domains;
      const address = await seededSdk.resolveName(domain.registeredName);
      log(`resolveName("${domain.registeredName}")`, domain.ownerAddress, address);
      expect(address).toBe(domain.ownerAddress);
      console.log('-------------------------------------------\n');
    }, TIMEOUT);

    it('collects the map again on refresh', async () => {
      console.log('\n--- Test: refreshContractIds() ---');
      const refreshSdk = new ThothIdSDK(sdkOptions);
      const collected = await refreshSdk.loadContractIds();

      // Same node moments later, so re-collecting must reproduce the same map.
      // Compared within this instance rather than against the one from
      // beforeAll, which a registry created mid-run would legitimately change.
      const refreshed = await refreshSdk.refreshContractIds();
      log('refreshed map', collected, refreshed);
      expect(refreshed).toEqual(collected);
      expect(refreshed).toMatchObject(requiredRegistries);
      console.log('----------------------------------\n');
    }, DISCOVERY_TIMEOUT);

    it('drops the map when the blueprint changes', async () => {
      console.log('\n--- Test: setBlueprintId() invalidates the map ---');
      const otherSdk = new ThothIdSDK(sdkOptions);
      await otherSdk.loadContractIds();
      console.log('  - domains before:', otherSdk.getDomains());
      expect(otherSdk.getDomains().length).toBeGreaterThan(0);

      otherSdk.setBlueprintId('00'.repeat(32));
      log('domains after setBlueprintId', [], otherSdk.getDomains());
      expect(otherSdk.getDomains()).toEqual([]);
      console.log('--------------------------------------------------\n');
    }, DISCOVERY_TIMEOUT);

    it('explains an unknown domain suffix', async () => {
      console.log('\n--- Test: unknown domain suffix ---');
      await expect(sdk.resolveName(config.unknownSuffixName)).rejects.toThrow(
        /registers the "\.\w+" domain/
      );
      const error = await sdk.resolveName(config.unknownSuffixName).catch((e: Error) => e);
      console.log('  - Error:', (error as Error).message);
      console.log('-----------------------------------\n');
    }, TIMEOUT);

    it('rejects a name without a domain suffix', async () => {
      console.log('\n--- Test: name without a suffix ---');
      await expect(sdk.resolveName(config.nameWithoutSuffix)).rejects.toThrow(
        'it has no domain suffix'
      );
      const error = await sdk.resolveName(config.nameWithoutSuffix).catch((e: Error) => e);
      console.log('  - Error:', (error as Error).message);
      console.log('-----------------------------------\n');
    }, TIMEOUT);
  });

  describe.each(domains)('contract information for .$suffix', (domain) => {
    it('should get the contract domain', async () => {
      console.log(`\n--- Test: getContractDomain (.${domain.suffix}) ---`);
      const contractDomain = await sdk.getContractDomain(domain.suffix);
      log('domain', domain.suffix, contractDomain);
      expect(contractDomain).toBe(domain.suffix);
      console.log('------------------------------------\n');
    }, TIMEOUT);

    it('should get the developer address', async () => {
      console.log(`\n--- Test: getDevAddress (.${domain.suffix}) ---`);
      const devAddress = await sdk.getDevAddress(domain.suffix);
      log('dev address', domain.devAddress, devAddress);
      expect(devAddress).toBe(domain.devAddress);
      console.log('--------------------------------\n');
    }, TIMEOUT);

    it('should get the fee structure', async () => {
      console.log(`\n--- Test: getFeeStructure (.${domain.suffix}) ---`);
      const feeStructure = await sdk.getFeeStructure(domain.suffix);
      log('fee structure', settings.feeStructure, feeStructure);
      expect(feeStructure).toEqual(settings.feeStructure);
      console.log('---------------------------------\n');
    }, TIMEOUT);

    it('should get grace period days', async () => {
      console.log(`\n--- Test: getGracePeriodDays (.${domain.suffix}) ---`);
      const gracePeriod = await sdk.getGracePeriodDays(domain.suffix);
      log('grace period days', settings.gracePeriodDays, gracePeriod);
      expect(gracePeriod).toBe(settings.gracePeriodDays);
      console.log('------------------------------------\n');
    }, TIMEOUT);

    it('should get the fee multiplier for each name length', async () => {
      console.log(`\n--- Test: getFeeMultiplier (.${domain.suffix}) ---`);
      for (const [length, expected] of Object.entries(settings.feeMultipliersByLength)) {
        const multiplier = await sdk.getFeeMultiplier(Number(length), domain.suffix);
        log(`length ${length}`, expected, multiplier);
        expect(multiplier).toBe(expected);
      }
      console.log('----------------------------------\n');
    }, TIMEOUT);

    it('should get the profile data limits', async () => {
      console.log(`\n--- Test: profile data limits (.${domain.suffix}) ---`);
      // One call at a time: firing these together is the burst that makes the
      // public node answer 429.
      const limits: Array<[string, number, () => Promise<number>]> = [
        ['maxProfileDataEntries', settings.maxProfileDataEntries, () => sdk.getMaxProfileDataEntries(domain.suffix)],
        ['maxProfileKeyLength', settings.maxProfileKeyLength, () => sdk.getMaxProfileKeyLength(domain.suffix)],
        ['maxProfileValueLength', settings.maxProfileValueLength, () => sdk.getMaxProfileValueLength(domain.suffix)],
        ['maxTotalProfileSize', settings.maxTotalProfileSize, () => sdk.getMaxTotalProfileSize(domain.suffix)],
        ['maxTokenSymbolLength', settings.maxTokenSymbolLength, () => sdk.getMaxTokenSymbolLength(domain.suffix)],
      ];

      for (const [label, expected, call] of limits) {
        const received = await call();
        log(label, expected, received);
        expect(received).toBe(expected);
      }
      console.log('-------------------------------------\n');
    }, TIMEOUT);

    it('should get names for a manager', async () => {
      console.log(`\n--- Test: getManagerNames (.${domain.suffix}) ---`);
      const names = await sdk.getManagerNames(domain.devAddress, domain.suffix);
      log(`names of ${domain.devAddress}`, `array containing "${domain.primaryName}"`, names);
      expect(Array.isArray(names)).toBe(true);
      expect(names).toContain(domain.primaryName);
      console.log('---------------------------------\n');
    }, TIMEOUT);

    it('should get the primary name for a manager', async () => {
      console.log(`\n--- Test: getManagerPrimaryName (.${domain.suffix}) ---`);
      const primaryName = await sdk.getManagerPrimaryName(domain.devAddress, domain.suffix);
      log('primary name', domain.primaryName, primaryName);
      expect(primaryName).toBe(domain.primaryName);
      console.log('---------------------------------------\n');
    }, TIMEOUT);

    it('should validate a key format', async () => {
      console.log(`\n--- Test: validateKeyFormat (.${domain.suffix}) ---`);
      const isValid = await sdk.validateKeyFormat('profile_website', 'https://example.com', domain.suffix);
      log('profile_website=https://example.com', true, isValid);
      expect(isValid).toBe(true);
      console.log('-----------------------------------\n');
    }, TIMEOUT);
  });

  describe.each(domains)('registered name $registeredName', (domain) => {
    it('should not be available', async () => {
      console.log(`\n--- Test: isNameAvailable (${domain.registeredName}) ---`);
      const isAvailable = await sdk.isNameAvailable(domain.registeredName);
      log('available', false, isAvailable);
      expect(isAvailable).toBe(false);
      console.log('---------------------------------\n');
    }, TIMEOUT);

    it('should resolve to its address', async () => {
      console.log(`\n--- Test: resolveName (${domain.registeredName}) ---`);
      const address = await sdk.resolveName(domain.registeredName);
      log('address', domain.ownerAddress, address);
      expect(address).toBe(domain.ownerAddress);
      console.log('------------------------------\n');
    }, TIMEOUT);

    it('should have an owner', async () => {
      console.log(`\n--- Test: getNameOwner (${domain.registeredName}) ---`);
      const owner = await sdk.getNameOwner(domain.registeredName);
      log('owner', domain.ownerAddress, owner);
      expect(owner).toBe(domain.ownerAddress);
      console.log('-------------------------------\n');
    }, TIMEOUT);

    it('should return consistent name data', async () => {
      console.log(`\n--- Test: getNameData (${domain.registeredName}) ---`);
      const nameData = await sdk.getNameData(domain.registeredName);
      const expirationDate = await sdk.getNameExpirationDate(domain.registeredName);
      console.log('  - Received:', nameData);

      log('owner_address', domain.ownerAddress, nameData.owner_address);
      expect(nameData.owner_address).toBe(domain.ownerAddress);
      log('token_uid', 'hex string', nameData.token_uid);
      expect(nameData.token_uid).toMatch(/^[0-9a-f]+$/);
      log('expiration_date vs getNameExpirationDate', expirationDate, Number(nameData.expiration_date));
      expect(Number(nameData.expiration_date)).toBe(expirationDate);
      console.log('-----------------------------\n');
    }, TIMEOUT);

    it('should return profile data as an object', async () => {
      console.log(`\n--- Test: getProfileData (${domain.registeredName}) ---`);
      const profileData = await sdk.getProfileData(domain.registeredName);
      log('profile data', 'object', profileData);
      expect(typeof profileData).toBe('object');
      expect(profileData).not.toBeNull();
      console.log('--------------------------------\n');
    }, TIMEOUT);

    it('should be active and not expired', async () => {
      console.log(`\n--- Test: status and expiration (${domain.registeredName}) ---`);
      const status = await sdk.checkNameStatus(domain.registeredName);
      const expirationInfo = await sdk.getNameExpirationInfo(domain.registeredName);
      const now = Math.floor(Date.now() / 1000);

      log('checkNameStatus', 'active', status);
      expect(status).toBe('active');
      log('expiration info status', 'active', expirationInfo.status);
      expect(expirationInfo.status).toBe('active');
      log('expiration_date', `> now (${now})`, expirationInfo.expiration_date);
      expect(Number(expirationInfo.expiration_date)).toBeGreaterThan(now);
      log('grace_period_end', `> ${expirationInfo.expiration_date}`, expirationInfo.grace_period_end);
      expect(Number(expirationInfo.grace_period_end)).toBeGreaterThan(
        Number(expirationInfo.expiration_date)
      );
      console.log('-------------------------------------\n');
    }, TIMEOUT);

    it('should check name ownership', async () => {
      console.log(`\n--- Test: checkNameOwnership (${domain.registeredName}) ---`);
      const isOwner = await sdk.checkNameOwnership(domain.registeredName, domain.ownerAddress);
      log(`owner ${domain.ownerAddress}`, true, isOwner);
      expect(isOwner).toBe(true);

      const isNotOwner = await sdk.checkNameOwnership(domain.registeredName, domain.nonOwnerAddress);
      log(`non-owner ${domain.nonOwnerAddress}`, false, isNotOwner);
      expect(isNotOwner).toBe(false);
      console.log('------------------------------------\n');
    }, TIMEOUT);
  });

  describe.each(domains)('unregistered name on .$suffix', (domain) => {
    it('should be available', async () => {
      console.log(`\n--- Test: unregistered isNameAvailable (.${domain.suffix}) ---`);
      const name = freeName(domain.suffix);
      const isAvailable = await sdk.isNameAvailable(name);
      log(name, true, isAvailable);
      expect(isAvailable).toBe(true);
      console.log('-------------------------------------------\n');
    }, TIMEOUT);

    it('should report an available status', async () => {
      console.log(`\n--- Test: unregistered checkNameStatus (.${domain.suffix}) ---`);
      const name = freeName(domain.suffix);
      const status = await sdk.checkNameStatus(name);
      log(name, 'available', status);
      expect(status).toBe('available');
      console.log('-------------------------------------------\n');
    }, TIMEOUT);

    it('should not resolve', async () => {
      console.log(`\n--- Test: unregistered resolveName (.${domain.suffix}) ---`);
      const name = freeName(domain.suffix);
      const error = await sdk.resolveName(name).catch((e: Error) => e);
      log(name, 'throws NameNotFound', (error as Error).message);
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain('NameNotFound');
      console.log('----------------------------------------\n');
    }, TIMEOUT);
  });

  describe('name validation', () => {
    it('should accept valid names', async () => {
      console.log('\n--- Test: validateName (valid) ---');
      for (const name of config.validNames) {
        const isValid = await sdk.validateName(name);
        log(name, true, isValid);
        expect(isValid).toBe(true);
      }
      console.log('----------------------------------\n');
    }, TIMEOUT);

    it('should reject invalid names', async () => {
      console.log('\n--- Test: validateName (invalid) ---');
      for (const name of config.invalidNames) {
        const isValid = await sdk.validateName(name);
        log(name, false, isValid);
        expect(isValid).toBe(false);
      }
      console.log('------------------------------------\n');
    }, TIMEOUT);
  });

  describe('fees', () => {
    it('should calculate the fee from the name length', async () => {
      console.log('\n--- Test: calculateFee ---');
      for (const [name, expected] of Object.entries(config.feesByName)) {
        const fee = await sdk.calculateFee(name);
        log(name, expected, fee);
        expect(fee).toBe(expected);
      }
      console.log('--------------------------\n');
    }, TIMEOUT);

    it('should get fee info matching the calculated fee', async () => {
      console.log('\n--- Test: getFeeInfo ---');
      for (const [name, expected] of Object.entries(config.feesByName)) {
        const feeInfo = await sdk.getFeeInfo(name);
        log(name, `total_fee ${expected}`, feeInfo);
        expect(feeInfo.total_fee).toBe(expected);
        expect(feeInfo.base_fee * feeInfo.multiplier).toBe(feeInfo.total_fee);
      }
      console.log('------------------------\n');
    }, TIMEOUT);
  });

  describe('callMultiple', () => {
    it('should make multiple calls in one request', async () => {
      console.log('\n--- Test: callMultiple ---');
      const [domain] = domains;
      const expected = [
        domain.suffix,
        settings.gracePeriodDays,
        settings.feeMultipliersByLength['3'],
      ];
      const results = await sdk.callMultiple([
        { method: 'get_contract_domain' },
        { method: 'get_grace_period_days' },
        { method: 'get_fee_multiplier', params: [3] },
      ], domain.suffix);

      log('results', expected, results);
      expect(results).toEqual(expected);
      console.log('--------------------------\n');
    }, TIMEOUT);

    it('should agree with the individual calls', async () => {
      console.log('\n--- Test: callMultiple vs individual call ---');
      const [domain] = domains;
      const [contractDomain] = await sdk.callMultiple([{ method: 'get_contract_domain' }], domain.suffix);
      const individual = await sdk.getContractDomain(domain.suffix);

      log('get_contract_domain', individual, contractDomain);
      expect(contractDomain).toBe(individual);
      console.log('--------------------------------------------\n');
    }, TIMEOUT);
  });
});
