/**
 * Captures HTTP request metadata (headers, cookies, body) and stores it
 * so the span exporter can enrich spans with this data for replay.
 *
 * Works by monkey-patching Node's http.Server to intercept incoming requests.
 * Metadata is stored keyed by "method url" for correlation with OTel spans
 * in the exporter (since the OTel active span is not available at request time).
 */
import * as http from 'node:http';

export interface RequestMetadata {
  method: string;
  url: string;
  headers: Record<string, string>;
  cookies: string;
  body?: string;
  capturedAt: number;
}

// Store captured request metadata keyed by "METHOD url" for recent lookups
// Multiple requests to the same URL are stored as a stack (most recent first)
const requestStore = new Map<string, RequestMetadata[]>();

// Max body size to capture (16KB — enough for API payloads, avoids memory issues)
const MAX_BODY_SIZE = 16 * 1024;

// Cleanup entries older than 60s to prevent memory leaks
const CLEANUP_INTERVAL = 30_000;
const MAX_AGE = 60_000;

function captureHeaders(req: http.IncomingMessage): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (value && key !== 'host') {
      headers[key] = Array.isArray(value) ? value.join(', ') : value;
    }
  }
  return headers;
}

/**
 * Capture the request body WITHOUT adding 'data' listeners (which would put
 * the stream into flowing mode and break Next.js 14's body parsing).
 * Instead, we monkey-patch req.on so that when Next.js (or any other consumer)
 * reads the body, we passively observe the chunks.
 */
function captureBody(req: http.IncomingMessage, metadata: RequestMetadata): void {
  const method = (req.method ?? 'GET').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;

  const chunks: Buffer[] = [];
  let size = 0;
  const originalOn = req.on;

  // Intercept listener registration to piggyback on whoever reads the body
  req.on = function (this: http.IncomingMessage, event: string, listener: (...args: any[]) => void) {
    if (event === 'data') {
      const self = this;
      const wrappedListener = (chunk: Buffer) => {
        if (size < MAX_BODY_SIZE) {
          chunks.push(chunk);
          size += chunk.length;
        }
        return listener.call(self, chunk);
      };
      return originalOn.call(this, event, wrappedListener);
    }
    if (event === 'end') {
      const self = this;
      const wrappedListener = (...args: any[]) => {
        if (chunks.length > 0) {
          const body = Buffer.concat(chunks).toString('utf-8');
          metadata.body = body.length > MAX_BODY_SIZE ? body.slice(0, MAX_BODY_SIZE) : body;
          chunks.length = 0;
        }
        return listener.call(self, ...args);
      };
      return originalOn.call(this, event, wrappedListener);
    }
    return originalOn.call(this, event, listener);
  } as typeof req.on;
}

/**
 * Look up request metadata by method + URL path.
 * Finds the most recent capture matching these fields.
 */
export function getRequestMetadata(method: string, url: string): RequestMetadata | undefined {
  const key = `${method} ${url}`;
  const stack = requestStore.get(key);
  if (!stack || stack.length === 0) return undefined;
  // Return and consume the oldest matching entry (FIFO — first request in, first matched)
  return stack.shift();
}

function cleanup() {
  const now = Date.now();
  for (const [key, stack] of requestStore) {
    const filtered = stack.filter((m) => now - m.capturedAt < MAX_AGE);
    if (filtered.length === 0) {
      requestStore.delete(key);
    } else {
      requestStore.set(key, filtered);
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
        capturedAt: Date.now(),
      };

      // Capture body asynchronously (mutates metadata.body when ready)
      captureBody(req, metadata);

      // Store keyed by method + url
      const key = `${metadata.method} ${metadata.url}`;
      const stack = requestStore.get(key);
      if (stack) {
        stack.push(metadata);
      } else {
        requestStore.set(key, [metadata]);
      }
    }

    return originalEmit.apply(this, [event, ...args]);
  };
}
