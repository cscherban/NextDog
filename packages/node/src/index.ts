export { NextDogExporter } from './exporter.js';
export { ensureSidecar } from './sidecar.js';
export { patchConsole } from './console-patch.js';
export { startRequestCapture, getRequestMetadata } from './request-capture.js';
export type { RequestMetadata } from './request-capture.js';
export {
  requestContextStorage,
  createRequestContext,
  getRequestContext,
} from './request-context.js';
export type { RequestContext } from './request-context.js';
