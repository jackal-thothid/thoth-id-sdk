import {
  ThothIdSDK,
  DEFAULT_BLUEPRINT_ID,
  DEFAULT_NETWORK,
  DEFAULT_NODE_URL,
  MAINNET_BLUEPRINT_IDS,
  MAINNET_NODE_URL,
  NETWORKS,
  TESTNET_BLUEPRINT_IDS,
  TESTNET_NODE_URL,
} from '../src/index';
import * as http from 'http';
import { AddressInfo } from 'net';

// These tests run against a throwaway local node stand-in, so they can script
// what the testnet cannot: rate limiting on demand and inspection of the exact
// requests the Sdk sends.

const CONTRACT_ID = '00'.repeat(32);
const TIMEOUT = 30000;

type Handler = (req: http.IncomingMessage, res: http.ServerResponse) => void;

let server: http.Server;
let baseUrl: string;
let handler: Handler;
let requests: http.IncomingMessage[];

function json(res: http.ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

/** Answers every call of a `state` request with `values[callString]`. */
function stateResponder(values: Record<string, unknown>): Handler {
  return (req, res) => {
    const url = new URL(req.url!, baseUrl);
    const calls: Record<string, unknown> = {};
    for (const call of url.searchParams.getAll('calls[]')) {
      calls[call] = call in values ? { value: values[call] } : { errmsg: `Unknown call ${call}` };
    }
    json(res, 200, { success: true, calls });
  };
}

function newSdk(opts: ConstructorParameters<typeof ThothIdSDK>[0] = {}) {
  return new ThothIdSDK({
    nodeUrl: `${baseUrl}/v1a/nano_contract/state`,
    contractIds: { htr: CONTRACT_ID },
    ...opts,
  });
}

beforeAll(async () => {
  server = http.createServer((req, res) => {
    requests.push(req);
    handler(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  requests = [];
  handler = stateResponder({ 'get_contract_domain()': 'htr' });
});

describe('custom headers', () => {
  it('sends them with every request', async () => {
    const sdk = newSdk({ headers: { 'X-API-Key': 'secret' } });

    await expect(sdk.getContractDomain('htr')).resolves.toBe('htr');
    expect(requests).toHaveLength(1);
    expect(requests[0].headers['x-api-key']).toBe('secret');
  }, TIMEOUT);

  it('sends them during discovery too', async () => {
    handler = (req, res) => {
      const { pathname } = new URL(req.url!, baseUrl);
      if (pathname.endsWith('/creation')) {
        json(res, 200, { success: true, nc_creation_txs: [{ nano_contract_id: CONTRACT_ID }], has_more: false });
      } else if (pathname.endsWith('/history')) {
        json(res, 200, { success: true, history: [{ nc_method: 'initialize', nc_args_decoded: ['htr'] }] });
      } else {
        json(res, 200, { success: true, blueprint_id: MAINNET_BLUEPRINT_IDS[0], calls: {} });
      }
    };
    const sdk = new ThothIdSDK({
      nodeUrl: `${baseUrl}/v1a/nano_contract/state`,
      headers: { 'X-API-Key': 'secret' },
    });

    await expect(sdk.loadContractIds()).resolves.toEqual({ htr: CONTRACT_ID });
    // Mainnet by default: one `creation` per blueprint, then `history` and `state`.
    expect(requests).toHaveLength(4);
    for (const req of requests) {
      expect(req.headers['x-api-key']).toBe('secret');
    }
  }, TIMEOUT);

  it('drops headers whose value is undefined', async () => {
    const sdk = newSdk({ headers: { 'X-API-Key': undefined } });

    await expect(sdk.getContractDomain('htr')).resolves.toBe('htr');
    expect(requests[0].headers).not.toHaveProperty('x-api-key');
  }, TIMEOUT);
});

describe('retries on view calls', () => {
  /** Fails the first `failures` requests with `status`, then answers normally. */
  function failFirst(failures: number, status: number) {
    const answer = handler;
    let seen = 0;
    handler = (req, res) => {
      if (seen++ < failures) {
        json(res, status, { success: false, error: 'try again' });
      } else {
        answer(req, res);
      }
    };
  }

  it('retries a rate-limited view call', async () => {
    failFirst(1, 429);

    await expect(newSdk().getContractDomain('htr')).resolves.toBe('htr');
    expect(requests).toHaveLength(2);
  }, TIMEOUT);

  it('retries a batch that hit a gateway error', async () => {
    failFirst(1, 503);

    await expect(newSdk().callMultiple([{ method: 'get_contract_domain' }], 'htr')).resolves.toEqual(['htr']);
    expect(requests).toHaveLength(2);
  }, TIMEOUT);

  it('gives up after the configured number of retries', async () => {
    failFirst(Infinity, 429);

    await expect(newSdk({ retries: 1 }).getContractDomain('htr')).rejects.toThrow('Node responded 429');
    expect(requests).toHaveLength(2);
  }, TIMEOUT);

  it('does not retry an error that will not go away', async () => {
    failFirst(Infinity, 400);

    await expect(newSdk().getContractDomain('htr')).rejects.toThrow('Node responded 400');
    expect(requests).toHaveLength(1);
  }, TIMEOUT);
});

describe('callMultipleSettled', () => {
  it('returns one result per call, in order, without failing the batch', async () => {
    handler = stateResponder({
      'get_contract_domain()': 'htr',
      'get_grace_period_days()': 30,
    });

    const results = await newSdk().callMultipleSettled([
      { method: 'get_contract_domain' },
      { method: 'get_manager_primary_name', params: ['bad'] },
      { method: 'get_grace_period_days' },
    ], 'htr');

    expect(results).toEqual([
      { ok: true, value: 'htr' },
      { ok: false, error: 'Unknown call get_manager_primary_name("bad")' },
      { ok: true, value: 30 },
    ]);
    expect(requests).toHaveLength(1);
  }, TIMEOUT);
});

describe('networks', () => {
  it('defaults to mainnet', () => {
    const sdk = new ThothIdSDK();

    expect(DEFAULT_NETWORK).toBe('mainnet');
    expect(sdk.network).toBe('mainnet');
    expect(sdk.nodeUrl).toBe(MAINNET_NODE_URL);
    expect(sdk.blueprintIds).toEqual(MAINNET_BLUEPRINT_IDS);
    expect(sdk.blueprintId).toBe(MAINNET_BLUEPRINT_IDS[0]);
  });

  it('uses the testnet node and blueprint when asked', () => {
    const sdk = new ThothIdSDK({ network: 'testnet' });

    expect(sdk.network).toBe('testnet');
    expect(sdk.nodeUrl).toBe(TESTNET_NODE_URL);
    expect(sdk.blueprintIds).toEqual(TESTNET_BLUEPRINT_IDS);
  });

  it('keeps the deprecated DEFAULT_* constants at their testnet values', () => {
    expect(DEFAULT_NODE_URL).toBe(TESTNET_NODE_URL);
    expect(DEFAULT_BLUEPRINT_ID).toBe(TESTNET_BLUEPRINT_IDS[0]);
    expect(NETWORKS[DEFAULT_NETWORK].nodeUrl).toBe(MAINNET_NODE_URL);
  });

  it('uses the mainnet node and every mainnet blueprint', () => {
    const sdk = new ThothIdSDK({ network: 'mainnet' });

    expect(sdk.network).toBe('mainnet');
    expect(sdk.nodeUrl).toBe(MAINNET_NODE_URL);
    expect(sdk.blueprintIds).toEqual(MAINNET_BLUEPRINT_IDS);
  });

  it('lets explicit options override the network defaults', () => {
    const sdk = new ThothIdSDK({ network: 'mainnet', nodeUrl: 'http://my-node', blueprintId: 'ab' });

    expect(sdk.nodeUrl).toBe('http://my-node');
    expect(sdk.blueprintIds).toEqual(['ab']);
    expect(new ThothIdSDK({ blueprintIds: ['a', 'b'], blueprintId: 'c' }).blueprintIds).toEqual(['a', 'b']);
  });

  it('rejects an unknown network', () => {
    expect(() => new ThothIdSDK({ network: 'devnet' as any })).toThrow('Unknown network "devnet"');
  });

  it('rejects an empty blueprint list', () => {
    expect(() => new ThothIdSDK({ blueprintIds: [] })).toThrow('At least one blueprint ID');
  });

  it('switches network and drops the map', () => {
    const sdk = new ThothIdSDK({ contractIds: { htr: CONTRACT_ID } });
    sdk.setNetwork('testnet');

    expect(sdk.nodeUrl).toBe(TESTNET_NODE_URL);
    expect(sdk.blueprintIds).toEqual(TESTNET_BLUEPRINT_IDS);
    expect(sdk.getDomains()).toEqual([]);
  });
});

describe('discovery across blueprint versions', () => {
  const OLD = '11'.repeat(32);
  const NEW = '22'.repeat(32);
  const id = (n: number) => String(n).padStart(64, '0');

  /**
   * `creations[blueprint]` lists that blueprint's contracts and `domains[id]`
   * their domain. A contract runs its creation blueprint unless `current[id]`
   * says it was upgraded to another one.
   */
  function nodeWith(
    creations: Record<string, Array<{ nano_contract_id: string; created_at?: number }>>,
    domains: Record<string, string>,
    current: Record<string, string> = {}
  ): Handler {
    return (req, res) => {
      const url = new URL(req.url!, baseUrl);
      const id = url.searchParams.get('id')!;
      if (url.pathname.endsWith('/creation')) {
        json(res, 200, { success: true, nc_creation_txs: creations[url.searchParams.get('search')!] ?? [], has_more: false });
      } else if (url.pathname.endsWith('/history')) {
        json(res, 200, { success: true, history: [{ nc_method: 'initialize', nc_args_decoded: [domains[id]] }] });
      } else {
        const createdFrom = Object.keys(creations).find((bp) => creations[bp].some((tx) => tx.nano_contract_id === id));
        json(res, 200, { success: true, blueprint_id: current[id] ?? createdFrom, calls: {} });
      }
    };
  }

  function newDiscoverySdk() {
    return new ThothIdSDK({ nodeUrl: `${baseUrl}/v1a/nano_contract/state`, blueprintIds: [OLD, NEW] });
  }

  it('searches every blueprint and merges the registries', async () => {
    handler = nodeWith(
      { [OLD]: [{ nano_contract_id: id(1), created_at: 100 }], [NEW]: [{ nano_contract_id: id(2), created_at: 200 }] },
      { [id(1)]: 'htr', [id(2)]: 'tst' }
    );

    await expect(newDiscoverySdk().loadContractIds()).resolves.toEqual({ htr: id(1), tst: id(2) });
    const searched = requests
      .map((req) => new URL(req.url!, baseUrl))
      .filter((url) => url.pathname.endsWith('/creation'))
      .map((url) => url.searchParams.get('search'));
    expect(searched).toEqual([OLD, NEW]);
  }, TIMEOUT);

  it('gives a domain to its oldest registry, whatever blueprint it came from', async () => {
    // Listed under the newer blueprint first, but created earlier.
    handler = nodeWith(
      { [OLD]: [{ nano_contract_id: id(1), created_at: 300 }], [NEW]: [{ nano_contract_id: id(2), created_at: 100 }] },
      { [id(1)]: 'htr', [id(2)]: 'htr' }
    );

    await expect(newDiscoverySdk().loadContractIds()).resolves.toEqual({ htr: id(2) });
  }, TIMEOUT);

  it('tolerates a blueprint with no contracts yet', async () => {
    handler = nodeWith({ [OLD]: [{ nano_contract_id: id(1), created_at: 100 }] }, { [id(1)]: 'htr' });

    await expect(newDiscoverySdk().loadContractIds()).resolves.toEqual({ htr: id(1) });
  }, TIMEOUT);
});

describe('blocking registries upgraded to an untrusted blueprint', () => {
  const TRUSTED = '11'.repeat(32);
  const TRUSTED_NEXT = '22'.repeat(32);
  const ROGUE = 'ee'.repeat(32);
  const id = (n: number) => String(n).padStart(64, '0');

  /** `contracts` in creation order: [id, domain, blueprint it runs now]. */
  function nodeWith(contracts: Array<[string, string, string]>): Handler {
    return (req, res) => {
      const url = new URL(req.url!, baseUrl);
      const contract = contracts.find(([cid]) => cid === url.searchParams.get('id'));
      if (url.pathname.endsWith('/creation')) {
        const txs = url.searchParams.get('search') === TRUSTED
          ? contracts.map(([cid], i) => ({ nano_contract_id: cid, created_at: 100 + i }))
          : [];
        json(res, 200, { success: true, nc_creation_txs: txs, has_more: false });
      } else if (url.pathname.endsWith('/history')) {
        json(res, 200, { success: true, history: [{ nc_method: 'initialize', nc_args_decoded: [contract![1]] }] });
      } else if (url.searchParams.getAll('calls[]').length === 0) {
        json(res, 200, { success: true, blueprint_id: contract![2], calls: {} });
      } else {
        stateResponder({ 'get_contract_domain()': contract![1] })(req, res);
      }
    };
  }

  function newDiscoverySdk() {
    return new ThothIdSDK({ nodeUrl: `${baseUrl}/v1a/nano_contract/state`, blueprintIds: [TRUSTED, TRUSTED_NEXT] });
  }

  it('keeps a registry upgraded to another trusted version', async () => {
    handler = nodeWith([[id(1), 'htr', TRUSTED_NEXT]]);
    const sdk = newDiscoverySdk();

    await expect(sdk.loadContractIds()).resolves.toEqual({ htr: id(1) });
    expect(sdk.getBlockedDomains()).toEqual({});
    await expect(sdk.getContractDomain('htr')).resolves.toBe('htr');
  }, TIMEOUT);

  it('blocks a domain whose first registry now runs an untrusted blueprint', async () => {
    handler = nodeWith([[id(1), 'xyz', ROGUE]]);
    const sdk = newDiscoverySdk();

    await expect(sdk.loadContractIds()).resolves.toEqual({});
    expect(sdk.getBlockedDomains()).toEqual({ xyz: { contractId: id(1), blueprintId: ROGUE } });
    await expect(sdk.resolveName('alice.xyz')).rejects.toThrow(
      `the ".xyz" domain is registered by contract ${id(1)}, which now runs blueprint ${ROGUE}`
    );
  }, TIMEOUT);

  it('does not hand a blocked domain to the next contract claiming it', async () => {
    handler = nodeWith([
      [id(1), 'xyz', ROGUE],
      [id(2), 'xyz', TRUSTED],
      [id(3), 'htr', TRUSTED],
    ]);
    const sdk = newDiscoverySdk();

    await expect(sdk.loadContractIds()).resolves.toEqual({ htr: id(3) });
    expect(sdk.getBlockedDomains()).toEqual({ xyz: { contractId: id(1), blueprintId: ROGUE } });
  }, TIMEOUT);

  it('checks the current blueprint of first claimants only', async () => {
    handler = nodeWith([
      [id(1), 'htr', TRUSTED],
      [id(2), 'htr', ROGUE],
    ]);
    const sdk = newDiscoverySdk();

    await expect(sdk.loadContractIds()).resolves.toEqual({ htr: id(1) });
    // The later `htr` claim loses on age, so its blueprint is never asked for.
    expect(sdk.getBlockedDomains()).toEqual({});
    const stateRequests = requests.filter((req) => new URL(req.url!, baseUrl).pathname.endsWith('/state'));
    expect(stateRequests.map((req) => new URL(req.url!, baseUrl).searchParams.get('id'))).toEqual([id(1)]);
  }, TIMEOUT);

  it('trusts a blueprint once it is added to blueprintIds', async () => {
    handler = nodeWith([[id(1), 'xyz', ROGUE]]);
    const sdk = new ThothIdSDK({
      nodeUrl: `${baseUrl}/v1a/nano_contract/state`,
      blueprintIds: [TRUSTED, TRUSTED_NEXT, ROGUE],
    });

    await expect(sdk.loadContractIds()).resolves.toEqual({ xyz: id(1) });
    expect(sdk.getBlockedDomains()).toEqual({});
  }, TIMEOUT);

  it('forgets blocked domains when the map is replaced', async () => {
    handler = nodeWith([[id(1), 'xyz', ROGUE]]);
    const sdk = newDiscoverySdk();
    await sdk.loadContractIds();

    sdk.setContractIds({ htr: id(9) });
    expect(sdk.getBlockedDomains()).toEqual({});
  }, TIMEOUT);
});
