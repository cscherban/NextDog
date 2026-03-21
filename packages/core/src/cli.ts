import { createServer } from './server.js';
import { homedir } from 'node:os';
import { join } from 'node:path';

const DEFAULT_PORT = 6789;
const DEFAULT_DATA_DIR = join(homedir(), '.nextdog', 'data');

async function main() {
  const url = process.env.NEXTDOG_URL ?? `http://localhost:${DEFAULT_PORT}`;
  const parsed = new URL(url);
  const port = Number(parsed.port) || DEFAULT_PORT;
  const host = parsed.hostname;
  const dataDir = process.env.NEXTDOG_DATA_DIR ?? DEFAULT_DATA_DIR;

  const server = await createServer({ port, host, dataDir });
  console.log(`[nextdog] sidecar running at http://${host}:${port}`);
  console.log(`[nextdog] data dir: ${dataDir}`);

  process.on('SIGINT', () => {
    console.log('\n[nextdog] shutting down...');
    server.close(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    server.close(() => process.exit(0));
  });
}

main().catch(err => {
  console.error('[nextdog] failed to start:', err);
  process.exit(1);
});
