import * as fs from 'fs';
import * as path from 'path';

/**
 * Expected on-chain state of each network the live suites run against, one
 * file per network in `tests/config`. `THOTH_NETWORK` narrows the run to a
 * comma-separated subset, e.g. `THOTH_NETWORK=mainnet`.
 */
const configDir = path.resolve(__dirname, 'config');

const all: any[] = fs
  .readdirSync(configDir)
  .filter((file) => file.endsWith('.json'))
  .sort()
  .map((file) => JSON.parse(fs.readFileSync(path.join(configDir, file), 'utf-8')));

const wanted = (process.env.THOTH_NETWORK ?? '')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);

for (const name of wanted) {
  if (!all.some((config) => config.network === name)) {
    throw new Error(`THOTH_NETWORK names "${name}", but tests/config has no ${name}.json`);
  }
}

export const networks: any[] =
  wanted.length > 0 ? all.filter((config) => wanted.includes(config.network)) : all;
