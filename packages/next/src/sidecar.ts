import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { createRequire } from 'node:module';

const NEXTDOG_DIR = join(homedir(), '.nextdog');
const PID_FILE = join(NEXTDOG_DIR, 'nextdog.pid');

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

async function spawnSidecar(url: string): Promise<void> {
  const require = createRequire(import.meta.url);
  const corePkgPath = require.resolve('@nextdog/core/package.json');
  const coreCliPath = join(dirname(corePkgPath), 'dist', 'cli.js');

  await mkdir(NEXTDOG_DIR, { recursive: true });

  const child = spawn('node', [coreCliPath], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, NEXTDOG_URL: url },
  });
  child.unref();

  if (child.pid) {
    await writeFile(PID_FILE, String(child.pid), 'utf-8');
  }
  await new Promise(r => setTimeout(r, 1000));
}

export async function ensureSidecar(url: string): Promise<void> {
  if (await isHealthy(url)) return;

  const pid = await readPid();
  if (pid && await isProcessRunning(pid)) {
    await new Promise(r => setTimeout(r, 1000));
    if (await isHealthy(url)) return;
  }

  try {
    await spawnSidecar(url);
  } catch (err) {
    console.warn('[nextdog] failed to spawn sidecar:', err);
  }
}
