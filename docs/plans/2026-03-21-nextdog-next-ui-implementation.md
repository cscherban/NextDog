# NextDog v1 — @nextdog/next + @nextdog/ui Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Next.js instrumentation plugin (`@nextdog/next`) and the Preact dashboard UI (`@nextdog/ui`), then wire them into the existing sidecar so the full stack works end-to-end.

**Architecture:** `@nextdog/next` hooks into Next.js's OTel-based instrumentation to capture spans and POST them to the sidecar. `@nextdog/ui` is a Preact SPA that connects to the sidecar via SSE for live data and REST for queries. The sidecar (`@nextdog/core`) gets static file serving + SPA fallback added to serve the UI.

**Tech Stack:** TypeScript (strict), OTel SDK (`@opentelemetry/*`), Preact + preact-router, Vite, Vitest.

---

### Task 1: Add Static File Serving + SPA Fallback to Core Sidecar

**Files:**
- Modify: `packages/core/src/server.ts`
- Test: `packages/core/src/__tests__/server.test.ts`

The sidecar needs to serve the UI bundle. Add static file serving with MIME type detection and SPA fallback (non-file, non-API routes return `index.html`).

**Step 1: Write the failing tests**

Add these tests to the existing server test file:

```ts
// Add to packages/core/src/__tests__/server.test.ts
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Add new describe block after existing tests:
describe('Server static files', () => {
  let server: Server;
  let dataDir: string;
  let uiDir: string;
  const port = 16790;

  beforeEach(async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'nextdog-data-'));
    uiDir = await mkdtemp(join(tmpdir(), 'nextdog-ui-'));
    await writeFile(join(uiDir, 'index.html'), '<html><body>NextDog</body></html>');
    await mkdir(join(uiDir, 'assets'), { recursive: true });
    await writeFile(join(uiDir, 'assets', 'app.js'), 'console.log("app")');
    await writeFile(join(uiDir, 'assets', 'style.css'), 'body { color: white }');
  });

  afterEach(async () => {
    if (server) await new Promise<void>(r => server.close(() => r()));
    await rm(dataDir, { recursive: true });
    await rm(uiDir, { recursive: true });
  });

  it('serves static files with correct content-type', async () => {
    server = await createServer({ port, dataDir, uiDir });
    const jsRes = await fetch(`http://localhost:${port}/assets/app.js`);
    expect(jsRes.status).toBe(200);
    expect(jsRes.headers.get('content-type')).toContain('javascript');

    const cssRes = await fetch(`http://localhost:${port}/assets/style.css`);
    expect(cssRes.status).toBe(200);
    expect(cssRes.headers.get('content-type')).toContain('css');
  });

  it('SPA fallback serves index.html for unknown paths', async () => {
    server = await createServer({ port, dataDir, uiDir });
    const res = await fetch(`http://localhost:${port}/requests`);
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain('NextDog');
  });

  it('returns 404 for API routes that dont exist', async () => {
    server = await createServer({ port, dataDir, uiDir });
    const res = await fetch(`http://localhost:${port}/api/unknown`);
    expect(res.status).toBe(404);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test src/__tests__/server.test.ts`
Expected: FAIL — `uiDir` is not a valid option / static files not served

**Step 3: Update ServerOptions and add static serving**

Update `packages/core/src/server.ts`:

Add to `ServerOptions`:
```ts
export interface ServerOptions {
  port: number;
  host?: string;
  dataDir: string;
  uiDir?: string;
}
```

Add MIME type map and static file handler before the 404 fallback:
```ts
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};
```

Replace the 404 handler at the end of the request handler with:
```ts
    // Static file serving (UI)
    if (opts.uiDir) {
      const filePath = join(opts.uiDir, pathname === '/' ? 'index.html' : pathname);
      try {
        const fileStat = await stat(filePath);
        if (fileStat.isFile()) {
          const ext = extname(filePath);
          const contentType = MIME_TYPES[ext] || 'application/octet-stream';
          const content = await readFile(filePath);
          res.writeHead(200, {
            'Content-Type': contentType,
            'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
            'Access-Control-Allow-Origin': '*',
          });
          return res.end(content);
        }
      } catch {
        // File not found — fall through to SPA fallback
      }

      // SPA fallback: serve index.html for non-API routes
      if (!pathname.startsWith('/api/') && !pathname.startsWith('/v1/')) {
        try {
          const indexPath = join(opts.uiDir, 'index.html');
          const content = await readFile(indexPath);
          res.writeHead(200, {
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
          });
          return res.end(content);
        } catch {
          // No index.html
        }
      }
    }

    // 404
    json(res, 404, { error: 'not found' });
```

**Step 4: Run tests to verify they pass**

Run: `cd packages/core && pnpm test`
Expected: ALL PASS (existing + new static file tests)

**Step 5: Commit**

```bash
git add packages/core/src/server.ts packages/core/src/__tests__/server.test.ts
git commit -m "add static file serving with SPA fallback to sidecar"
```

---

### Task 2: @nextdog/next — Package Setup + withNextDog()

**Files:**
- Modify: `packages/next/package.json`
- Modify: `packages/next/tsconfig.json`
- Modify: `packages/next/src/index.ts`
- Create: `packages/next/src/__tests__/with-nextdog.test.ts`

**Step 1: Update package.json with dependencies**

```json
{
  "name": "@nextdog/next",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./register": "./dist/register.js"
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "@nextdog/core": "workspace:*",
    "@opentelemetry/api": "^1",
    "@opentelemetry/sdk-trace-node": "^1",
    "@opentelemetry/resources": "^1",
    "@opentelemetry/semantic-conventions": "^1"
  },
  "devDependencies": {
    "@types/node": "^25",
    "vitest": "^3"
  }
}
```

Update `packages/next/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["src/__tests__"]
}
```

**Step 2: Write the failing test**

```ts
// packages/next/src/__tests__/with-nextdog.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { withNextDog } from '../index.js';

