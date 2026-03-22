# NextDog v1 Design

Zero-config dev observability for Next.js. Datadog DX, no infrastructure.

## Monorepo Structure

```
nextdog/
├── packages/
│   ├── core/          # @nextdog/core — file store, event bus, OTel exporter, sidecar server
│   ├── next/          # @nextdog/next — next.config.js plugin + instrumentation hook
│   └── ui/            # @nextdog/ui — static dashboard bundle (Preact + Vite)
├── package.json       # pnpm workspace root
├── tsconfig.json      # shared base tsconfig
└── turbo.json         # build orchestration
```

- **pnpm workspaces** for package management
- **Turborepo** for build/test orchestration
- **TypeScript** throughout, strict mode
- **Preact** for UI (3KB vs React's 40KB+), bundled with Vite into static assets
- **Raw Node `http`** for the sidecar — zero server dependencies

## Architecture: Event-Driven Pipeline

```
                    ┌─────────────────────────────────┐
  Spans from apps → │  Sidecar HTTP Server (:6789)    │
  POST /v1/spans    │  ┌───────────────────────────┐  │
                    │  │       EventBus             │  │
                    │  │  (typed EventEmitter)      │  │
                    │  └──┬──────────┬──────────┬───┘  │
                    │     │          │          │       │
                    │     ▼          ▼          ▼       │
                    │  RingBuffer  FileStore  SSEStream │
                    │  (500 entries) (NDJSON)  (clients)│
                    └─────────────────────────────────┘
```

Components are separate modules connected by a typed EventBus (Node EventEmitter wrapper). No shared mutable state between components. Each is independently testable.

### EventBus

Thin typed wrapper over `EventEmitter`. Two event types:
- `span` — an OTel-format span arrived
- `log` — a structured log entry arrived

### RingBuffer

Fixed-size circular array of 500 entries. Dual purpose:
- **Read cache** — SSE live tail subscribers get last N entries as backfill, then live events. Recent query API serves from here.
- **Write buffer** — batches writes before flushing to FileStore (every 2s or 100 entries, whichever first).

### FileStore

Writes to `~/.nextdog/data/`:
- NDJSON format, one file per hour: `2026-03-21-13.ndjson`
- Every line includes `service.name`, `traceId`, `spanId`, timestamps, attributes
- Background cleanup deletes files older than 24h

### SSEStream

Manages connected browser clients:
- `GET /sse` — new connection gets last 50 entries from RingBuffer, then live events
- Each message is JSON with `type` field (`span` | `log`) for client-side filtering
- Firehose model — no server-side filtering for v1. Structured message format supports adding it later.

## Sidecar HTTP Server

Single process on port 6789, raw Node `http` module.

### API

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/v1/spans` | Ingest OTel spans from apps |
| `GET` | `/api/spans` | Query spans (`?service=`, `?last=N`, `?traceId=`) |
| `GET` | `/api/services` | List active service names |
| `GET` | `/sse` | SSE live tail stream |
| `GET` | `/health` | Health check + PID liveness |
| `GET` | `/*` | Static UI bundle (index.html, JS, CSS) |

### Details
- Simple router matching `method + pathname`
- CORS enabled for all origins (dev tool)
- `POST /v1/spans` accepts OTel JSON format directly
- Static files served with correct `Content-Type` and aggressive `Cache-Control`
- `NEXTDOG_URL` env var configures bind address (default `http://localhost:6789`). Supports `0.0.0.0` for Docker.

### Lifecycle
- First app to boot spawns the sidecar as a **detached background process** (`child_process.spawn` with `detached: true`)
- PID file at `~/.nextdog/nextdog.pid` — checked with `process.kill(pid, 0)` to verify liveness
- Subsequent apps detect it's running and send spans to it
- Sidecar shuts down after a grace period (30s) with no incoming spans
- App crashes don't affect the sidecar — it's a separate process

### Multi-App Support
- All apps POST to the same sidecar
- Every span carries `service.name` (set by `@nextdog/next` from `package.json` name or config)
- UI filters/groups by service
- Docker: set `NEXTDOG_URL=http://nextdog:6789` in docker-compose, sidecar binds `0.0.0.0`

## `@nextdog/next` — Plugin & Instrumentation

### `next.config.js` plugin

```js
const { withNextDog } = require('@nextdog/next');
module.exports = withNextDog({ /* normal Next.js config */ });
```

- Injects `NEXTDOG_URL` and `NEXTDOG_SERVICE_NAME` into env (no experimental flags needed — `instrumentation.ts` is built-in since Next.js 15)
- **No-ops completely** when `NODE_ENV === 'production'`

### `instrumentation.ts` hook

```ts
export async function register() {
  await import('@nextdog/next/register');
}
```

`@nextdog/next/register`:
- Registers a custom `SpanExporter` that POSTs OTel spans to the sidecar
- Uses `BatchSpanProcessor` to batch spans before sending
- Spawns sidecar if not running (PID file check)
- Sets `service.name` resource attribute from `NEXTDOG_SERVICE_NAME`
- Uses `AsyncLocalStorage` for trace ID propagation across async boundaries

### Dev-Only Guarantee
- `withNextDog()` is a passthrough in production
- `register` checks `NODE_ENV` and exits immediately if not `development`
- Tree-shaking friendly

## `@nextdog/ui` — Dashboard

**Preact + Vite**, compiled to static bundle (~30-50KB), served by sidecar.

### Views

**Live Tail** (default):
- Real-time stream via SSE. Rows show timestamp, service, route, duration, status.
- Color-coded by status. Auto-scrolls with pause button.
- Virtualized list rendering — handles thousands of entries without jank.

**Requests View** (Next.js-specific):
- Groups spans/logs by HTTP request via `traceId` correlation
- Each row: method, route, status code, total duration, service name
- Expand to see full request lifecycle: middleware → route handler → DB call → response, plus all logs emitted during that request
- Sort by duration (find slow requests), filter by status (find errors)

**Trace Waterfall:**
- Click a trace ID → vertical waterfall with duration bars
- Shows nested span hierarchy for a single request

### Attribute Filtering
- Click any attribute value in a log row to filter by it (faceted search)
- Typed queries: `level:error route:/api/users duration:>500ms`
- Auto-discovered facets — no schema config. UI scans incoming entries and builds facet sidebar dynamically.

### UX
- No loading spinners — SSE + RingBuffer backfill gives immediate content
- Keyboard shortcuts: `j/k` navigate, `Enter` open trace, `Esc` back
- Dark mode default, minimal CSS (~2KB), no CSS framework
- Service filter pills in top bar, multi-select

### Dev Mode (`NEXTDOG_UI_DEV=true`)
- `GET /*` proxies to `localhost:5173` (Vite dev server) instead of serving static files
- Only for UI development, zero cost when not active
