import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextDogExporter } from '../exporter.js';

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
      spanContext: () => ({ traceId: 'abc123', spanId: 'def456', traceFlags: 1 }),
      parentSpanId: undefined,
      kind: 1,
      startTime: [1711000000, 0] as [number, number],
      endTime: [1711000000, 50000000] as [number, number],
      attributes: { 'http.method': 'GET' },
      status: { code: 0 },
      resource: { attributes: { 'service.name': 'my-app' } },
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

    expect(result.code).toBe(0);
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

    expect(result.code).toBe(1);
  });

  it('shutdown resolves cleanly', async () => {
    const exporter = new NextDogExporter('http://localhost:6789');
    await expect(exporter.shutdown()).resolves.toBeUndefined();
  });
});
