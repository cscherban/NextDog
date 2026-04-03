/**
 * AsyncLocalStorage-based request context that works independently of OTel.
 * Provides reliable request correlation for logs even when OTel's async
 * context propagation fails (common in Next.js 14).
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';

export interface RequestContext {
  requestId: string;
  method: string;
  path: string;
  startTime: number;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/** Create a new request context for the current request */
export function createRequestContext(method: string, url: string): RequestContext {
  return {
    requestId: randomUUID().slice(0, 8),
    method,
    path: url.split('?')[0], // Strip query params for cleaner grouping
    startTime: Date.now(),
  };
}

/** Get the current request context (if inside a request) */
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}
