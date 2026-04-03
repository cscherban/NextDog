# @nextdog/nuxt — Nuxt Adapter Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build `@nextdog/nuxt` — a Nuxt module that integrates NextDog into Nuxt 3 apps with zero config.

**Architecture:** Nuxt 3 has a module system (`defineNuxtModule`) that hooks into the build and runtime. We register a server plugin that sets up OTel tracing + console capture, and auto-spawns the sidecar. The pattern mirrors `@nextdog/next` but uses Nuxt's conventions.

**Tech Stack:** TypeScript, Nuxt 3 module API, Nitro server hooks, `@opentelemetry/sdk-trace-node`.

---

## Key Nuxt 3 Concepts

- **Nuxt Modules** — `defineNuxtModule()` is the plugin entry point (like `withNextDog()`)
- **Nitro** — Nuxt's server engine. Server plugins go in `server/plugins/`
- **Server Hooks** — Nitro has `request`/`afterResponse` hooks for middleware-like behavior
- **`nuxt.config.ts`** — config file where modules are registered

## User-Facing API

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nextdog/nuxt'],
  nextdog: {
    serviceName: 'my-nuxt-app',  // optional
    url: 'http://localhost:6789', // optional
  },
});
```

That's it. No `instrumentation.ts`, no manual setup.

---

### Task 1: Scaffold `@nextdog/nuxt` Package

**Files:**
- Create: `packages/nuxt/package.json`
- Create: `packages/nuxt/tsconfig.json`
- Create: `packages/nuxt/src/module.ts`
- Create: `packages/nuxt/src/runtime/server-plugin.ts`
- Create: `packages/nuxt/src/runtime/console-patch.ts`

**Step 1: Create package skeleton**

`packages/nuxt/package.json`:
```json
{
  "name": "@nextdog/nuxt",
  "version": "0.0.1",
  "type": "module",
  "main": "./dist/module.js",
  "types": "./dist/module.d.ts",
  "exports": {
    ".": {
      "import": "./dist/module.js",
      "types": "./dist/module.d.ts"
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
    "@nuxt/kit": "^3",
    "vitest": "^3"
  },
  "peerDependencies": {
    "nuxt": "^3.8.0"
  }
}
```

**Step 2: Commit**
```bash
git add packages/nuxt
git commit -m "scaffold @nextdog/nuxt package"
```

---

### Task 2: Nuxt Module Entry Point

**Files:**
- Create: `packages/nuxt/src/module.ts`

The module:
1. Reads options from `nuxt.config.ts` `nextdog` key
2. Skips entirely in production
3. Adds a Nitro server plugin that sets up OTel + console capture
4. Spawns the sidecar if not running

```ts
// packages/nuxt/src/module.ts
import { defineNuxtModule, addServerPlugin, createResolver } from '@nuxt/kit';

export interface NextDogOptions {
  serviceName?: string;
  url?: string;
}

export default defineNuxtModule<NextDogOptions>({
  meta: {
    name: '@nextdog/nuxt',
    configKey: 'nextdog',
  },
  defaults: {
    serviceName: 'nextdog-app',
    url: 'http://localhost:6789',
  },
  setup(options, nuxt) {
    // Dev only
    if (!nuxt.options.dev) return;

    const { resolve } = createResolver(import.meta.url);

    // Inject env vars for the runtime plugin
    nuxt.options.runtimeConfig.nextdog = {
      url: options.url!,
      serviceName: options.serviceName!,
    };

    // Add server plugin (runs on Nitro startup)
    addServerPlugin(resolve('./runtime/server-plugin'));
  },
});
```

**Step 3: Run test, commit**
```bash
pnpm test
git commit -m "add nuxt module entry point"
```

---

### Task 3: Nitro Server Plugin

**Files:**
- Create: `packages/nuxt/src/runtime/server-plugin.ts`

This plugin runs when Nitro starts. It:
1. Registers the OTel span exporter (same as `@nextdog/next/register`)
2. Patches console for log capture
3. Spawns the sidecar

```ts
// packages/nuxt/src/runtime/server-plugin.ts
import { NodeTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

export default defineNitroPlugin(async (nitro) => {
  const config = useRuntimeConfig();
  const { url, serviceName } = config.nextdog;

  // Import from @nextdog/next — reuse exporter and sidecar logic
  const { NextDogExporter } = await import('@nextdog/next/exporter');
  const { ensureSidecar } = await import('@nextdog/next/sidecar');
  const { patchConsole } = await import('@nextdog/next/console-patch');

  await ensureSidecar(url);

  const provider = new NodeTracerProvider({
    resource: new Resource({ [ATTR_SERVICE_NAME]: serviceName }),
    spanProcessors: [new BatchSpanProcessor(new NextDogExporter(url))],
  });
  provider.register();

  patchConsole(url, serviceName);

  console.log(`[nextdog] nuxt instrumentation registered for "${serviceName}" → ${url}`);
});
```

**Note:** This reuses `@nextdog/next`'s exporter, sidecar, and console-patch modules.
We may want to extract these into `@nextdog/core` or a shared `@nextdog/node` package
to avoid the Nuxt adapter depending on `@nextdog/next`.

**Step 4: Run test, commit**
```bash
pnpm test
git commit -m "add nitro server plugin with OTel + console capture"
```

---

### Task 4: Extract Shared Node Instrumentation

Before completing the Nuxt adapter, extract the shared instrumentation code
from `@nextdog/next` into reusable exports that both `@nextdog/next` and
`@nextdog/nuxt` can consume.

**Files to refactor:**
- `packages/next/src/exporter.ts` → export from package entry
- `packages/next/src/sidecar.ts` → export from package entry
- `packages/next/src/console-patch.ts` → export from package entry
- `packages/next/src/request-capture.ts` → export from package entry
- `packages/next/src/request-context.ts` → export from package entry

Add to `packages/next/package.json` exports:
```json
{
  "exports": {
    ".": "./dist/index.js",
    "./register": "./dist/register.js",
    "./exporter": "./dist/exporter.js",
    "./sidecar": "./dist/sidecar.js",
    "./console-patch": "./dist/console-patch.js",
    "./request-capture": "./dist/request-capture.js",
    "./request-context": "./dist/request-context.js"
  }
}
```

**Alternative:** Create `@nextdog/node` as a shared package. Decide based on
whether the Nuxt adapter depending on `@nextdog/next` feels wrong semantically.

---

### Task 5: Integration Test

**Files:**
- Create: `packages/nuxt/src/__tests__/module.test.ts`

Test that the module:
1. Adds the server plugin path
2. Sets runtime config
3. No-ops in production

---

### Task 6: Build and Verify

```bash
pnpm build
pnpm test
git commit -m "complete @nextdog/nuxt adapter"
```
