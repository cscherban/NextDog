# NextDog v1 — @nextdog/next + @nextdog/ui Design

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| OTel dependency | Full SDK | Real trace propagation, ecosystem compat, dev-only cost |
| Sidecar lifecycle | Health check first, PID fallback | Most robust, handles manual/Docker starts |
| UI scope | Full (Live Tail + Requests + Trace Waterfall) | Ship the complete experience |
| UI routing | preact-router | Clean URLs, 1.5KB, proper route params |

---

## @nextdog/next

### Structure

```
packages/next/src/
├── index.ts              # withNextDog() config plugin
├── register.ts           # instrumentation hook entry
├── exporter.ts           # SpanExporter → POST /v1/spans
├── sidecar.ts            # health check + PID spawn
└── __tests__/
    ├── exporter.test.ts
    ├── sidecar.test.ts
    └── with-nextdog.test.ts
```

### withNextDog(config)

Wraps next.config.js:
- Dev: sets `experimental.instrumentationHook: true`, injects `NEXTDOG_URL` + `NEXTDOG_SERVICE_NAME` into env
- Production: returns config unchanged (no-op)

### register.ts

Called from user's `instrumentation.ts` via `await import('@nextdog/next/register')`:
- Bails immediately if `NODE_ENV !== 'development'`
- Ensures sidecar is running via sidecar.ts
- Creates `NodeTracerProvider` with `service.name` resource
- Registers `BatchSpanProcessor` with `NextDogExporter`

### NextDogExporter

Implements OTel `SpanExporter`:
- `export(spans)`: converts `ReadableSpan[]` → our Span format, POSTs to `{NEXTDOG_URL}/v1/spans`
- `shutdown()`: flushes pending
- Uses built-in `fetch`

### sidecar.ts

1. `GET {NEXTDOG_URL}/health` — if 200, done
2. Check `~/.nextdog/nextdog.pid` — verify with `process.kill(pid, 0)`
3. Spawn: `child_process.spawn('node', [coreCliPath], { detached: true, stdio: 'ignore' })`, write PID, `.unref()`

### Dependencies

- `@opentelemetry/api`, `@opentelemetry/sdk-trace-node`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`
- `@nextdog/core` (for CLI path to spawn sidecar)

### Exports

- `@nextdog/next` → `withNextDog()`
- `@nextdog/next/register` → side-effectful instrumentation setup

---

## @nextdog/ui

### Structure

```
packages/ui/
├── src/
│   ├── index.tsx             # Preact app entry
│   ├── app.tsx               # Router + layout shell
│   ├── hooks/
│   │   ├── use-sse.ts        # SSE connection + event stream
│   │   ├── use-events.ts     # event store, filtering, service tracking
│   │   └── use-keyboard.ts   # j/k/Enter/Esc shortcuts
│   ├── views/
│   │   ├── live-tail.tsx      # real-time event stream
│   │   ├── requests.tsx       # grouped by traceId
│   │   └── trace.tsx          # waterfall for single trace
│   ├── components/
│   │   ├── event-row.tsx      # single span/log row
│   │   ├── service-pills.tsx  # service filter bar
│   │   ├── search-bar.tsx     # typed query input
│   │   ├── waterfall.tsx      # duration bar chart
│   │   └── virtual-list.tsx   # windowed rendering
│   └── styles/
│       └── index.css          # dark theme, minimal (~2KB)
├── index.html
├── vite.config.ts
├── package.json
└── tsconfig.json
```

### Data Flow

```
SSE /sse → useSSE hook → useEvents store → views
                                         → service pills (auto-discovered)
                                         → facet sidebar (auto-discovered)
```

### Views

**Live Tail** (`/`):
- SSE stream via `useSSE` hook. Rows: timestamp, service, route, duration, status.
- Color-coded by status. Auto-scroll with pause button.
- Virtualized list via `virtual-list.tsx`.

**Requests** (`/requests`):
- Groups events by `traceId`. Row: method, route, status, duration, service.
- Expand to see full request lifecycle.
- Sort by duration, filter by status.

**Trace Waterfall** (`/trace/:traceId`):
- Vertical waterfall with duration bars.
- Nested span hierarchy.
- Click from Live Tail or Requests to get here.

### Filtering

- Service pills in top bar (multi-select, auto-discovered from stream)
- Search bar: `level:error route:/api/users duration:>500ms`
- Click any attribute value → filter by it

### UX

- Dark mode default, no CSS framework
- Keyboard: j/k navigate, Enter open trace, Esc back
- No loading state — SSE backfill gives immediate content
- preact-router for clean URLs

### Dependencies

- `preact` + `preact-router`
- `vite` (build)
- No other runtime deps

### Core Sidecar Changes

Need to add to `@nextdog/core` server:
- SPA fallback: `GET /*` serves `index.html` for non-file, non-API routes
- Static file serving with `Content-Type` detection for the built UI assets

### Build Integration

- `@nextdog/ui` builds to `dist/` via Vite
- `@nextdog/core` copies or references UI dist for static serving
- Dev mode (`NEXTDOG_UI_DEV=true`): proxy `GET /*` to `localhost:5173`
