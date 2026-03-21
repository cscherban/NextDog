# NextDog v1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Scaffold the monorepo and build `@nextdog/core` — the event bus, ring buffer, file store, OTel span exporter, SSE stream, and sidecar HTTP server.

**Architecture:** Event-driven pipeline where an HTTP server ingests OTel spans, emits them through a typed EventBus, and three subscribers (RingBuffer, FileStore, SSEStream) react independently. Raw Node `http` module, zero runtime dependencies.

**Tech Stack:** TypeScript (strict), pnpm workspaces, Turborepo, Vitest for testing, Node `http` + `EventEmitter` + `fs` + `AsyncLocalStorage`.

---

### Task 1: Scaffold Monorepo

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/next/package.json`
- Create: `packages/next/tsconfig.json`
- Create: `packages/next/src/index.ts`
- Create: `packages/ui/package.json`
- Create: `packages/ui/tsconfig.json`

**Step 1: Create root workspace files**

`package.json`:
```json
{
  "name": "nextdog",
  "private": true,
  "scripts": {
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "^2",
    "typescript": "^5"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "packages/*"
```

`turbo.json`:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"]
    },
    "lint": {}
  }
}
```

`tsconfig.json` (base):
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src"
  }
}
```

`.gitignore`:
```
node_modules/
dist/
.turbo/
*.tsbuildinfo
```

**Step 2: Create `@nextdog/core` package skeleton**

`packages/core/package.json`:
```json
{
  "name": "@nextdog/core",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^3"
  }
}
```

`packages/core/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

`packages/core/src/index.ts`:
```ts
export { EventBus } from './event-bus.js';
export { RingBuffer } from './ring-buffer.js';
export { FileStore } from './file-store.js';
export { SSEStream } from './sse-stream.js';
export { createServer } from './server.js';
export type { Span, LogEntry, NextDogEvent } from './types.js';
```

**Step 3: Create `@nextdog/next` and `@nextdog/ui` package skeletons**

`packages/next/package.json`:
```json
{
  "name": "@nextdog/next",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "test": "vitest run"
  },
  "devDependencies": {
    "vitest": "^3"
  }
}
```

`packages/next/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

`packages/next/src/index.ts`:
```ts
// Placeholder — implemented in a later plan
export function withNextDog(config: Record<string, unknown>) {
  return config;
}
```

`packages/ui/package.json`:
```json
{
  "name": "@nextdog/ui",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "echo 'UI build not yet configured'",
    "test": "echo 'No tests yet'"
  }
}
```

`packages/ui/tsconfig.json`:
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

**Step 4: Install dependencies and verify**

Run: `pnpm install`
Expected: lockfile created, node_modules populated

Run: `cd packages/core && pnpm test`
Expected: vitest runs (no tests yet, exits 0)

**Step 5: Commit**

```bash
git add -A
git commit -m "scaffold monorepo with pnpm workspaces and turborepo"
```

---

### Task 2: Types Module

**Files:**
- Create: `packages/core/src/types.ts`
- Test: `packages/core/src/__tests__/types.test.ts`

**Step 1: Write the test**

```ts
// packages/core/src/__tests__/types.test.ts
import { describe, it, expect } from 'vitest';
import type { Span, LogEntry, NextDogEvent } from '../types.js';

