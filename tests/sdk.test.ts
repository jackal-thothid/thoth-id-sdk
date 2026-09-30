import { ThothIdSDK, ThothSDKOptions } from '../src/index';
import * as fs from 'fs';
import * as path from 'path';

// These tests run straight against the public Hathor testnet. There is nothing
// to set up: since v3 the Sdk discovers the domain registries from the node
// itself, so the whole suite only needs a network connection.
const configPath = path.resolve(__dirname, 'test-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
const sdkOptions: ThothSDKOptions = config.sdkOptions;
const settings = config.contractSettings;
const domains: any[] = config.domains;

const TIMEOUT = 30000;
// Discovery walks the registries one request at a time because public nodes
// rate-limit, so anything that collects a fresh map needs more room.
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

describe('ThothIdSDK on testnet', () => {
  let sdk: ThothIdSDK;

  beforeAll(async () => {
    sdk = new ThothIdSDK(sdkOptions);
    await sdk.loadContractIds();
  }, DISCOVERY_TIMEOUT);

  describe('contract discovery', () => {
    it('discovers at least the required registries, each exactly', () => {
      // Extra registries are expected as testnet grows, so this asserts the
      // required ones entry by entry instead of comparing the whole map.
      for (const [suffix, contractId] of Object.entries(requiredRegistries)) {
        expect(sdk.contractIds[suffix]).toBe(contractId);
      }
    });

    it('exposes the discovered domains', () => {
      expect(sdk.getDomains()).toEqual(expect.arrayContaining(Object.keys(requiredRegistries)));

      for (const domain of domains) {
        expect(sdk.getContractIdForDomain(domain.suffix)).toBe(domain.contractId);
      }
    });

    it('looks domains up case-insensitively', () => {
      const [domain] = domains;
      expect(sdk.getContractIdForDomain(domain.suffix.toUpperCase())).toBe(domain.contractId);
    });

    it('collects the map only once', async () => {
      const startedAt = Date.now();
      const contractIds = await sdk.loadContractIds();

      // Already collected in beforeAll, so this must not hit the network again.
      expect(Date.now() - startedAt).toBeLessThan(500);
      expect(contractIds).toEqual(sdk.contractIds);
    }, TIMEOUT);

    it('collects the map on first use, without an explicit load', async () => {
      const lazySdk = new ThothIdSDK(sdkOptions);
      expect(lazySdk.getDomains()).toEqual([]);

      const [domain] = domains;
      await expect(lazySdk.getContractDomain(domain.suffix)).resolves.toBe(domain.suffix);
      expect(lazySdk.getContractIdForDomain(domain.suffix)).toBe(domain.contractId);
    }, DISCOVERY_TIMEOUT);

    it('reuses an exported map without any discovery', async () => {
      const exported = JSON.parse(JSON.stringify(sdk.exportContractIds()));
      const seededSdk = new ThothIdSDK({ ...sdkOptions, contractIds: exported });

      // Seeded up front, so the domains are known before any request is made.
      expect(seededSdk.getDomains()).toEqual(sdk.getDomains());

      const [domain] = domains;
      await expect(seededSdk.resolveName(domain.registeredName)).resolves.toBe(domain.ownerAddress);
    }, TIMEOUT);

    it('collects the map again on refresh', async () => {
      const refreshSdk = new ThothIdSDK(sdkOptions);
      const collected = await refreshSdk.loadContractIds();

      // Same node moments later, so re-collecting must reproduce the same map.
      // Compared within this instance rather than against the one from
      // beforeAll, which a registry created mid-run would legitimately change.
      const refreshed = await refreshSdk.refreshContractIds();
      expect(refreshed).toEqual(collected);
      expect(refreshed).toMatchObject(requiredRegistries);
    }, DISCOVERY_TIMEOUT);

    it('drops the map when the blueprint changes', async () => {
      const otherSdk = new ThothIdSDK(sdkOptions);
      await otherSdk.loadContractIds();
      expect(otherSdk.getDomains().length).toBeGreaterThan(0);

      otherSdk.setBlueprintId('00'.repeat(32));
      expect(otherSdk.getDomains()).toEqual([]);
    }, DISCOVERY_TIMEOUT);

    it('explains an unknown domain suffix', async () => {
      await expect(sdk.resolveName(config.unknownSuffixName)).rejects.toThrow(
        /registers the "\.\w+" domain/
      );
    }, TIMEOUT);

    it('rejects a name without a domain suffix', async () => {
      await expect(sdk.resolveName(config.nameWithoutSuffix)).rejects.toThrow(
        'it has no domain suffix'
      );
    }, TIMEOUT);
  });

  describe.each(domains)('contract information for .$suffix', (domain) => {
    it('should get the contract domain', async () => {
      const contractDomain = await sdk.getContractDomain(domain.suffix);
      expect(contractDomain).toBe(domain.suffix);
    }, TIMEOUT);

    it('should get the developer address', async () => {
      const devAddress = await sdk.getDevAddress(domain.suffix);
      expect(devAddress).toBe(domain.devAddress);
    }, TIMEOUT);

    it('should get the fee structure', async () => {
      const feeStructure = await sdk.getFeeStructure(domain.suffix);
      expect(feeStructure).toEqual(settings.feeStructure);
    }, TIMEOUT);

    it('should get grace period days', async () => {
      const gracePeriod = await sdk.getGracePeriodDays(domain.suffix);
      expect(gracePeriod).toBe(settings.gracePeriodDays);
    }, TIMEOUT);

    it('should get the fee multiplier for each name length', async () => {
      for (const [length, expected] of Object.entries(settings.feeMultipliersByLength)) {
        const multiplier = await sdk.getFeeMultiplier(Number(length), domain.suffix);
        expect(multiplier).toBe(expected);
      }
    }, TIMEOUT);

    it('should get the profile data limits', async () => {
      expect(await sdk.getMaxProfileDataEntries(domain.suffix)).toBe(settings.maxProfileDataEntries);
      expect(await sdk.getMaxProfileKeyLength(domain.suffix)).toBe(settings.maxProfileKeyLength);
      expect(await sdk.getMaxProfileValueLength(domain.suffix)).toBe(settings.maxProfileValueLength);
      expect(await sdk.getMaxTotalProfileSize(domain.suffix)).toBe(settings.maxTotalProfileSize);
      expect(await sdk.getMaxTokenSymbolLength(domain.suffix)).toBe(settings.maxTokenSymbolLength);
    }, TIMEOUT);

    it('should get names for a manager', async () => {
      const names = await sdk.getManagerNames(domain.devAddress, domain.suffix);
      expect(Array.isArray(names)).toBe(true);
      expect(names).toContain(domain.primaryName);
    }, TIMEOUT);

    it('should get the primary name for a manager', async () => {
      const primaryName = await sdk.getManagerPrimaryName(domain.devAddress, domain.suffix);
      expect(primaryName).toBe(domain.primaryName);
    }, TIMEOUT);

    it('should validate a key format', async () => {
      const isValid = await sdk.validateKeyFormat('profile_website', 'https://example.com', domain.suffix);
      expect(isValid).toBe(true);
    }, TIMEOUT);
  });

  describe.each(domains)('registered name $registeredName', (domain) => {
    it('should not be available', async () => {
      const isAvailable = await sdk.isNameAvailable(domain.registeredName);
      expect(isAvailable).toBe(false);
    }, TIMEOUT);

    it('should resolve to its address', async () => {
      const address = await sdk.resolveName(domain.registeredName);
      expect(address).toBe(domain.ownerAddress);
    }, TIMEOUT);

    it('should have an owner', async () => {
      const owner = await sdk.getNameOwner(domain.registeredName);
      expect(owner).toBe(domain.ownerAddress);
    }, TIMEOUT);

    it('should return consistent name data', async () => {
      const nameData = await sdk.getNameData(domain.registeredName);
      const expirationDate = await sdk.getNameExpirationDate(domain.registeredName);

      expect(nameData.owner_address).toBe(domain.ownerAddress);
      expect(nameData.token_uid).toMatch(/^[0-9a-f]+$/);
      expect(Number(nameData.expiration_date)).toBe(expirationDate);
    }, TIMEOUT);

    it('should return profile data as an object', async () => {
      const profileData = await sdk.getProfileData(domain.registeredName);
      expect(typeof profileData).toBe('object');
      expect(profileData).not.toBeNull();
    }, TIMEOUT);

    it('should be active and not expired', async () => {
      const status = await sdk.checkNameStatus(domain.registeredName);
      const expirationInfo = await sdk.getNameExpirationInfo(domain.registeredName);
      const now = Math.floor(Date.now() / 1000);

      expect(status).toBe('active');
      expect(expirationInfo.status).toBe('active');
      expect(Number(expirationInfo.expiration_date)).toBeGreaterThan(now);
      expect(Number(expirationInfo.grace_period_end)).toBeGreaterThan(
        Number(expirationInfo.expiration_date)
      );
    }, TIMEOUT);

    it('should check name ownership', async () => {
      const isOwner = await sdk.checkNameOwnership(domain.registeredName, domain.ownerAddress);
      expect(isOwner).toBe(true);

      const isNotOwner = await sdk.checkNameOwnership(domain.registeredName, domain.nonOwnerAddress);
      expect(isNotOwner).toBe(false);
    }, TIMEOUT);
  });

  describe.each(domains)('unregistered name on .$suffix', (domain) => {
    it('should be available', async () => {
      const isAvailable = await sdk.isNameAvailable(freeName(domain.suffix));
      expect(isAvailable).toBe(true);
    }, TIMEOUT);

    it('should report an available status', async () => {
      const status = await sdk.checkNameStatus(freeName(domain.suffix));
      expect(status).toBe('available');
    }, TIMEOUT);

    it('should not resolve', async () => {
      await expect(sdk.resolveName(freeName(domain.suffix))).rejects.toThrow('NameNotFound');
    }, TIMEOUT);
  });

  describe('name validation', () => {
    it('should accept valid names', async () => {
      for (const name of config.validNames) {
        await expect(sdk.validateName(name)).resolves.toBe(true);
      }
    }, TIMEOUT);

    it('should reject invalid names', async () => {
      for (const name of config.invalidNames) {
        await expect(sdk.validateName(name)).resolves.toBe(false);
      }
    }, TIMEOUT);
  });

  describe('fees', () => {
    it('should calculate the fee from the name length', async () => {
      for (const [name, expected] of Object.entries(config.feesByName)) {
        expect(await sdk.calculateFee(name)).toBe(expected);
      }
    }, TIMEOUT);

    it('should get fee info matching the calculated fee', async () => {
      for (const [name, expected] of Object.entries(config.feesByName)) {
        const feeInfo = await sdk.getFeeInfo(name);
        expect(feeInfo.total_fee).toBe(expected);
        expect(feeInfo.base_fee * feeInfo.multiplier).toBe(feeInfo.total_fee);
      }
    }, TIMEOUT);
  });

  describe('callMultiple', () => {
    it('should make multiple calls in one request', async () => {
      const [domain] = domains;
      const results = await sdk.callMultiple([
        { method: 'get_contract_domain' },
        { method: 'get_grace_period_days' },
        { method: 'get_fee_multiplier', params: [3] },
      ], domain.suffix);

      expect(results).toEqual([
        domain.suffix,
        settings.gracePeriodDays,
        settings.feeMultipliersByLength['3'],
      ]);
    }, TIMEOUT);

    it('should agree with the individual calls', async () => {
      const [domain] = domains;
      const [contractDomain] = await sdk.callMultiple([{ method: 'get_contract_domain' }], domain.suffix);

      expect(contractDomain).toBe(await sdk.getContractDomain(domain.suffix));
    }, TIMEOUT);

    it('should fail the whole batch when one call fails', async () => {
      const [domain] = domains;
      await expect(sdk.callMultiple([
        { method: 'get_manager_primary_name', params: [domain.devAddress] },
        { method: 'get_manager_primary_name', params: ['notanaddress'] },
      ], domain.suffix)).rejects.toThrow('InvalidAddress');
    }, TIMEOUT);
  });

  describe('callMultipleSettled', () => {
    it('should isolate an invalid address to its own result', async () => {
      const [domain] = domains;
      const results = await sdk.callMultipleSettled([
        { method: 'get_manager_primary_name', params: [domain.devAddress] },
        { method: 'get_manager_primary_name', params: ['notanaddress'] },
        { method: 'get_grace_period_days' },
      ], domain.suffix);

      expect(results).toEqual([
        { ok: true, value: domain.primaryName },
        { ok: false, error: expect.stringContaining('InvalidAddress') },
        { ok: true, value: settings.gracePeriodDays },
      ]);
    }, TIMEOUT);
  });
});
