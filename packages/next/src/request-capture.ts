/**
 * Captures HTTP request metadata (headers, cookies, body) and stores it
 * so the span exporter can enrich spans with this data for replay.
 *
 * Works by monkey-patching Node's http.Server to intercept incoming requests
 * before Next.js processes them. Metadata is stored keyed by traceId
 * (extracted from the active OTel span context at request time).
 */
import * as http from 'node:http';
import { trace } from '@opentelemetry/api';

export interface RequestMetadata {
  method: string;
  url: string;
  headers: Record<string, string>;
  cookies: string;
  body?: string;
}

// Store captured request metadata keyed by traceId
const requestStore = new Map<string, RequestMetadata>();

// Max body size to capture (16KB — enough for API payloads, avoids memory issues)
const MAX_BODY_SIZE = 16 * 1024;

// Cleanup entries older than 60s to prevent memory leaks
const CLEANUP_INTERVAL = 30_000;
const MAX_AGE = 60_000;
const timestamps = new Map<string, number>();

function captureHeaders(req: http.IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value && key !== 'host') {
      headers[key] = Array.isArray(value) ? value.join(', ') : value;
    }
  }
  return headers;
}

function captureBody(req: http.IncomingMessage, metadata: RequestMetadata): void {
  const method = (req.method ?? 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;

  const chunks: Buffer[] = [];
  let size = 0;
  let timeout: ReturnType<typeof setTimeout> | undefined;

  req.on('data', (chunk: Buffer) => {
    if (size < MAX_BODY_SIZE) {
      chunks.push(chunk);
      size += chunk.length;
    }
  });

  req.on('end', () => {
    if (timeout) clearTimeout(timeout);
    if (chunks.length > 0) {
      const body = Buffer.concat(chunks).toString('utf-8');
      metadata.body = body.length > MAX_BODY_SIZE ? body.slice(0, MAX_BODY_SIZE) : body;
    }
  });

  // Safety timeout — release chunk references if body never completes
  timeout = setTimeout(() => {
    if (chunks.length > 0) {
      metadata.body = Buffer.concat(chunks).toString('utf-8');
    }
    chunks.length = 0;
  }, 5000);
  if (timeout.unref) timeout.unref();
}

export function getRequestMetadata(traceId: string): RequestMetadata | undefined {
  return requestStore.get(traceId);
}

function cleanup() {
  const now = Date.now();
  for (const [key, ts] of timestamps) {
    if (now - ts > MAX_AGE) {
      requestStore.delete(key);
      timestamps.delete(key);
    }
  }
}

export function startRequestCapture() {
  const timer = setInterval(cleanup, CLEANUP_INTERVAL);
  timer.unref();

  const originalEmit = http.Server.prototype.emit;

  http.Server.prototype.emit = function (event: string, ...args: unknown[]) {
    if (event === 'request') {
      const req = args[0] as http.IncomingMessage;

      const headers = captureHeaders(req);
      const metadata: RequestMetadata = {
        method: req.method ?? 'GET',
        url: req.url ?? '/',
        headers,
        cookies: headers['cookie'] ?? '',
      };

      // Capture body asynchronously (mutates metadata.body when ready)
      captureBody(req, metadata);

      // Eagerly try to get traceId from the active span context NOW,
      // not on res.finish (where the async context may be gone).
      // OTel HTTP instrumentation creates the span before emitting 'request',
      // so the active span should be available here.
      const activeSpan = trace.getActiveSpan();
      const traceId = activeSpan?.spanContext().traceId;

      if (traceId) {
        requestStore.set(traceId, metadata);
        timestamps.set(traceId, Date.now());
      } else {
        // Fallback: try again after a microtask (OTel may set up context async)
        queueMicrotask(() => {
          const span = trace.getActiveSpan();
          const id = span?.spanContext().traceId;
          if (id) {
            requestStore.set(id, metadata);
            timestamps.set(id, Date.now());
          }
        });
      }
    }

    return originalEmit.apply(this, [event, ...args]);
  };
}
