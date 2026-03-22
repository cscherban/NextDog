import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, open } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';

const NEXTDOG_DIR = join(homedir(), '.nextdog');
const PID_FILE = join(NEXTDOG_DIR, 'nextdog.pid');
const LOG_FILE = join(NEXTDOG_DIR, 'sidecar.log');

async function isHealthy(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${url}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

async function isProcessRunning(pid: number): Promise<boolean> {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function readPid(): Promise<number | null> {
  try {
    const content = await readFile(PID_FILE, 'utf-8');
    const pid = Number(content.trim());
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

function resolveCoreCliPath(): string {
  const require = createRequire(import.meta.url);
  try {
    const corePkgPath = require.resolve('@nextdog/core/package.json');
    return join(dirname(corePkgPath), 'dist', 'cli.js');
  } catch {
    // Fallback: try resolving the bin entry directly
    try {
      return require.resolve('@nextdog/core/dist/cli.js');
    } catch {
      throw new Error(
        '@nextdog/core not found. Make sure it is installed: npm install @nextdog/core'
      );
    }
  }
}

async function spawnSidecar(url: string): Promise<void> {
  const coreCliPath = resolveCoreCliPath();

  await mkdir(NEXTDOG_DIR, { recursive: true });

  // Write sidecar stdout/stderr to a log file for debugging
  const logFd = await open(LOG_FILE, 'a');

  const child = spawn('node', [coreCliPath], {
    detached: true,
    stdio: ['ignore', logFd.fd, logFd.fd],
    env: { ...process.env, NEXTDOG_URL: url },
  });
  child.unref();

  // Close our handle — the child process has its own fd now
  await logFd.close();

  if (child.pid) {
    await writeFile(PID_FILE, String(child.pid), 'utf-8');
  }

  // Wait for the sidecar to become healthy (up to 3 seconds)
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 500));
    if (await isHealthy(url)) return;
  }

  console.warn(`[nextdog] sidecar spawned (PID ${child.pid}) but health check not passing yet`);
  console.warn(`[nextdog] check ${LOG_FILE} for sidecar logs`);
}

export async function ensureSidecar(url: string): Promise<void> {
  // Already running and healthy — fast path
  if (await isHealthy(url)) return;

  // PID file exists and process is alive — wait for it to become healthy
  const pid = await readPid();
  if (pid && await isProcessRunning(pid)) {
    for (let i = 0; i < 4; i++) {
      await new Promise(r => setTimeout(r, 500));
      if (await isHealthy(url)) return;
    }
    console.warn(`[nextdog] sidecar process ${pid} is running but not responding at ${url}`);
    console.warn(`[nextdog] check ${LOG_FILE} for sidecar logs`);
    return;
  }

  // No sidecar running — spawn one
  try {
    await spawnSidecar(url);
  } catch (err) {
    console.warn('[nextdog] failed to spawn sidecar:', (err as Error).message);
    console.warn('[nextdog] you can start it manually with: npx nextdog');
  }
}