describe('withNextDog', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('enables instrumentation hook in development', () => {
    process.env.NODE_ENV = 'development';
    const config = withNextDog({ reactStrictMode: true });

    expect(config.experimental).toEqual(
      expect.objectContaining({ instrumentationHook: true })
    );
    expect(config.env).toEqual(
      expect.objectContaining({
        NEXTDOG_URL: 'http://localhost:6789',
      })
    );
    expect(config.env.NEXTDOG_SERVICE_NAME).toBeDefined();
    expect(config.reactStrictMode).toBe(true);
  });

  it('passes config through unchanged in production', () => {
    process.env.NODE_ENV = 'production';
    const input = { reactStrictMode: true, images: { domains: ['example.com'] } };
    const config = withNextDog(input);

    expect(config).toEqual(input);
    expect(config.experimental).toBeUndefined();
  });

  it('allows custom service name', () => {
    process.env.NODE_ENV = 'development';
    const config = withNextDog({ reactStrictMode: true }, { serviceName: 'my-api' });

    expect(config.env.NEXTDOG_SERVICE_NAME).toBe('my-api');
  });

  it('allows custom sidecar URL', () => {
    process.env.NODE_ENV = 'development';
    const config = withNextDog({}, { url: 'http://localhost:9999' });

    expect(config.env.NEXTDOG_URL).toBe('http://localhost:9999');
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd packages/next && pnpm test`
Expected: FAIL — withNextDog doesn't accept options or set experimental

**Step 4: Implement withNextDog**

```ts
// packages/next/src/index.ts
export interface NextDogOptions {
  serviceName?: string;
  url?: string;
}

interface NextConfig {
  experimental?: Record<string, unknown>;
  env?: Record<string, string>;
  [key: string]: unknown;
}

export function withNextDog(config: NextConfig, options?: NextDogOptions): NextConfig {
  if (process.env.NODE_ENV !== 'development') {
    return config;
  }

  const url = options?.url ?? 'http://localhost:6789';
  const serviceName = options?.serviceName ?? 'nextdog-app';

  return {
    ...config,
    experimental: {
      ...config.experimental,
      instrumentationHook: true,
    },
    env: {
      ...config.env,
      NEXTDOG_URL: url,
      NEXTDOG_SERVICE_NAME: serviceName,
    },
  };
}
```

**Step 5: Run test to verify it passes**

Run: `cd packages/next && pnpm test`
Expected: PASS (4 tests)

**Step 6: Install dependencies and verify build**

Run: `pnpm install` (from root)

**Step 7: Commit**

```bash
git add packages/next/
git commit -m "add withNextDog() config plugin with dev-only instrumentation setup"
```

---

### Task 3: @nextdog/next — NextDogExporter

**Files:**
- Create: `packages/next/src/exporter.ts`
- Create: `packages/next/src/__tests__/exporter.test.ts`

**Step 1: Write the failing test**

```ts
// packages/next/src/__tests__/exporter.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextDogExporter } from '../exporter.js';

// Mock fetch globally
const mockFetch = vi.fn();

describe('NextDogExporter', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockResolvedValue({ ok: true, status: 202 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports spans by POSTing to sidecar', async () => {
    const exporter = new NextDogExporter('http://localhost:6789');

    const mockSpan = {
      name: 'GET /api/users',
      spanContext: () => ({
        traceId: 'abc123',
        spanId: 'def456',
        traceFlags: 1,
      }),
      parentSpanId: undefined,
      kind: 1, // SpanKind.SERVER
      startTime: [1711000000, 0] as [number, number],
      endTime: [1711000000, 50000000] as [number, number],
      attributes: { 'http.method': 'GET' },
      status: { code: 0 }, // SpanStatusCode.UNSET
      resource: {
        attributes: { 'service.name': 'my-app' },
      },
      duration: [0, 50000000] as [number, number],
      events: [],
      links: [],
      instrumentationLibrary: { name: 'test' },
      ended: true,
      droppedAttributesCount: 0,
      droppedEventsCount: 0,
      droppedLinksCount: 0,
    };

    const result = await new Promise<{ code: number }>((resolve) => {
      exporter.export([mockSpan as any], (result) => resolve(result));
    });

    expect(result.code).toBe(0); // ExportResultCode.SUCCESS
    expect(mockFetch).toHaveBeenCalledOnce();

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:6789/v1/spans');
    expect(opts.method).toBe('POST');

    const body = JSON.parse(opts.body);
    expect(body.spans).toHaveLength(1);
    expect(body.spans[0].traceId).toBe('abc123');
    expect(body.spans[0].name).toBe('GET /api/users');
    expect(body.spans[0].serviceName).toBe('my-app');
  });

  it('handles export failure gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('connection refused'));
    const exporter = new NextDogExporter('http://localhost:6789');

    const result = await new Promise<{ code: number }>((resolve) => {
      exporter.export([{
        name: 'test',
        spanContext: () => ({ traceId: 't1', spanId: 's1', traceFlags: 1 }),
        parentSpanId: undefined,
        kind: 0,
        startTime: [0, 0] as [number, number],
        endTime: [0, 0] as [number, number],
        attributes: {},
        status: { code: 0 },
        resource: { attributes: {} },
        duration: [0, 0] as [number, number],
        events: [],
        links: [],
        instrumentationLibrary: { name: 'test' },
        ended: true,
        droppedAttributesCount: 0,
        droppedEventsCount: 0,
        droppedLinksCount: 0,
      } as any], (result) => resolve(result));
    });

    expect(result.code).toBe(1); // ExportResultCode.FAILED
  });

  it('shutdown resolves cleanly', async () => {
    const exporter = new NextDogExporter('http://localhost:6789');
    await expect(exporter.shutdown()).resolves.toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/next && pnpm test`
Expected: FAIL — cannot find module `../exporter.js`

**Step 3: Implement NextDogExporter**

```ts
// packages/next/src/exporter.ts
import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-node';
import type { ExportResult } from '@opentelemetry/core';

const ExportResultCode = { SUCCESS: 0, FAILED: 1 } as const;

const SPAN_KIND_MAP: Record<number, string> = {
  0: 'INTERNAL',
  1: 'SERVER',
  2: 'CLIENT',
  3: 'PRODUCER',
  4: 'CONSUMER',
};

const STATUS_CODE_MAP: Record<number, string> = {
  0: 'UNSET',
  1: 'OK',
  2: 'ERROR',
};

function hrtimeToNano(hrtime: [number, number]): string {
  const [seconds, nanos] = hrtime;
  return String(BigInt(seconds) * 1_000_000_000n + BigInt(nanos));
}

function convertSpan(span: ReadableSpan) {
  const ctx = span.spanContext();
  const serviceName =
    (span.resource?.attributes?.['service.name'] as string) ?? 'unknown';

  return {
    traceId: ctx.traceId,
    spanId: ctx.spanId,
    parentSpanId: span.parentSpanId || undefined,
    name: span.name,
    kind: SPAN_KIND_MAP[span.kind] ?? 'INTERNAL',
    startTimeUnixNano: hrtimeToNano(span.startTime),
    endTimeUnixNano: hrtimeToNano(span.endTime),
    attributes: span.attributes as Record<string, string | number | boolean>,
    status: {
      code: STATUS_CODE_MAP[span.status.code] ?? 'UNSET',
      message: span.status.message,
    },
    serviceName,
  };
}

export class NextDogExporter implements SpanExporter {
  constructor(private url: string) {}

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    const converted = spans.map(convertSpan);

    fetch(`${this.url}/v1/spans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spans: converted }),
    })
      .then(() => resultCallback({ code: ExportResultCode.SUCCESS }))
      .catch(() => resultCallback({ code: ExportResultCode.FAILED }));
  }

  async shutdown(): Promise<void> {
    // Nothing to flush — fetch calls are fire-and-forget
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/next && pnpm test`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add packages/next/src/exporter.ts packages/next/src/__tests__/exporter.test.ts
git commit -m "add NextDogExporter: converts OTel spans and POSTs to sidecar"
```

---

### Task 4: @nextdog/next — Sidecar Lifecycle Manager

**Files:**
- Create: `packages/next/src/sidecar.ts`
- Create: `packages/next/src/__tests__/sidecar.test.ts`

**Step 1: Write the failing test**

```ts
// packages/next/src/__tests__/sidecar.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ensureSidecar } from '../sidecar.js';

const mockFetch = vi.fn();

describe('ensureSidecar', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns immediately if health check passes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' }),
    });

    await ensureSidecar('http://localhost:6789');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:6789/health',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('does not throw if health check fails (sidecar will be spawned)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('connection refused'));

    // Should not throw — it will attempt to spawn
    // In test we can't actually spawn, so we just verify it doesn't crash
    await expect(ensureSidecar('http://localhost:6789')).resolves.not.toThrow();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/next && pnpm test`
Expected: FAIL — cannot find module `../sidecar.js`

**Step 3: Implement sidecar lifecycle**

```ts
// packages/next/src/sidecar.ts
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  // Find the core CLI path
  const coreCliPath = join(
    dirname(fileURLToPath(import.meta.resolve('@nextdog/core'))),
    'cli.js'
  );

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

  // Wait briefly for sidecar to start
  await new Promise(r => setTimeout(r, 1000));
}

export async function ensureSidecar(url: string): Promise<void> {
  // 1. Health check
  if (await isHealthy(url)) return;

  // 2. PID file check
  const pid = await readPid();
  if (pid && await isProcessRunning(pid)) {
    // Process running but not healthy yet — wait and retry
    await new Promise(r => setTimeout(r, 1000));
    if (await isHealthy(url)) return;
  }

  // 3. Spawn
  try {
    await spawnSidecar(url);
  } catch (err) {
    console.warn('[nextdog] failed to spawn sidecar:', err);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/next && pnpm test`
Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add packages/next/src/sidecar.ts packages/next/src/__tests__/sidecar.test.ts
git commit -m "add sidecar lifecycle: health check, PID fallback, auto-spawn"
```

---

### Task 5: @nextdog/next — register.ts (Instrumentation Hook)

**Files:**
- Create: `packages/next/src/register.ts`
- Create: `packages/next/src/__tests__/register.test.ts`

**Step 1: Write the failing test**

```ts
// packages/next/src/__tests__/register.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';

describe('register', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    vi.restoreAllMocks();
  });

  it('does nothing in production', async () => {
    process.env.NODE_ENV = 'production';

    // Mock the OTel imports to verify they're NOT called
    vi.mock('@opentelemetry/sdk-trace-node', () => ({
      NodeTracerProvider: vi.fn(),
      BatchSpanProcessor: vi.fn(),
    }));

    const module = await import('../register.js');
    // In production, the module should export but not register anything
    // We verify by checking that NodeTracerProvider was never instantiated
    const { NodeTracerProvider } = await import('@opentelemetry/sdk-trace-node');
    expect(NodeTracerProvider).not.toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/next && pnpm test`
Expected: FAIL — cannot find module `../register.js`

**Step 3: Implement register.ts**

```ts
// packages/next/src/register.ts
if (process.env.NODE_ENV === 'development') {
  const { NodeTracerProvider, BatchSpanProcessor } = await import(
    '@opentelemetry/sdk-trace-node'
  );
  const { Resource } = await import('@opentelemetry/resources');
  const { ATTR_SERVICE_NAME } = await import(
    '@opentelemetry/semantic-conventions'
  );
  const { NextDogExporter } = await import('./exporter.js');
  const { ensureSidecar } = await import('./sidecar.js');

  const url = process.env.NEXTDOG_URL ?? 'http://localhost:6789';
  const serviceName = process.env.NEXTDOG_SERVICE_NAME ?? 'nextdog-app';

  // Ensure sidecar is running before registering
  await ensureSidecar(url);

  const provider = new NodeTracerProvider({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
    }),
    spanProcessors: [
      new BatchSpanProcessor(new NextDogExporter(url)),
    ],
  });

  provider.register();

  console.log(`[nextdog] instrumentation registered for "${serviceName}" → ${url}`);
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/next && pnpm test`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/next/src/register.ts packages/next/src/__tests__/register.test.ts
git commit -m "add register.ts instrumentation hook with OTel provider setup"
```

---

### Task 6: @nextdog/ui — Scaffold Preact + Vite App

**Files:**
- Modify: `packages/ui/package.json`
- Modify: `packages/ui/tsconfig.json`
- Create: `packages/ui/vite.config.ts`
- Create: `packages/ui/index.html`
- Create: `packages/ui/src/index.tsx`
- Create: `packages/ui/src/app.tsx`
- Create: `packages/ui/src/styles/index.css`

**Step 1: Update package.json**

```json
{
  "name": "@nextdog/ui",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run --passWithNoTests"
  },
  "dependencies": {
    "preact": "^10",
    "preact-router": "^4"
  },
  "devDependencies": {
    "@preact/preset-vite": "^2",
    "vite": "^6",
    "vitest": "^3"
  }
}
```

**Step 2: Update tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "jsx": "react-jsx",
    "jsxImportSource": "preact"
  },
  "include": ["src"]
}
```

**Step 3: Create vite.config.ts**

```ts
// packages/ui/vite.config.ts
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  build: {
    outDir: 'dist',
    emptyDir: true,
  },
});
```

**Step 4: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NextDog</title>
  <link rel="stylesheet" href="/src/styles/index.css" />
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/index.tsx"></script>
</body>
</html>
```

**Step 5: Create base CSS (dark theme)**

```css
/* packages/ui/src/styles/index.css */
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg: #0a0a0a;
  --bg-surface: #141414;
  --bg-hover: #1a1a1a;
  --border: #2a2a2a;
  --text: #e0e0e0;
  --text-dim: #888;
  --text-bright: #fff;
  --accent: #6c5ce7;
  --green: #00b894;
  --yellow: #fdcb6e;
  --red: #e17055;
  --blue: #74b9ff;
  --mono: 'SF Mono', 'Cascadia Code', 'Fira Code', monospace;
  --sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

body {
  font-family: var(--sans);
  background: var(--bg);
  color: var(--text);
  font-size: 13px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

a {
  color: var(--accent);
  text-decoration: none;
}

/* Layout */
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-surface);
}

.header h1 {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-bright);
}

.nav {
  display: flex;
  gap: 4px;
}

.nav a {
  padding: 4px 12px;
  border-radius: 4px;
  color: var(--text-dim);
  font-size: 12px;
  font-weight: 500;
}

.nav a:hover,
.nav a.active {
  color: var(--text-bright);
  background: var(--bg-hover);
}

.main {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Service pills */
.service-pills {
  display: flex;
  gap: 6px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}

.pill {
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  border: 1px solid var(--border);
  cursor: pointer;
  background: transparent;
  color: var(--text-dim);
}

.pill.active {
  background: var(--accent);
  border-color: var(--accent);
  color: white;
}

/* Event rows */
.event-list {
  flex: 1;
  overflow-y: auto;
  font-family: var(--mono);
  font-size: 12px;
}

.event-row {
  display: grid;
  grid-template-columns: 90px 80px 1fr 70px 50px;
  gap: 12px;
  padding: 4px 16px;
  border-bottom: 1px solid var(--border);
  align-items: center;
  cursor: pointer;
}

.event-row:hover {
  background: var(--bg-hover);
}

.timestamp { color: var(--text-dim); }
.service { color: var(--blue); }
.route { color: var(--text); }
.duration { color: var(--text-dim); text-align: right; }
.status-ok { color: var(--green); }
.status-error { color: var(--red); }
.status-warn { color: var(--yellow); }

/* Search bar */
.search-bar {
  padding: 8px 16px;
  border-bottom: 1px solid var(--border);
}

.search-bar input {
  width: 100%;
  padding: 6px 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text);
  font-family: var(--mono);
  font-size: 12px;
  outline: none;
}

.search-bar input:focus {
  border-color: var(--accent);
}

/* Waterfall */
.waterfall {
  padding: 16px;
}

.waterfall-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0;
  font-family: var(--mono);
  font-size: 12px;
}

.waterfall-label {
  width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text);
}

.waterfall-bar-container {
  flex: 1;
  height: 20px;
  position: relative;
}

.waterfall-bar {
  position: absolute;
  height: 100%;
  border-radius: 2px;
  min-width: 2px;
}

.waterfall-duration {
  width: 70px;
  text-align: right;
  color: var(--text-dim);
}

/* Requests table */
.requests-table {
  width: 100%;
}

.request-row {
  display: grid;
  grid-template-columns: 60px 1fr 60px 80px 100px;
  gap: 12px;
  padding: 6px 16px;
  border-bottom: 1px solid var(--border);
  align-items: center;
  cursor: pointer;
  font-family: var(--mono);
  font-size: 12px;
}

.request-row:hover {
  background: var(--bg-hover);
}

.method { font-weight: 600; }
.method-get { color: var(--green); }
.method-post { color: var(--blue); }
.method-put { color: var(--yellow); }
.method-delete { color: var(--red); }

/* Empty state */
.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--text-dim);
  font-size: 14px;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
