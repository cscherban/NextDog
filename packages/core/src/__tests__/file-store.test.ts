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
