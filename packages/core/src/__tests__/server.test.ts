import { describe, it, expect, afterEach } from 'vitest';
import { createServer } from '../server.js';
import { request as httpRequest, type Server } from 'node:http';

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
    const res = await new Promise<{ status: number; headers: Record<string, string | string[] | undefined> }>(resolve => {
      const req = httpRequest(`http://localhost:${port}/v1/spans`, { method: 'OPTIONS' }, (res) => {
        resolve({ status: res.statusCode!, headers: res.headers });
      });
      req.end();
    });
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });

  it('returns 404 for unknown API routes', async () => {
    server = await createServer({ port, dataDir: '/tmp/nextdog-test-server' });
    const res = await fetch(`http://localhost:${port}/api/unknown`);
    expect(res.status).toBe(404);
  });
});
