import { createServer } from './server.js';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { stat } from 'node:fs/promises';
import { createRequire } from 'node:module';

const DEFAULT_PORT = 6789;
const DEFAULT_DATA_DIR = join(homedir(), '.nextdog', 'data');

async function resolveUiDir(): Promise<string | undefined> {
  try {
    const require = createRequire(import.meta.url);
    const uiPkgPath = require.resolve('@nextdog/ui/package.json');
    const uiDir = join(dirname(uiPkgPath), 'dist');
    const s = await stat(uiDir);
    if (s.isDirectory()) return uiDir;
  } catch {
    // UI package not installed or not built
  }
  return undefined;
}

async function main() {
  const url = process.env.NEXTDOG_URL ?? `http://localhost:${DEFAULT_PORT}`;
  const parsed = new URL(url);
  const port = Number(parsed.port) || DEFAULT_PORT;
  const host = parsed.hostname;
  const dataDir = process.env.NEXTDOG_DATA_DIR ?? DEFAULT_DATA_DIR;
  const uiDir = process.env.NEXTDOG_UI_DIR ?? await resolveUiDir();

  const server = await createServer({ port, host, dataDir, uiDir });
  console.log(`[nextdog] sidecar running at http://${host}:${port}`);
  console.log(`[nextdog] data dir: ${dataDir}`);
  if (uiDir) {
    console.log(`[nextdog] UI served from: ${uiDir}`);
  } else {
    console.log(`[nextdog] UI not available (run pnpm build in @nextdog/ui)`);
  }

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
