# @nextdog/sveltekit — SvelteKit Adapter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `@nextdog/sveltekit` — a SvelteKit plugin that integrates NextDog with zero config.

**Architecture:** SvelteKit uses Vite plugins for build-time hooks and `hooks.server.ts` for runtime request interception. We provide a Vite plugin (for config injection) and a `handle` hook wrapper (for request capture + OTel).

**Tech Stack:** TypeScript, SvelteKit hooks API, Vite plugin API, `@opentelemetry/sdk-trace-node`.

---

## Key SvelteKit Concepts

- **Vite Plugin** — SvelteKit is Vite-based; config-level changes go through Vite plugins
- **`hooks.server.ts`** — server-side request lifecycle hooks. The `handle` function wraps every request.
- **`+server.ts`** / `+page.server.ts` — route handlers and server load functions
- **No `instrumentation.ts`** — SvelteKit doesn't have Next.js's register pattern

## User-Facing API

```ts
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { nextdog } from '@nextdog/sveltekit/vite';

export default defineConfig({
  plugins: [sveltekit(), nextdog()],
});
```

```ts
// src/hooks.server.ts
import { withNextDog } from '@nextdog/sveltekit';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = withNextDog();

// OR compose with existing hooks:
import { sequence } from '@sveltejs/kit/hooks';
export const handle = sequence(withNextDog(), myOtherHook);
```

Two touch points, both explicit and composable.

---

### Task 1: Scaffold `@nextdog/sveltekit` Package

**Files:**
- Create: `packages/sveltekit/package.json`
- Create: `packages/sveltekit/tsconfig.json`
- Create: `packages/sveltekit/src/index.ts` — exports `withNextDog` handle wrapper
- Create: `packages/sveltekit/src/vite.ts` — exports `nextdog` Vite plugin

`packages/sveltekit/package.json`:
```json
{
  "name": "@nextdog/sveltekit",
  "version": "0.0.1",
  "type": "module",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    },
    "./vite": {
      "import": "./dist/vite.js",
      "types": "./dist/vite.d.ts"
    }
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
    "vite": "^6",
    "vitest": "^3"
  },
  "peerDependencies": {
    "@sveltejs/kit": "^2"
  }
}
```

**Step 2: Commit**
```bash
git add packages/sveltekit
git commit -m "scaffold @nextdog/sveltekit package"
```

---

### Task 2: Vite Plugin

**Files:**
- Create: `packages/sveltekit/src/vite.ts`

The Vite plugin:
1. Injects `NEXTDOG_URL` and `NEXTDOG_SERVICE_NAME` env vars
2. No-ops in production/build mode

```ts
// packages/sveltekit/src/vite.ts
import type { Plugin } from 'vite';

export interface NextDogViteOptions {
  serviceName?: string;
  url?: string;
}

export function nextdog(options?: NextDogViteOptions): Plugin {
  return {
    name: 'nextdog',
    configResolved(config) {
      if (config.mode === 'production') return;
      process.env.NEXTDOG_URL = options?.url ?? 'http://localhost:6789';
      process.env.NEXTDOG_SERVICE_NAME = options?.serviceName ?? 'nextdog-app';
    },
  };
}
```

---

### Task 3: Handle Hook Wrapper

**Files:**
- Create: `packages/sveltekit/src/index.ts`

The `withNextDog()` function returns a SvelteKit `Handle` that:
1. On first call: initializes OTel, patches console, spawns sidecar
2. On every request: wraps the resolve in AsyncLocalStorage for request context
3. Captures request metadata for replay

```ts
// packages/sveltekit/src/index.ts
import type { Handle } from '@sveltejs/kit';

export interface NextDogOptions {
  serviceName?: string;
  url?: string;
}

export function withNextDog(options?: NextDogOptions): Handle {
  const url = options?.url ?? process.env.NEXTDOG_URL ?? 'http://localhost:6789';
  const serviceName = options?.serviceName ?? process.env.NEXTDOG_SERVICE_NAME ?? 'nextdog-app';

  let initialized = false;

  return async ({ event, resolve }) => {
    // Skip in production
    if (process.env.NODE_ENV === 'production') {
      return resolve(event);
    }

    // One-time init
    if (!initialized) {
      initialized = true;

      const { NodeTracerProvider, BatchSpanProcessor } = await import('@opentelemetry/sdk-trace-node');
      const { Resource } = await import('@opentelemetry/resources');
      const { ATTR_SERVICE_NAME } = await import('@opentelemetry/semantic-conventions');
      const { NextDogExporter } = await import('@nextdog/next/exporter');
      const { ensureSidecar } = await import('@nextdog/next/sidecar');
      const { patchConsole } = await import('@nextdog/next/console-patch');
      const { startRequestCapture } = await import('@nextdog/next/request-capture');

      await ensureSidecar(url);

      const provider = new NodeTracerProvider({
        resource: new Resource({ [ATTR_SERVICE_NAME]: serviceName }),
        spanProcessors: [new BatchSpanProcessor(new NextDogExporter(url))],
      });
      provider.register();

      patchConsole(url, serviceName);
      startRequestCapture();

      console.log(`[nextdog] sveltekit instrumentation registered for "${serviceName}" → ${url}`);
    }

    // Create a span for this request
    const { trace } = await import('@opentelemetry/api');
    const tracer = trace.getTracer('nextdog-sveltekit');

    return tracer.startActiveSpan(`${event.request.method} ${event.url.pathname}`, async (span) => {
      try {
        span.setAttribute('http.method', event.request.method);
        span.setAttribute('http.route', event.route?.id ?? event.url.pathname);
        span.setAttribute('http.target', event.url.pathname);

        const response = await resolve(event);

        span.setAttribute('http.status_code', response.status);
        if (response.status >= 400) {
          span.setStatus({ code: 2 }); // ERROR
        }

        return response;
      } catch (err) {
        span.setStatus({ code: 2, message: (err as Error).message });
        throw err;
      } finally {
        span.end();
      }
    });
  };
}
```

**Note:** Same dependency on `@nextdog/next` internals as the Nuxt adapter.
Task 4 in the Nuxt plan (extract shared Node instrumentation) should be done first.

---

### Task 4: Integration Test

**Files:**
- Create: `packages/sveltekit/src/__tests__/handle.test.ts`

Test that:
1. `withNextDog()` returns a valid Handle function
2. It no-ops in production
3. It creates spans with correct attributes

---

### Task 5: Build and Verify

```bash
pnpm build
pnpm test
git commit -m "complete @nextdog/sveltekit adapter"
```
