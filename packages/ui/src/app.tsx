import Router from 'preact-router';
import { useState, useCallback, useMemo, useEffect, useRef } from 'preact/hooks';
import { useSSE } from './hooks/use-sse.js';
import { useEvents } from './hooks/use-events.js';
import { useTheme } from './hooks/use-theme.js';
import { Requests } from './views/requests.js';
import { Logs } from './views/logs.js';
import { Trace } from './views/trace.js';
import { DetailPane } from './components/detail-pane.js';
import { Logo } from './components/logo.js';
import { ThemeToggle } from './components/theme-toggle.js';
import { Sparkline } from './components/sparkline.js';
import { EmptyState } from './components/empty-state.js';
import { ToastContainer, useToasts } from './components/toast.js';

const SIDECAR_URL = window.location.port === '5173'
  ? 'http://localhost:6789'
  : window.location.origin;

/** Threshold for slow request toasts (ms) */
const SLOW_REQUEST_MS = 1000;

function formatDurationMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function App() {
  const [currentPath, setCurrentPath] = useState('/');
  const { events, connected, error, clearEvents } = useSSE(SIDECAR_URL);
  const eventsResult = useEvents(events);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const { theme, cycle } = useTheme();
  const { toasts, addToast, removeToast } = useToasts();

  const spanCount = useMemo(() => events.filter((e) => e.type === 'span').length, [events]);
  const logCount = useMemo(() => events.filter((e) => e.type === 'log').length, [events]);

  // Track seen traces to avoid duplicate toasts
  const seenTraces = useRef(new Set<string>());

  // Slow request detection
  useEffect(() => {
    for (const event of events) {
      if (event.type !== 'span') continue;
      if (!event.data.traceId) continue;
      if (seenTraces.current.has(event.data.traceId)) continue;
      if (event.data.kind !== 'SERVER') continue;

      seenTraces.current.add(event.data.traceId);

      if (event.data.startTimeUnixNano && event.data.endTimeUnixNano) {
        const start = BigInt(String(event.data.startTimeUnixNano).replace('n', ''));
        const end = BigInt(String(event.data.endTimeUnixNano).replace('n', ''));
        const ms = Number(end - start) / 1_000_000;
        if (ms >= SLOW_REQUEST_MS) {
          const route = String(event.data.attributes['http.route'] ?? event.data.attributes['http.target'] ?? event.data.name);
          const method = String(event.data.attributes['http.method'] ?? 'GET');
          addToast({
            message: `${method} ${route}`,
            type: ms >= 3000 ? 'error' : 'warning',
            traceId: event.data.traceId,
            duration: formatDurationMs(ms),
          });
        }
      }
    }
  }, [events, addToast]);

  const handleRoute = useCallback((e: { url: string }) => {
    setCurrentPath(e.url);
  }, []);

  const openTrace = useCallback((traceId: string) => {
    setSelectedTraceId(traceId);
  }, []);

  const closePane = useCallback(() => {
    setSelectedTraceId(null);
  }, []);

  const handleFilter = useCallback((key: string, value: string) => {
    eventsResult.setSearchQuery((prev: string) => {
      const filter = `${key}:${value}`;
      if (prev.includes(filter)) return prev;
      return prev ? `${prev} ${filter}` : filter;
    });
    setSelectedTraceId(null);
  }, [eventsResult]);

  const handleClear = useCallback(() => {
    clearEvents();
    seenTraces.current.clear();
  }, [clearEvents]);

  const navClass = (path: string) => currentPath === path ? 'active' : '';

  const isEmpty = events.length === 0;

  return (
    <div class="app">
      <header class="header">
        <Logo size={24} />
        <h1>NextDog</h1>
        <nav class="nav">
          <a href="/" class={navClass('/')}>
            Spans
            {spanCount > 0 && <span class="nav-badge">{spanCount > 999 ? '999+' : spanCount}</span>}
          </a>
          <a href="/logs" class={navClass('/logs')}>
            Logs
            {logCount > 0 && <span class="nav-badge">{logCount > 999 ? '999+' : logCount}</span>}
          </a>
        </nav>
        <div style="margin-left:auto;display:flex;align-items:center;gap:8px">
          <Sparkline events={events} />
          {events.length > 0 && (
            <button
              class="pill"
              onClick={handleClear}
              title="Clear all events"
              style="font-size:11px"
            >
              Clear
            </button>
          )}
          <span class={`connection-status ${connected ? 'connected' : ''}`}>
            {connected ? 'Connected' : error ?? 'Disconnected'}
          </span>
          <ThemeToggle theme={theme} onCycle={cycle} />
        </div>
      </header>
      <div class="main">
        {isEmpty ? (
          <EmptyState connected={connected} />
        ) : (
          <Router onChange={handleRoute}>
            <Requests path="/" eventsResult={eventsResult} onOpenTrace={openTrace} />
            <Logs path="/logs" eventsResult={eventsResult} allEvents={events} onOpenTrace={openTrace} onFilter={handleFilter} />
            <Trace path="/trace/:traceId" events={events} />
          </Router>
        )}
      </div>

      {selectedTraceId && (
        <DetailPane
          traceId={selectedTraceId}
          events={events}
          onClose={closePane}
          onFilter={handleFilter}
        />
      )}

      <ToastContainer toasts={toasts} removeToast={removeToast} onOpenTrace={openTrace} />
    </div>
  );
}
