import { ThothIdSDK } from '../src/index';
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
      } else {
        json(res, 200, { success: true, history: [{ nc_method: 'initialize', nc_args_decoded: ['htr'] }] });
      }
    };
    const sdk = new ThothIdSDK({
      nodeUrl: `${baseUrl}/v1a/nano_contract/state`,
      headers: { 'X-API-Key': 'secret' },
    });

    await expect(sdk.loadContractIds()).resolves.toEqual({ htr: CONTRACT_ID });
    expect(requests).toHaveLength(2);
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
