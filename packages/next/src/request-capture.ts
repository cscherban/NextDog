/**
 * Captures HTTP request metadata (headers, cookies, body) and stores it
 * so the span exporter can enrich spans with this data for replay.
 *
 * Works by monkey-patching Node's http.Server to intercept incoming requests
 * before Next.js processes them. Metadata is stored keyed by traceId
 * (extracted from the active OTel span context once available).
 */
import * as http from 'node:http';
import { trace, context } from '@opentelemetry/api';

export interface RequestMetadata {
  method: string;
  url: string;
  headers: Record<string, string>;
  cookies: string;
  body?: string;
}

// Store captured request metadata keyed by traceId
const requestStore = new Map<string, RequestMetadata>();

// Also store by a request fingerprint for correlation before traceId is available
const pendingRequests = new WeakMap<http.IncomingMessage, RequestMetadata>();

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

function captureBody(req: http.IncomingMessage): Promise<string | undefined> {
  return new Promise((resolve) => {
    const method = (req.method ?? 'GET').toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      return resolve(undefined);
    }

    const chunks: Buffer[] = [];
    let size = 0;

    // We need to be careful not to consume the body — use a listener that
    // doesn't interfere with Next.js reading the stream
    const originalOn = req.on.bind(req);
    let bodyResolved = false;

    // Listen for data but don't prevent Next.js from reading
    // Node streams support multiple 'data' listeners
    originalOn('data', (chunk: Buffer) => {
      if (size < MAX_BODY_SIZE) {
        chunks.push(chunk);
        size += chunk.length;
      }
    });

    originalOn('end', () => {
      if (!bodyResolved) {
        bodyResolved = true;
        if (chunks.length > 0) {
          const body = Buffer.concat(chunks).toString('utf-8');
          resolve(body.length > MAX_BODY_SIZE ? body.slice(0, MAX_BODY_SIZE) : body);
        } else {
          resolve(undefined);
        }
      }
    });

    // Timeout — don't wait forever
    setTimeout(() => {
      if (!bodyResolved) {
        bodyResolved = true;
        resolve(chunks.length > 0 ? Buffer.concat(chunks).toString('utf-8') : undefined);
      }
    }, 5000);
  });
}

export function getRequestMetadata(traceId: string): RequestMetadata | undefined {
  return requestStore.get(traceId);
}

export function getRequestMetadataFromReq(req: http.IncomingMessage): RequestMetadata | undefined {
  return pendingRequests.get(req);
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
  // Periodic cleanup
  const timer = setInterval(cleanup, CLEANUP_INTERVAL);
  timer.unref();

  // Monkey-patch http.Server to intercept requests
  const originalEmit = http.Server.prototype.emit;

  http.Server.prototype.emit = function (event: string, ...args: unknown[]) {
    if (event === 'request') {
      const req = args[0] as http.IncomingMessage;
      const res = args[1] as http.ServerResponse;

      const headers = captureHeaders(req);
      const metadata: RequestMetadata = {
        method: req.method ?? 'GET',
        url: req.url ?? '/',
        headers,
        cookies: headers['cookie'] ?? '',
      };

      // Store in WeakMap keyed by request for immediate access
      pendingRequests.set(req, metadata);

      // Capture body asynchronously (for POST/PUT/PATCH)
      captureBody(req).then((body) => {
        if (body) metadata.body = body;
      });

      // When the response finishes, try to correlate with the active trace
      res.on('finish', () => {
        // Try to get traceId from the active span context
        const activeSpan = trace.getActiveSpan();
        const traceId = activeSpan?.spanContext().traceId;
        if (traceId) {
          requestStore.set(traceId, metadata);
          timestamps.set(traceId, Date.now());
        }
      });
    }

    return originalEmit.apply(this, [event, ...args]);
  };
}