```

**Step 6: Create Preact app entry + shell**

```tsx
// packages/ui/src/index.tsx
import { render } from 'preact';
import { App } from './app.js';

render(<App />, document.getElementById('app')!);
```

```tsx
// packages/ui/src/app.tsx
import Router from 'preact-router';
import { useState, useCallback } from 'preact/hooks';

// Placeholder views — implemented in later tasks
function LiveTail() {
  return <div class="empty">Live Tail — coming soon</div>;
}

function Requests() {
  return <div class="empty">Requests — coming soon</div>;
}

function Trace({ traceId }: { traceId?: string }) {
  return <div class="empty">Trace {traceId} — coming soon</div>;
}

export function App() {
  const [currentPath, setCurrentPath] = useState('/');

  const handleRoute = useCallback((e: { url: string }) => {
    setCurrentPath(e.url);
  }, []);

  const navClass = (path: string) =>
    currentPath === path ? 'active' : '';

  return (
    <div class="app">
      <header class="header">
        <h1>NextDog</h1>
        <nav class="nav">
          <a href="/" class={navClass('/')}>Live Tail</a>
          <a href="/requests" class={navClass('/requests')}>Requests</a>
        </nav>
      </header>
      <div class="main">
        <Router onChange={handleRoute}>
          <LiveTail path="/" />
          <Requests path="/requests" />
          <Trace path="/trace/:traceId" />
        </Router>
      </div>
    </div>
  );
}
```

**Step 7: Install deps and verify dev server starts**

Run: `pnpm install`
Run: `cd packages/ui && pnpm dev` — verify it starts on http://localhost:5173
Expected: dark-themed shell with "NextDog" header, nav, and placeholder content

**Step 8: Verify build**

Run: `cd packages/ui && pnpm build`
Expected: `dist/` created with index.html, JS, and CSS bundles

**Step 9: Commit**

```bash
git add packages/ui/
git commit -m "scaffold @nextdog/ui: Preact + Vite + preact-router with dark theme"
```

---

### Task 7: @nextdog/ui — useSSE + useEvents Hooks

**Files:**
- Create: `packages/ui/src/hooks/use-sse.ts`
- Create: `packages/ui/src/hooks/use-events.ts`

These are the data backbone of the UI. `useSSE` manages the EventSource connection, `useEvents` stores events and provides filtering.

**Step 1: Create useSSE hook**

```ts
// packages/ui/src/hooks/use-sse.ts
import { useEffect, useRef, useState } from 'preact/hooks';