describe('types', () => {
  it('Span type has required OTel fields', () => {
    const span: Span = {
      traceId: 'abc123',
      spanId: 'def456',
      parentSpanId: undefined,
      name: 'GET /api/users',
      kind: 'SERVER',
      startTimeUnixNano: 1711000000000000000n,
      endTimeUnixNano: 1711000000050000000n,
      attributes: { 'http.method': 'GET', 'http.route': '/api/users' },
      status: { code: 'OK' },
      serviceName: 'my-app',
    };
    expect(span.traceId).toBe('abc123');
    expect(span.serviceName).toBe('my-app');
  });

  it('LogEntry type has required fields', () => {
    const log: LogEntry = {
      timestamp: 1711000000000,
      level: 'info',
      message: 'Request received',
      attributes: { userId: '123' },
      traceId: 'abc123',
      spanId: 'def456',
      serviceName: 'my-app',
    };
    expect(log.level).toBe('info');
    expect(log.traceId).toBe('abc123');
  });

  it('NextDogEvent discriminated union works', () => {
    const spanEvent: NextDogEvent = {
      type: 'span',
      timestamp: 1711000000000,
      data: {
        traceId: 'abc123',
        spanId: 'def456',
        parentSpanId: undefined,
        name: 'GET /api/users',
        kind: 'SERVER',
        startTimeUnixNano: 1711000000000000000n,
        endTimeUnixNano: 1711000000050000000n,
        attributes: {},
        status: { code: 'OK' },
        serviceName: 'my-app',
      },
    };
    expect(spanEvent.type).toBe('span');

    const logEvent: NextDogEvent = {
      type: 'log',
      timestamp: 1711000000000,
      data: {
        timestamp: 1711000000000,
        level: 'error',
        message: 'Something broke',
        attributes: {},
        serviceName: 'my-app',
      },
    };
    expect(logEvent.type).toBe('log');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test src/__tests__/types.test.ts`
Expected: FAIL — cannot find module `../types.js`

**Step 3: Write the types module**

```ts
// packages/core/src/types.ts
export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: 'SERVER' | 'CLIENT' | 'INTERNAL' | 'PRODUCER' | 'CONSUMER';
  startTimeUnixNano: bigint;
  endTimeUnixNano: bigint;
  attributes: Record<string, string | number | boolean>;
  status: { code: 'OK' | 'ERROR' | 'UNSET'; message?: string };
  serviceName: string;
}

export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  attributes: Record<string, unknown>;
  traceId?: string;
  spanId?: string;
  serviceName: string;
}

export type NextDogEvent =
  | { type: 'span'; timestamp: number; data: Span }
  | { type: 'log'; timestamp: number; data: LogEntry };
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test src/__tests__/types.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/__tests__/types.test.ts
git commit -m "add core types: Span, LogEntry, NextDogEvent"
```

---

### Task 3: EventBus

**Files:**
- Create: `packages/core/src/event-bus.ts`
- Test: `packages/core/src/__tests__/event-bus.test.ts`

**Step 1: Write the failing test**

```ts
// packages/core/src/__tests__/event-bus.test.ts
import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../event-bus.js';
import type { NextDogEvent, Span } from '../types.js';

const makeSpan = (overrides?: Partial<Span>): Span => ({
  traceId: 'trace-1',
  spanId: 'span-1',
  name: 'GET /api/test',
  kind: 'SERVER',
  startTimeUnixNano: 1000000000n,
  endTimeUnixNano: 1050000000n,
  attributes: {},
  status: { code: 'OK' },
  serviceName: 'test-app',
  ...overrides,
});

describe('EventBus', () => {
  it('emits span events to subscribers', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('span', handler);

    const event: NextDogEvent = {
      type: 'span',
      timestamp: Date.now(),
      data: makeSpan(),
    };
    bus.emit(event);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('emits log events to subscribers', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('log', handler);

    const event: NextDogEvent = {
      type: 'log',
      timestamp: Date.now(),
      data: {
        timestamp: Date.now(),
        level: 'info',
        message: 'hello',
        attributes: {},
        serviceName: 'test-app',
      },
    };
    bus.emit(event);

    expect(handler).toHaveBeenCalledOnce();
    expect(handler).toHaveBeenCalledWith(event);
  });

  it('supports wildcard * subscription for all events', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('*', handler);

    bus.emit({ type: 'span', timestamp: Date.now(), data: makeSpan() });
    bus.emit({
      type: 'log',
      timestamp: Date.now(),
      data: { timestamp: Date.now(), level: 'info', message: 'x', attributes: {}, serviceName: 'a' },
    });

    expect(handler).toHaveBeenCalledTimes(2);
  });

  it('unsubscribes correctly', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsub = bus.on('span', handler);

    bus.emit({ type: 'span', timestamp: Date.now(), data: makeSpan() });
    expect(handler).toHaveBeenCalledOnce();

    unsub();
    bus.emit({ type: 'span', timestamp: Date.now(), data: makeSpan() });
    expect(handler).toHaveBeenCalledOnce(); // not called again
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test src/__tests__/event-bus.test.ts`
Expected: FAIL — cannot find module `../event-bus.js`

**Step 3: Write the EventBus**

```ts
// packages/core/src/event-bus.ts
import { EventEmitter } from 'node:events';
import type { NextDogEvent } from './types.js';

type EventType = NextDogEvent['type'] | '*';
type EventHandler = (event: NextDogEvent) => void;

export class EventBus {
  private emitter = new EventEmitter();

  on(type: EventType, handler: EventHandler): () => void {
    this.emitter.on(type, handler);
    return () => this.emitter.off(type, handler);
  }

  emit(event: NextDogEvent): void {
    this.emitter.emit(event.type, event);
    this.emitter.emit('*', event);
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test src/__tests__/event-bus.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add packages/core/src/event-bus.ts packages/core/src/__tests__/event-bus.test.ts
git commit -m "add typed EventBus with wildcard subscription support"
```

---

### Task 4: RingBuffer

**Files:**
- Create: `packages/core/src/ring-buffer.ts`
- Test: `packages/core/src/__tests__/ring-buffer.test.ts`

**Step 1: Write the failing test**

```ts
// packages/core/src/__tests__/ring-buffer.test.ts
import { describe, it, expect } from 'vitest';
import { RingBuffer } from '../ring-buffer.js';
import type { NextDogEvent } from '../types.js';

const makeEvent = (id: number): NextDogEvent => ({
  type: 'span',
  timestamp: id,
  data: {
    traceId: `trace-${id}`,
    spanId: `span-${id}`,
    name: `span-${id}`,
    kind: 'SERVER',
    startTimeUnixNano: BigInt(id * 1000000),
    endTimeUnixNano: BigInt(id * 1000000 + 500000),
    attributes: {},
    status: { code: 'OK' },
    serviceName: 'test',
  },
});

describe('RingBuffer', () => {
  it('stores and retrieves entries', () => {
    const buf = new RingBuffer(5);
    buf.push(makeEvent(1));
    buf.push(makeEvent(2));

    const entries = buf.getAll();
    expect(entries).toHaveLength(2);
    expect(entries[0].timestamp).toBe(1);
    expect(entries[1].timestamp).toBe(2);
  });

  it('overwrites oldest when capacity exceeded', () => {
    const buf = new RingBuffer(3);
    buf.push(makeEvent(1));
    buf.push(makeEvent(2));
    buf.push(makeEvent(3));
    buf.push(makeEvent(4)); // overwrites 1

    const entries = buf.getAll();
    expect(entries).toHaveLength(3);
    expect(entries[0].timestamp).toBe(2);
    expect(entries[1].timestamp).toBe(3);
    expect(entries[2].timestamp).toBe(4);
  });

  it('getLast returns N most recent entries', () => {
    const buf = new RingBuffer(10);
    for (let i = 1; i <= 7; i++) buf.push(makeEvent(i));

    const last3 = buf.getLast(3);
    expect(last3).toHaveLength(3);
    expect(last3[0].timestamp).toBe(5);
    expect(last3[1].timestamp).toBe(6);
    expect(last3[2].timestamp).toBe(7);
  });

  it('getLast with N > size returns all entries', () => {
    const buf = new RingBuffer(10);
    buf.push(makeEvent(1));
    buf.push(makeEvent(2));

    const result = buf.getLast(50);
    expect(result).toHaveLength(2);
  });

  it('drain returns and clears pending entries', () => {
    const buf = new RingBuffer(10);
    buf.push(makeEvent(1));
    buf.push(makeEvent(2));

    const drained = buf.drain();
    expect(drained).toHaveLength(2);

    const drained2 = buf.drain();
    expect(drained2).toHaveLength(0);

    // getAll still returns everything (drain only clears flush queue)
    expect(buf.getAll()).toHaveLength(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test src/__tests__/ring-buffer.test.ts`
Expected: FAIL — cannot find module `../ring-buffer.js`

**Step 3: Write the RingBuffer**

```ts
// packages/core/src/ring-buffer.ts
import type { NextDogEvent } from './types.js';

export class RingBuffer {
  private buffer: (NextDogEvent | undefined)[];
  private head = 0;
  private count = 0;
  private pending: NextDogEvent[] = [];

  constructor(private capacity: number) {
    this.buffer = new Array(capacity);
  }

  push(event: NextDogEvent): void {
    this.buffer[this.head] = event;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count++;
    this.pending.push(event);
  }

  getAll(): NextDogEvent[] {
    if (this.count === 0) return [];
    const result: NextDogEvent[] = [];
    const start = this.count < this.capacity ? 0 : this.head;
    for (let i = 0; i < this.count; i++) {
      const idx = (start + i) % this.capacity;
      result.push(this.buffer[idx]!);
    }
    return result;
  }

  getLast(n: number): NextDogEvent[] {
    const all = this.getAll();
    return all.slice(-Math.min(n, all.length));
  }

  drain(): NextDogEvent[] {
    const drained = this.pending;
    this.pending = [];
    return drained;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test src/__tests__/ring-buffer.test.ts`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add packages/core/src/ring-buffer.ts packages/core/src/__tests__/ring-buffer.test.ts
git commit -m "add RingBuffer with circular overwrite and drain for flush batching"
```

---

### Task 5: FileStore

**Files:**
- Create: `packages/core/src/file-store.ts`
- Test: `packages/core/src/__tests__/file-store.test.ts`

**Step 1: Write the failing test**

```ts
// packages/core/src/__tests__/file-store.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileStore } from '../file-store.js';
import { mkdtemp, rm, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { NextDogEvent } from '../types.js';

const makeEvent = (id: number, serviceName = 'test'): NextDogEvent => ({
  type: 'span',
  timestamp: id,
  data: {
    traceId: `trace-${id}`,
    spanId: `span-${id}`,
    name: `span-${id}`,
    kind: 'SERVER' as const,
    startTimeUnixNano: BigInt(id * 1000000),
    endTimeUnixNano: BigInt(id * 1000000 + 500000),
    attributes: {},
    status: { code: 'OK' as const },
    serviceName,
  },
});

describe('FileStore', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'nextdog-test-'));
  });

  afterEach(async () => {
    await rm(dir, { recursive: true });
  });

  it('flushes events to NDJSON file', async () => {
    const store = new FileStore(dir);
    await store.flush([makeEvent(1), makeEvent(2)]);

    const files = await readdir(dir);
    expect(files).toHaveLength(1);
    expect(files[0]).toMatch(/^\d{4}-\d{2}-\d{2}-\d{2}\.ndjson$/);

    const content = await readFile(join(dir, files[0]), 'utf-8');
    const lines = content.trim().split('\n');
    expect(lines).toHaveLength(2);

    const parsed = JSON.parse(lines[0]);
    expect(parsed.type).toBe('span');
    expect(parsed.data.traceId).toBe('trace-1');
  });

  it('reads events back with query filters', async () => {
    const store = new FileStore(dir);
    await store.flush([
      makeEvent(1, 'app-a'),
      makeEvent(2, 'app-b'),
      makeEvent(3, 'app-a'),
    ]);

    const all = await store.query({});
    expect(all).toHaveLength(3);

    const filtered = await store.query({ service: 'app-a' });
    expect(filtered).toHaveLength(2);
  });

  it('queries by traceId', async () => {
    const store = new FileStore(dir);
    await store.flush([makeEvent(1), makeEvent(2), makeEvent(3)]);

    const result = await store.query({ traceId: 'trace-2' });
    expect(result).toHaveLength(1);
    expect(result[0].data.traceId).toBe('trace-2');
  });

  it('cleans up files older than maxAge', async () => {
    const store = new FileStore(dir);
    await store.flush([makeEvent(1)]);

    const files = await readdir(dir);
    expect(files).toHaveLength(1);

    // Clean with maxAge 0 should remove everything
    await store.cleanup(0);
    const remaining = await readdir(dir);
    expect(remaining).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test src/__tests__/file-store.test.ts`
Expected: FAIL — cannot find module `../file-store.js`

**Step 3: Write the FileStore**

Note: BigInt values are serialized as strings in JSON (BigInt is not JSON-serializable). We use a custom replacer/reviver.

```ts
// packages/core/src/file-store.ts
import { appendFile, readdir, readFile, unlink, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { NextDogEvent } from './types.js';

function hourlyFilename(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  return `${y}-${m}-${d}-${h}.ndjson`;
}

function serialize(event: NextDogEvent): string {
  return JSON.stringify(event, (_key, value) =>
    typeof value === 'bigint' ? value.toString() + 'n' : value
  );
}

function deserialize(line: string): NextDogEvent {
  return JSON.parse(line, (_key, value) => {
    if (typeof value === 'string' && /^\d+n$/.test(value)) {
      return BigInt(value.slice(0, -1));
    }
    return value;
  });
}

export interface QueryOptions {
  service?: string;
  traceId?: string;
  last?: number;
}

export class FileStore {
  constructor(private dir: string) {}

  async flush(events: NextDogEvent[]): Promise<void> {
    if (events.length === 0) return;
    await mkdir(this.dir, { recursive: true });
    const filename = hourlyFilename();
    const lines = events.map(e => serialize(e)).join('\n') + '\n';
    await appendFile(join(this.dir, filename), lines, 'utf-8');
  }

  async query(opts: QueryOptions): Promise<NextDogEvent[]> {
    await mkdir(this.dir, { recursive: true });
    const files = (await readdir(this.dir))
      .filter(f => f.endsWith('.ndjson'))
      .sort();

    const results: NextDogEvent[] = [];

    for (const file of files) {
      const content = await readFile(join(this.dir, file), 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      for (const line of lines) {
        const event = deserialize(line);
        if (opts.service && event.data.serviceName !== opts.service) continue;
        if (opts.traceId && ('traceId' in event.data) && event.data.traceId !== opts.traceId) continue;
        results.push(event);
      }
    }

    if (opts.last) return results.slice(-opts.last);
    return results;
  }

  async cleanup(maxAgeMs: number): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const files = await readdir(this.dir);
    const now = Date.now();

    for (const file of files) {
      if (!file.endsWith('.ndjson')) continue;
      // Parse date from filename: YYYY-MM-DD-HH.ndjson
      const match = file.match(/^(\d{4})-(\d{2})-(\d{2})-(\d{2})\.ndjson$/);
      if (!match) continue;

      const fileDate = new Date(
        Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4])
      );

      if (now - fileDate.getTime() > maxAgeMs) {
        await unlink(join(this.dir, file));
      }
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test src/__tests__/file-store.test.ts`
Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add packages/core/src/file-store.ts packages/core/src/__tests__/file-store.test.ts
git commit -m "add FileStore with NDJSON hourly rotation, query, and cleanup"
```

---

### Task 6: SSEStream

**Files:**
- Create: `packages/core/src/sse-stream.ts`
- Test: `packages/core/src/__tests__/sse-stream.test.ts`

**Step 1: Write the failing test**

```ts
// packages/core/src/__tests__/sse-stream.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SSEStream } from '../sse-stream.js';
import { RingBuffer } from '../ring-buffer.js';
import type { NextDogEvent } from '../types.js';
import { PassThrough } from 'node:stream';
import type { ServerResponse } from 'node:http';

const makeEvent = (id: number): NextDogEvent => ({
  type: 'span',
  timestamp: id,
  data: {
    traceId: `trace-${id}`,
    spanId: `span-${id}`,
    name: `span-${id}`,
    kind: 'SERVER' as const,
    startTimeUnixNano: BigInt(id * 1000000),
    endTimeUnixNano: BigInt(id * 1000000 + 500000),
    attributes: {},
    status: { code: 'OK' as const },
    serviceName: 'test',
  },
});

function mockResponse(): ServerResponse & { chunks: string[] } {
  const chunks: string[] = [];
  const stream = new PassThrough();
  const res = Object.assign(stream, {
    chunks,
    writeHead: vi.fn(),
    write(chunk: string) {
      chunks.push(chunk);
      return true;
    },
    on: vi.fn().mockReturnThis(),
  });
  return res as unknown as ServerResponse & { chunks: string[] };
}

describe('SSEStream', () => {
  let ringBuffer: RingBuffer;

  beforeEach(() => {
    ringBuffer = new RingBuffer(100);
  });

  it('sends backfill from RingBuffer on connect', () => {
    ringBuffer.push(makeEvent(1));
    ringBuffer.push(makeEvent(2));

    const sse = new SSEStream(ringBuffer);
    const res = mockResponse();
    sse.addClient(res);

    // Should have sent 2 backfill events
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.objectContaining({
      'Content-Type': 'text/event-stream',
    }));
    // Each event = "data: {...}\n\n"
    const dataChunks = res.chunks.filter(c => c.startsWith('data:'));
    expect(dataChunks).toHaveLength(2);
  });

  it('broadcasts new events to connected clients', () => {
    const sse = new SSEStream(ringBuffer);
    const res = mockResponse();
    sse.addClient(res);

    sse.broadcast(makeEvent(99));

    const dataChunks = res.chunks.filter(c => c.startsWith('data:'));
    expect(dataChunks).toHaveLength(1);
    expect(dataChunks[0]).toContain('trace-99');
  });

  it('removes client on close', () => {
    const sse = new SSEStream(ringBuffer);
    const res = mockResponse();
    sse.addClient(res);

    expect(sse.clientCount).toBe(1);
    sse.removeClient(res);
    expect(sse.clientCount).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test src/__tests__/sse-stream.test.ts`
Expected: FAIL — cannot find module `../sse-stream.js`

**Step 3: Write the SSEStream**

```ts
// packages/core/src/sse-stream.ts
import type { ServerResponse } from 'node:http';
import type { NextDogEvent } from './types.js';
import type { RingBuffer } from './ring-buffer.js';

function serializeEvent(event: NextDogEvent): string {
  const json = JSON.stringify(event, (_key, value) =>
    typeof value === 'bigint' ? value.toString() + 'n' : value
  );
  return `data: ${json}\n\n`;
}

export class SSEStream {
  private clients = new Set<ServerResponse>();

  constructor(private ringBuffer: RingBuffer) {}

  get clientCount(): number {
    return this.clients.size;
  }

  addClient(res: ServerResponse): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Backfill from ring buffer
    const backfill = this.ringBuffer.getLast(50);
    for (const event of backfill) {
      res.write(serializeEvent(event));
    }

    this.clients.add(res);
  }

  removeClient(res: ServerResponse): void {
    this.clients.delete(res);
  }

  broadcast(event: NextDogEvent): void {
    const message = serializeEvent(event);
    for (const client of this.clients) {
      client.write(message);
    }
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test src/__tests__/sse-stream.test.ts`
Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add packages/core/src/sse-stream.ts packages/core/src/__tests__/sse-stream.test.ts
git commit -m "add SSEStream with backfill and broadcast to connected clients"
```

---

### Task 7: Sidecar HTTP Server

**Files:**
- Create: `packages/core/src/server.ts`
- Test: `packages/core/src/__tests__/server.test.ts`

**Step 1: Write the failing test**

```ts
// packages/core/src/__tests__/server.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { createServer } from '../server.js';
import type { Server } from 'node:http';

async function request(port: number, method: string, path: string, body?: string) {
  const res = await fetch(`http://localhost:${port}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body,
  });
  return {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    body: await res.text(),
    json: () => JSON.parse(res.statusText === 'OK' ? '' : ''),
  };
}

describe('Server', () => {
  let server: Server;
  const port = 16789; // test port

  afterEach(async () => {
    if (server) {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  it('GET /health returns 200 with status', async () => {
    server = await createServer({ port, dataDir: '/tmp/nextdog-test-server' });
    const res = await fetch(`http://localhost:${port}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });

  it('POST /v1/spans ingests spans and returns 202', async () => {
    server = await createServer({ port, dataDir: '/tmp/nextdog-test-server' });

    const spans = [{
      traceId: 'trace-1',
      spanId: 'span-1',
      name: 'GET /test',
      kind: 'SERVER',
      startTimeUnixNano: '1000000000',
      endTimeUnixNano: '1050000000',
      attributes: {},
      status: { code: 'OK' },
      serviceName: 'test-app',
    }];

    const res = await fetch(`http://localhost:${port}/v1/spans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spans }),
    });
    expect(res.status).toBe(202);
  });

  it('GET /api/services returns list of known services', async () => {
    server = await createServer({ port, dataDir: '/tmp/nextdog-test-server' });

    // Ingest a span first
    await fetch(`http://localhost:${port}/v1/spans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spans: [{
          traceId: 't1', spanId: 's1', name: 'test', kind: 'SERVER',
          startTimeUnixNano: '1000', endTimeUnixNano: '2000',
          attributes: {}, status: { code: 'OK' }, serviceName: 'my-service',
        }],
      }),
    });

    const res = await fetch(`http://localhost:${port}/api/services`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.services).toContain('my-service');
  });

  it('handles CORS preflight', async () => {
    server = await createServer({ port, dataDir: '/tmp/nextdog-test-server' });
    const res = await fetch(`http://localhost:${port}/v1/spans`, {
      method: 'OPTIONS',
    });
    expect(res.status).toBe(204);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('returns 404 for unknown API routes', async () => {
    server = await createServer({ port, dataDir: '/tmp/nextdog-test-server' });
    const res = await fetch(`http://localhost:${port}/api/unknown`);
    expect(res.status).toBe(404);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test src/__tests__/server.test.ts`
Expected: FAIL — cannot find module `../server.js`

**Step 3: Write the server**

```ts
// packages/core/src/server.ts
import { createServer as httpCreateServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { EventBus } from './event-bus.js';
import { RingBuffer } from './ring-buffer.js';
import { FileStore } from './file-store.js';
import { SSEStream } from './sse-stream.js';
import type { NextDogEvent, Span } from './types.js';

export interface ServerOptions {
  port: number;
  host?: string;
  dataDir: string;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

function json(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

function cors(res: ServerResponse): void {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end();
}

export function createServer(opts: ServerOptions): Promise<Server> {
  const bus = new EventBus();
  const ringBuffer = new RingBuffer(500);
  const fileStore = new FileStore(opts.dataDir);
  const sseStream = new SSEStream(ringBuffer);
  const services = new Set<string>();

  // Wire EventBus subscribers
  bus.on('*', (event) => {
    ringBuffer.push(event);
    sseStream.broadcast(event);
  });

  // Periodic flush to disk
  let flushTimer: ReturnType<typeof setInterval> | undefined;
  const startFlushing = () => {
    flushTimer = setInterval(async () => {
      const events = ringBuffer.drain();
      if (events.length > 0) {
        await fileStore.flush(events);
      }
    }, 2000);
    flushTimer.unref();
  };

  // Periodic cleanup of old files (every hour)
  let cleanupTimer: ReturnType<typeof setInterval> | undefined;
  const startCleanup = () => {
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    cleanupTimer = setInterval(() => {
      fileStore.cleanup(TWENTY_FOUR_HOURS);
    }, 60 * 60 * 1000);
    cleanupTimer.unref();
  };

  const server = httpCreateServer(async (req, res) => {
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const { pathname } = url;

    if (req.method === 'OPTIONS') {
      return cors(res);
    }

    // Health check
    if (req.method === 'GET' && pathname === '/health') {
      return json(res, 200, { status: 'ok', uptime: process.uptime() });
    }

    // Ingest spans
    if (req.method === 'POST' && pathname === '/v1/spans') {
      const body = JSON.parse(await readBody(req));
      const spans: Span[] = (body.spans ?? []).map((s: Record<string, unknown>) => ({
        ...s,
        startTimeUnixNano: BigInt(s.startTimeUnixNano as string),
        endTimeUnixNano: BigInt(s.endTimeUnixNano as string),
      }));

      for (const span of spans) {
        services.add(span.serviceName);
        const event: NextDogEvent = {
          type: 'span',
          timestamp: Date.now(),
          data: span,
        };
        bus.emit(event);
      }
      return json(res, 202, { accepted: spans.length });
    }

    // Query spans
    if (req.method === 'GET' && pathname === '/api/spans') {
      const service = url.searchParams.get('service') ?? undefined;
      const traceId = url.searchParams.get('traceId') ?? undefined;
      const last = url.searchParams.has('last')
        ? Number(url.searchParams.get('last'))
        : undefined;

      // Serve from ring buffer for recent queries, file store for deeper
      if (last && last <= 500 && !service && !traceId) {
        return json(res, 200, { spans: ringBuffer.getLast(last) });
      }

      const results = await fileStore.query({ service, traceId, last });
      return json(res, 200, { spans: results });
    }

    // List services
    if (req.method === 'GET' && pathname === '/api/services') {
      return json(res, 200, { services: [...services] });
    }

    // SSE live tail
    if (req.method === 'GET' && pathname === '/sse') {
      sseStream.addClient(res);
      req.on('close', () => sseStream.removeClient(res));
      return;
    }

    // 404
    json(res, 404, { error: 'not found' });
  });

  startFlushing();
  startCleanup();

  server.on('close', () => {
    if (flushTimer) clearInterval(flushTimer);
    if (cleanupTimer) clearInterval(cleanupTimer);
  });

  return new Promise(resolve => {
    server.listen(opts.port, opts.host ?? '127.0.0.1', () => resolve(server));
  });
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test src/__tests__/server.test.ts`
Expected: PASS (5 tests)

**Step 5: Commit**

```bash
git add packages/core/src/server.ts packages/core/src/__tests__/server.test.ts
git commit -m "add sidecar HTTP server with span ingestion, SSE, and query API"
```

---

### Task 8: Wire Up Exports and Integration Test

**Files:**
- Modify: `packages/core/src/index.ts`
- Create: `packages/core/src/__tests__/integration.test.ts`

**Step 1: Write the integration test**

This test validates the full pipeline: ingest spans via HTTP → EventBus → RingBuffer → SSE broadcast + FileStore persistence.

```ts
// packages/core/src/__tests__/integration.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { createServer } from '../server.js';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Server } from 'node:http';

describe('Integration: full pipeline', () => {
  let server: Server;
  let dataDir: string;
  const port = 26789;

  afterEach(async () => {
    if (server) await new Promise<void>(r => server.close(() => r()));
    if (dataDir) await rm(dataDir, { recursive: true });
  });

  it('ingests spans, serves via SSE backfill, and flushes to disk', async () => {
    dataDir = await mkdtemp(join(tmpdir(), 'nextdog-integration-'));
    server = await createServer({ port, dataDir });

    // Ingest 3 spans
    for (let i = 1; i <= 3; i++) {
      await fetch(`http://localhost:${port}/v1/spans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spans: [{
            traceId: `trace-${i}`, spanId: `span-${i}`, name: `op-${i}`,
            kind: 'SERVER', startTimeUnixNano: String(i * 1000000),
            endTimeUnixNano: String(i * 1000000 + 500),
            attributes: {}, status: { code: 'OK' }, serviceName: 'integration-test',
          }],
        }),
      });
    }

    // Query recent spans from ring buffer
    const recentRes = await fetch(`http://localhost:${port}/api/spans?last=10`);
    const recent = await recentRes.json();
    expect(recent.spans).toHaveLength(3);

    // Services list
    const svcRes = await fetch(`http://localhost:${port}/api/services`);
    const svcs = await svcRes.json();
    expect(svcs.services).toContain('integration-test');

    // Wait for flush interval (2s) + small buffer
    await new Promise(r => setTimeout(r, 2500));

    // Verify files written to disk
    const files = await readdir(dataDir);
    expect(files.length).toBeGreaterThanOrEqual(1);
    expect(files[0]).toMatch(/\.ndjson$/);
  }, 10000);
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/core && pnpm test src/__tests__/integration.test.ts`
Expected: FAIL (server module not fully wired or index.ts exports wrong)

**Step 3: Ensure index.ts exports are correct**

Verify `packages/core/src/index.ts` exports match the actual modules created:

```ts
// packages/core/src/index.ts
export { EventBus } from './event-bus.js';
export { RingBuffer } from './ring-buffer.js';
export { FileStore } from './file-store.js';
export { SSEStream } from './sse-stream.js';
export { createServer } from './server.js';
export type { Span, LogEntry, NextDogEvent } from './types.js';
export type { QueryOptions } from './file-store.js';
export type { ServerOptions } from './server.js';
```

**Step 4: Run test to verify it passes**

Run: `cd packages/core && pnpm test`
Expected: ALL PASS (types, event-bus, ring-buffer, file-store, sse-stream, server, integration)

**Step 5: Commit**

```bash
git add packages/core/src/index.ts packages/core/src/__tests__/integration.test.ts
git commit -m "add integration test and finalize core package exports"
```

---

### Task 9: Sidecar CLI Entry Point

**Files:**
- Create: `packages/core/src/cli.ts`
- Modify: `packages/core/package.json` (add `bin` field)

**Step 1: Write the CLI entry point**

```ts
// packages/core/src/cli.ts
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
```

**Step 2: Add bin field to package.json**

Add to `packages/core/package.json`:
```json
{
  "bin": {
    "nextdog": "./dist/cli.js"
  }
}
```

**Step 3: Build and test manually**

Run: `cd packages/core && pnpm build`
Expected: compiles without errors

Run: `node dist/cli.js &`
Expected: prints `[nextdog] sidecar running at http://127.0.0.1:6789`

Run: `curl http://localhost:6789/health`
Expected: `{"status":"ok","uptime":...}`

Run: `kill %1` (stop background server)

**Step 4: Commit**

```bash
git add packages/core/src/cli.ts packages/core/package.json
git commit -m "add sidecar CLI entry point with env var configuration"
```

---

### Task 10: Build Verification

**Step 1: Full build from root**

Run: `pnpm install && pnpm build`
Expected: all packages compile without errors

**Step 2: Full test suite from root**

Run: `pnpm test`
Expected: all tests pass across all packages

**Step 3: Commit any fixes if needed, then tag**

```bash
git add -A
git commit -m "finalize @nextdog/core v0.0.1"
```