export interface SSEEvent {
  type: 'span' | 'log';
  timestamp: number;
  data: {
    traceId?: string;
    spanId?: string;
    parentSpanId?: string;
    name: string;
    kind?: string;
    startTimeUnixNano?: string;
    endTimeUnixNano?: string;
    attributes: Record<string, unknown>;
    status?: { code: string; message?: string };
    serviceName: string;
    level?: string;
    message?: string;
    timestamp?: number;
  };
}

interface UseSSEResult {
  events: SSEEvent[];
  connected: boolean;
  error: string | null;
}

export function useSSE(url: string): UseSSEResult {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(`${url}/sse`);
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as SSEEvent;
        setEvents((prev) => [...prev, event]);
      } catch {
        // Ignore malformed events
      }
    };

    es.onerror = () => {
      setConnected(false);
      setError('Connection lost — reconnecting...');
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [url]);

  return { events, connected, error };
}
```

**Step 2: Create useEvents hook**

```ts
// packages/ui/src/hooks/use-events.ts
import { useMemo, useState, useCallback } from 'preact/hooks';
import type { SSEEvent } from './use-sse.js';

export interface UseEventsResult {
  filtered: SSEEvent[];
  services: string[];
  activeServices: Set<string>;
  toggleService: (name: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

function matchesQuery(event: SSEEvent, query: string): boolean {
  if (!query) return true;

  const parts = query.split(/\s+/).filter(Boolean);
  return parts.every((part) => {
    const [key, value] = part.split(':');
    if (key && value) {
      // Faceted search: key:value
      if (key === 'level' && event.data.level) {
        return event.data.level === value;
      }
      if (key === 'service') {
        return event.data.serviceName === value;
      }
      if (key === 'route') {
        const route = event.data.attributes['http.route'] ??
          event.data.attributes['http.target'] ?? event.data.name;
        return String(route).includes(value);
      }
      if (key === 'status') {
        return event.data.status?.code?.toLowerCase() === value.toLowerCase();
      }
      if (key === 'trace') {
        return event.data.traceId === value;
      }
      // Check attributes
      const attrVal = event.data.attributes[key];
      if (attrVal !== undefined) {
        return String(attrVal).includes(value);
      }
    }
    // Freetext search across name and message
    const text = `${event.data.name} ${event.data.message ?? ''} ${event.data.serviceName}`.toLowerCase();
    return text.includes(part.toLowerCase());
  });
}

export function useEvents(events: SSEEvent[]): UseEventsResult {
  const [activeServices, setActiveServices] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const services = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) {
      set.add(e.data.serviceName);
    }
    return [...set].sort();
  }, [events]);

  const toggleService = useCallback((name: string) => {
    setActiveServices((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      // Service filter (empty = all)
      if (activeServices.size > 0 && !activeServices.has(e.data.serviceName)) {
        return false;
      }
      // Query filter
      return matchesQuery(e, searchQuery);
    });
  }, [events, activeServices, searchQuery]);

  return { filtered, services, activeServices, toggleService, searchQuery, setSearchQuery };
}
```

**Step 3: No dedicated tests for hooks — they'll be tested via the views. Commit.**

```bash
git add packages/ui/src/hooks/
git commit -m "add useSSE and useEvents hooks for live data and filtering"
```

---

### Task 8: @nextdog/ui — Live Tail View

**Files:**
- Create: `packages/ui/src/components/event-row.tsx`
- Create: `packages/ui/src/components/service-pills.tsx`
- Create: `packages/ui/src/components/search-bar.tsx`
- Create: `packages/ui/src/views/live-tail.tsx`
- Modify: `packages/ui/src/app.tsx`

**Step 1: Create EventRow component**

```tsx
// packages/ui/src/components/event-row.tsx
import type { SSEEvent } from '../hooks/use-sse.js';

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
}

function formatDuration(event: SSEEvent): string {
  if (!event.data.startTimeUnixNano || !event.data.endTimeUnixNano) return '—';
  const start = BigInt(event.data.startTimeUnixNano.replace('n', ''));
  const end = BigInt(event.data.endTimeUnixNano.replace('n', ''));
  const ms = Number(end - start) / 1_000_000;
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function statusClass(event: SSEEvent): string {
  const code = event.data.status?.code;
  if (code === 'ERROR') return 'status-error';
  if (code === 'OK') return 'status-ok';
  if (event.data.level === 'error') return 'status-error';
  if (event.data.level === 'warn') return 'status-warn';
  return 'status-ok';
}

interface EventRowProps {
  event: SSEEvent;
  onClick?: () => void;
}

export function EventRow({ event, onClick }: EventRowProps) {
  const route = event.data.attributes['http.route']
    ?? event.data.attributes['http.target']
    ?? event.data.name;

  return (
    <div class="event-row" onClick={onClick}>
      <span class="timestamp">{formatTime(event.timestamp)}</span>
      <span class="service">{event.data.serviceName}</span>
      <span class="route">{String(route)}</span>
      <span class="duration">{formatDuration(event)}</span>
      <span class={statusClass(event)}>
        {event.data.status?.code ?? event.data.level ?? ''}
      </span>
    </div>
  );
}
```

**Step 2: Create ServicePills component**

```tsx
// packages/ui/src/components/service-pills.tsx
interface ServicePillsProps {
  services: string[];
  active: Set<string>;
  onToggle: (name: string) => void;
}

export function ServicePills({ services, active, onToggle }: ServicePillsProps) {
  if (services.length === 0) return null;

  return (
    <div class="service-pills">
      {services.map((name) => (
        <button
          key={name}
          class={`pill ${active.has(name) ? 'active' : ''}`}
          onClick={() => onToggle(name)}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
```

**Step 3: Create SearchBar component**

```tsx
// packages/ui/src/components/search-bar.tsx
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div class="search-bar">
      <input
        type="text"
        placeholder="Filter: level:error route:/api service:my-app ..."
        value={value}
        onInput={(e) => onChange((e.target as HTMLInputElement).value)}
      />
    </div>
  );
}
```

**Step 4: Create LiveTail view**

```tsx
// packages/ui/src/views/live-tail.tsx
import { useRef, useEffect, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { EventRow } from '../components/event-row.js';
import { ServicePills } from '../components/service-pills.js';
import { SearchBar } from '../components/search-bar.js';
import type { SSEEvent } from '../hooks/use-sse.js';
import type { UseEventsResult } from '../hooks/use-events.js';

interface LiveTailProps {
  path?: string;
  eventsResult: UseEventsResult;
}

export function LiveTail({ eventsResult }: LiveTailProps) {
  const { filtered, services, activeServices, toggleService, searchQuery, setSearchQuery } = eventsResult;
  const listRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [filtered.length, autoScroll]);

  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
  };

  const handleEventClick = (event: SSEEvent) => {
    if (event.data.traceId) {
      route(`/trace/${event.data.traceId}`);
    }
  };

  return (
    <>
      <ServicePills services={services} active={activeServices} onToggle={toggleService} />
      <SearchBar value={searchQuery} onChange={setSearchQuery} />
      <div class="event-list" ref={listRef} onScroll={handleScroll}>
        {filtered.length === 0 ? (
          <div class="empty">Waiting for events...</div>
        ) : (
          filtered.map((event, i) => (
            <EventRow key={i} event={event} onClick={() => handleEventClick(event)} />
          ))
        )}
      </div>
      {!autoScroll && (
        <button
          style="position:fixed;bottom:16px;right:16px;padding:6px 12px;background:var(--accent);color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;"
          onClick={() => setAutoScroll(true)}
        >
          ↓ Resume auto-scroll
        </button>
      )}
    </>
  );
}
```

**Step 5: Update app.tsx to wire hooks into views**

```tsx
// packages/ui/src/app.tsx
import Router from 'preact-router';
import { useState, useCallback } from 'preact/hooks';
import { useSSE } from './hooks/use-sse.js';
import { useEvents } from './hooks/use-events.js';
import { LiveTail } from './views/live-tail.js';

const SIDECAR_URL = window.location.port === '5173'
  ? 'http://localhost:6789'
  : window.location.origin;

// Placeholder views — implemented in later tasks
function Requests({ path, eventsResult }: any) {
  return <div class="empty">Requests — coming next</div>;
}

function Trace({ traceId }: { path?: string; traceId?: string }) {
  return <div class="empty">Trace {traceId} — coming next</div>;
}

export function App() {
  const [currentPath, setCurrentPath] = useState('/');
  const { events, connected, error } = useSSE(SIDECAR_URL);
  const eventsResult = useEvents(events);

  const handleRoute = useCallback((e: { url: string }) => {
    setCurrentPath(e.url);
  }, []);

  const navClass = (path: string) =>
    currentPath === path ? 'active' : '';

  return (
    <div class="app">
      <header class="header">
        <h1>NextDog</h1>
        <nav class="nav">
          <a href="/" class={navClass('/')}>Live Tail</a>
          <a href="/requests" class={navClass('/requests')}>Requests</a>
        </nav>
        <span style="margin-left:auto;font-size:11px;color:var(--text-dim)">
          {connected ? '● connected' : error ?? '○ disconnected'}
        </span>
      </header>
      <div class="main">
        <Router onChange={handleRoute}>
          <LiveTail path="/" eventsResult={eventsResult} />
          <Requests path="/requests" eventsResult={eventsResult} />
          <Trace path="/trace/:traceId" />
        </Router>
      </div>
    </div>
  );
}
```

**Step 6: Verify dev server works**

Run: `cd packages/ui && pnpm dev`
Expected: Live Tail view renders with "Waiting for events..." and connection status

**Step 7: Commit**

```bash
git add packages/ui/src/
git commit -m "add Live Tail view with event rows, service pills, and search"
```

---

### Task 9: @nextdog/ui — Requests View

**Files:**
- Create: `packages/ui/src/views/requests.tsx`
- Modify: `packages/ui/src/app.tsx`

**Step 1: Create Requests view**

```tsx
// packages/ui/src/views/requests.tsx
import { useMemo, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { ServicePills } from '../components/service-pills.js';
import { SearchBar } from '../components/search-bar.js';
import type { SSEEvent } from '../hooks/use-sse.js';
import type { UseEventsResult } from '../hooks/use-events.js';

interface RequestGroup {
  traceId: string;
  method: string;
  routePath: string;
  status: string;
  duration: string;
  durationMs: number;
  serviceName: string;
  spans: SSEEvent[];
}

function groupByTrace(events: SSEEvent[]): RequestGroup[] {
  const groups = new Map<string, SSEEvent[]>();

  for (const event of events) {
    const traceId = event.data.traceId;
    if (!traceId) continue;
    if (!groups.has(traceId)) groups.set(traceId, []);
    groups.get(traceId)!.push(event);
  }

  return [...groups.entries()].map(([traceId, spans]) => {
    // Find the root server span (usually the HTTP handler)
    const rootSpan = spans.find(
      (s) => s.data.kind === 'SERVER' && !s.data.parentSpanId
    ) ?? spans[0];

    const method = String(rootSpan.data.attributes['http.method'] ?? 'GET');
    const routePath = String(
      rootSpan.data.attributes['http.route'] ??
      rootSpan.data.attributes['http.target'] ??
      rootSpan.data.name
    );
    const statusCode = rootSpan.data.status?.code ?? 'OK';

    let durationMs = 0;
    if (rootSpan.data.startTimeUnixNano && rootSpan.data.endTimeUnixNano) {
      const start = BigInt(String(rootSpan.data.startTimeUnixNano).replace('n', ''));
      const end = BigInt(String(rootSpan.data.endTimeUnixNano).replace('n', ''));
      durationMs = Number(end - start) / 1_000_000;
    }

    const duration = durationMs < 1
      ? `${(durationMs * 1000).toFixed(0)}µs`
      : durationMs < 1000
        ? `${durationMs.toFixed(1)}ms`
        : `${(durationMs / 1000).toFixed(2)}s`;

    return {
      traceId,
      method,
      routePath,
      status: statusCode,
      duration,
      durationMs,
      serviceName: rootSpan.data.serviceName,
      spans,
    };
  }).reverse(); // newest first
}

type SortField = 'time' | 'duration';

interface RequestsProps {
  path?: string;
  eventsResult: UseEventsResult;
}

export function Requests({ eventsResult }: RequestsProps) {
  const { filtered, services, activeServices, toggleService, searchQuery, setSearchQuery } = eventsResult;
  const [sortBy, setSortBy] = useState<SortField>('time');

  const groups = useMemo(() => {
    const g = groupByTrace(filtered);
    if (sortBy === 'duration') {
      g.sort((a, b) => b.durationMs - a.durationMs);
    }
    return g;
  }, [filtered, sortBy]);

  const methodClass = (method: string) => {
    const m = method.toUpperCase();
    if (m === 'GET') return 'method method-get';
    if (m === 'POST') return 'method method-post';
    if (m === 'PUT') return 'method method-put';
    if (m === 'DELETE') return 'method method-delete';
    return 'method';
  };

  return (
    <>
      <ServicePills services={services} active={activeServices} onToggle={toggleService} />
      <SearchBar value={searchQuery} onChange={setSearchQuery} />
      <div style="padding:4px 16px;display:flex;gap:8px;border-bottom:1px solid var(--border)">
        <button class={`pill ${sortBy === 'time' ? 'active' : ''}`} onClick={() => setSortBy('time')}>
          Newest
        </button>
        <button class={`pill ${sortBy === 'duration' ? 'active' : ''}`} onClick={() => setSortBy('duration')}>
          Slowest
        </button>
      </div>
      <div class="event-list">
        {groups.length === 0 ? (
          <div class="empty">No requests yet</div>
        ) : (
          groups.map((group) => (
            <div
              key={group.traceId}
              class="request-row"
              onClick={() => route(`/trace/${group.traceId}`)}
            >
              <span class={methodClass(group.method)}>{group.method}</span>
              <span class="route">{group.routePath}</span>
              <span class={group.status === 'ERROR' ? 'status-error' : 'status-ok'}>
                {group.status}
              </span>
              <span class="duration">{group.duration}</span>
              <span class="service">{group.serviceName}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
```

**Step 2: Update app.tsx to import real Requests view**

Replace the placeholder `Requests` function with:
```tsx
import { Requests } from './views/requests.js';
```

Remove the placeholder `Requests` function.

**Step 3: Verify**

Run: `cd packages/ui && pnpm dev`
Expected: Requests view renders, shows "No requests yet", sort buttons work

**Step 4: Commit**

```bash
git add packages/ui/src/
git commit -m "add Requests view with trace grouping, sorting, and method coloring"
```

---

### Task 10: @nextdog/ui — Trace Waterfall View

**Files:**
- Create: `packages/ui/src/components/waterfall.tsx`
- Create: `packages/ui/src/views/trace.tsx`
- Modify: `packages/ui/src/app.tsx`

**Step 1: Create Waterfall component**

```tsx
// packages/ui/src/components/waterfall.tsx
import type { SSEEvent } from '../hooks/use-sse.js';

const COLORS = ['var(--accent)', 'var(--blue)', 'var(--green)', 'var(--yellow)', 'var(--red)'];

interface WaterfallProps {
  spans: SSEEvent[];
}

interface SpanTiming {
  name: string;
  startNano: bigint;
  endNano: bigint;
  durationMs: number;
  depth: number;
  color: string;
  serviceName: string;
}

function buildTimings(spans: SSEEvent[]): { timings: SpanTiming[]; minNano: bigint; maxNano: bigint } {
  // Filter to spans with timing info
  const timed = spans.filter(
    (s) => s.data.startTimeUnixNano && s.data.endTimeUnixNano
  );

  if (timed.length === 0) return { timings: [], minNano: 0n, maxNano: 0n };

  // Build parent-child map for depth
  const childMap = new Map<string, SSEEvent[]>();
  const spanMap = new Map<string, SSEEvent>();

  for (const s of timed) {
    if (s.data.spanId) spanMap.set(s.data.spanId, s);
    const pid = s.data.parentSpanId;
    if (pid) {
      if (!childMap.has(pid)) childMap.set(pid, []);
      childMap.get(pid)!.push(s);
    }
  }

  // DFS to assign depth
  const depths = new Map<string, number>();
  const roots = timed.filter((s) => !s.data.parentSpanId || !spanMap.has(s.data.parentSpanId));

  function assignDepth(spanId: string, depth: number) {
    depths.set(spanId, depth);
    for (const child of childMap.get(spanId) ?? []) {
      if (child.data.spanId) assignDepth(child.data.spanId, depth + 1);
    }
  }

  for (const root of roots) {
    if (root.data.spanId) assignDepth(root.data.spanId, 0);
  }

  // Build ordered list (DFS order)
  const ordered: SSEEvent[] = [];
  function dfs(spanId: string) {
    const span = spanMap.get(spanId);
    if (span) ordered.push(span);
    for (const child of childMap.get(spanId) ?? []) {
      if (child.data.spanId) dfs(child.data.spanId);
    }
  }
  for (const root of roots) {
    if (root.data.spanId) dfs(root.data.spanId);
  }

  let minNano = BigInt('9999999999999999999');
  let maxNano = 0n;

  const timings: SpanTiming[] = ordered.map((s, i) => {
    const startNano = BigInt(String(s.data.startTimeUnixNano).replace('n', ''));
    const endNano = BigInt(String(s.data.endTimeUnixNano).replace('n', ''));
    if (startNano < minNano) minNano = startNano;
    if (endNano > maxNano) maxNano = endNano;

    return {
      name: String(s.data.attributes['http.route'] ?? s.data.attributes['http.target'] ?? s.data.name),
      startNano,
      endNano,
      durationMs: Number(endNano - startNano) / 1_000_000,
      depth: depths.get(s.data.spanId ?? '') ?? 0,
      color: COLORS[i % COLORS.length],
      serviceName: s.data.serviceName,
    };
  });

  return { timings, minNano, maxNano };
}

function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function Waterfall({ spans }: WaterfallProps) {
  const { timings, minNano, maxNano } = buildTimings(spans);
  const totalNano = maxNano - minNano;

  if (timings.length === 0) {
    return <div class="empty">No timing data available</div>;
  }

  return (
    <div class="waterfall">
      {timings.map((t, i) => {
        const leftPct = totalNano > 0n
          ? Number((t.startNano - minNano) * 10000n / totalNano) / 100
          : 0;
        const widthPct = totalNano > 0n
          ? Math.max(0.5, Number((t.endNano - t.startNano) * 10000n / totalNano) / 100)
          : 100;

        return (
          <div key={i} class="waterfall-row" style={`padding-left:${t.depth * 16}px`}>
            <span class="waterfall-label" title={t.name}>
              <span style="color:var(--text-dim);font-size:11px">{t.serviceName} </span>
              {t.name}
            </span>
            <div class="waterfall-bar-container">
              <div
                class="waterfall-bar"
                style={`left:${leftPct}%;width:${widthPct}%;background:${t.color}`}
              />
            </div>
            <span class="waterfall-duration">{formatDuration(t.durationMs)}</span>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 2: Create Trace view**

```tsx
// packages/ui/src/views/trace.tsx
import { useMemo } from 'preact/hooks';
import { Waterfall } from '../components/waterfall.js';
import type { SSEEvent } from '../hooks/use-sse.js';

interface TraceProps {
  path?: string;
  traceId?: string;
  events: SSEEvent[];
}

export function Trace({ traceId, events }: TraceProps) {
  const traceSpans = useMemo(
    () => events.filter((e) => e.data.traceId === traceId),
    [events, traceId]
  );

  if (!traceId) {
    return <div class="empty">No trace selected</div>;
  }

  return (
    <div style="flex:1;overflow-y:auto">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border)">
        <a href="/" style="font-size:12px;color:var(--text-dim)">← Back</a>
        <h2 style="font-size:14px;margin-top:4px;color:var(--text-bright)">
          Trace {traceId}
        </h2>
        <span style="font-size:12px;color:var(--text-dim)">{traceSpans.length} spans</span>
      </div>
      <Waterfall spans={traceSpans} />
    </div>
  );
}
```

**Step 3: Update app.tsx to import real Trace view and pass events**

Replace the placeholder `Trace` function with:
```tsx
import { Trace } from './views/trace.js';
```

Update the Router to pass events:
```tsx
<Trace path="/trace/:traceId" events={events} />
```

(where `events` comes from `useSSE`)

**Step 4: Verify**

Run: `cd packages/ui && pnpm dev`
Expected: trace view renders waterfall with nested spans when given a traceId

**Step 5: Commit**

```bash
git add packages/ui/src/
git commit -m "add Trace Waterfall view with nested span hierarchy and duration bars"
```

---

### Task 11: @nextdog/ui — Keyboard Shortcuts

**Files:**
- Create: `packages/ui/src/hooks/use-keyboard.ts`
- Modify: `packages/ui/src/views/live-tail.tsx`

**Step 1: Create useKeyboard hook**

```ts
// packages/ui/src/hooks/use-keyboard.ts
import { useEffect } from 'preact/hooks';

interface KeyboardActions {
  onNext?: () => void;      // j
  onPrev?: () => void;      // k
  onSelect?: () => void;    // Enter
  onBack?: () => void;      // Esc
}

export function useKeyboard(actions: KeyboardActions) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'j':
          e.preventDefault();
          actions.onNext?.();
          break;
        case 'k':
          e.preventDefault();
          actions.onPrev?.();
          break;
        case 'Enter':
          e.preventDefault();
          actions.onSelect?.();
          break;
        case 'Escape':
          e.preventDefault();
          actions.onBack?.();
          break;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [actions.onNext, actions.onPrev, actions.onSelect, actions.onBack]);
}
```

**Step 2: Wire keyboard into Live Tail**

Add to `live-tail.tsx`:
```tsx
import { useKeyboard } from '../hooks/use-keyboard.js';

// Inside LiveTail component, add:
const [selectedIndex, setSelectedIndex] = useState(-1);

useKeyboard({
  onNext: () => setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)),
  onPrev: () => setSelectedIndex((i) => Math.max(i - 1, 0)),
  onSelect: () => {
    if (selectedIndex >= 0 && filtered[selectedIndex]?.data.traceId) {
      route(`/trace/${filtered[selectedIndex].data.traceId}`);
    }
  },
  onBack: () => setSelectedIndex(-1),
});
```

Add a `selected` class to the active row in the EventRow rendering:
```tsx
<EventRow
  key={i}
  event={event}
  selected={i === selectedIndex}
  onClick={() => handleEventClick(event)}
/>
```

Update `EventRow` to accept and use `selected` prop:
```tsx
interface EventRowProps {
  event: SSEEvent;
  selected?: boolean;
  onClick?: () => void;
}

export function EventRow({ event, selected, onClick }: EventRowProps) {
  // ... existing code
  return (
    <div class={`event-row ${selected ? 'selected' : ''}`} onClick={onClick}>
```

Add CSS for selected state in `index.css`:
```css
.event-row.selected {
  background: var(--bg-hover);
  outline: 1px solid var(--accent);
  outline-offset: -1px;
}
```

**Step 3: Commit**

```bash
git add packages/ui/src/
git commit -m "add keyboard navigation: j/k to move, Enter to open trace, Esc to deselect"
```

---

### Task 12: Wire UI Build into Core Sidecar

**Files:**
- Modify: `packages/core/src/cli.ts`
- Modify: `packages/core/package.json`

The sidecar CLI needs to know where the UI dist lives and pass it as `uiDir`.

**Step 1: Update core package.json to add @nextdog/ui as optional dependency**

Add to `packages/core/package.json`:
```json
"dependencies": {
  "@nextdog/ui": "workspace:*"
}
```

**Step 2: Update cli.ts to resolve UI path**

```ts
// packages/core/src/cli.ts
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
```

**Step 3: Build everything and verify**

Run: `pnpm build` (from root — builds all packages)
Run: `node packages/core/dist/cli.js`
Expected: sidecar starts, logs UI dir path, `http://localhost:6789/` serves the dashboard

**Step 4: Commit**

```bash
git add packages/core/
git commit -m "wire UI dist into sidecar CLI with auto-resolution"
```

---

### Task 13: Full Build + E2E Verification

**Step 1: Full build from root**

Run: `pnpm install && pnpm build`
Expected: all 3 packages compile

**Step 2: Full test suite**

Run: `pnpm test`
Expected: all tests pass

**Step 3: Manual E2E smoke test**

Run sidecar: `node packages/core/dist/cli.js`
Open browser: `http://localhost:6789/`
Expected: NextDog dashboard loads with Live Tail view

Send test spans:
```bash
curl -X POST http://localhost:6789/v1/spans \
  -H 'Content-Type: application/json' \
  -d '{"spans":[{"traceId":"test-trace-1","spanId":"span-1","name":"GET /api/hello","kind":"SERVER","startTimeUnixNano":"1711000000000000000","endTimeUnixNano":"1711000000050000000","attributes":{"http.method":"GET","http.route":"/api/hello"},"status":{"code":"OK"},"serviceName":"demo-app"}]}'
```
Expected: span appears in Live Tail, clicking navigates to trace waterfall

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "finalize @nextdog/next + @nextdog/ui v0.0.1"
```
