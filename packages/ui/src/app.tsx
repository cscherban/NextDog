import Router from 'preact-router';
import { useState, useCallback, useMemo, useEffect, useRef } from 'preact/hooks';
import { css } from 'styled-system/css';
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
import { ShortcutHelp } from './components/shortcut-help.js';
import { ContextMenuContainer } from './components/context-menu.js';

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

const appStyle = css({
  display: 'flex',
  flexDirection: 'column',
  height: '100vh',
});

const headerStyle = css({
  display: 'flex',
  alignItems: 'center',
  gap: '4',
  padding: '2 4',
  borderBottom: '1px solid token(colors.border.subtle)',
  background: 'surface.panel',
});

const headerH1Style = css({
  fontSize: 'xl',
  fontWeight: 600,
  color: 'fg.bright',
});

const navStyle = css({
  display: 'flex',
  gap: '1',
});

const navLinkStyle = css({
  padding: '1 3',
  borderRadius: 'sm',
  color: 'fg.dim',
  fontSize: 'md',
  fontWeight: 500,
  textDecoration: 'none',
  _hover: {
    color: 'fg.bright',
    background: 'surface.hover',
  },
});

const navLinkActiveStyle = css({
  padding: '1 3',
  borderRadius: 'sm',
  fontSize: 'md',
  fontWeight: 500,
  textDecoration: 'none',
  color: 'fg.bright',
  background: 'surface.hover',
});

const navBadgeStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '18px',
  height: '16px',
  padding: '0 1',
  marginLeft: '1',
  borderRadius: 'lg',
  fontSize: 'xs',
  fontWeight: 600,
  background: 'token(colors.border.subtle)',
  color: 'fg.dim',
});

const navBadgeActiveStyle = css({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '18px',
  height: '16px',
  padding: '0 1',
  marginLeft: '1',
  borderRadius: 'lg',
  fontSize: 'xs',
  fontWeight: 600,
  background: 'accent',
  color: 'white',
});

const headerRightStyle = css({
  marginLeft: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: '2',
});

const pillStyle = css({
  padding: '2px 10px',
  borderRadius: '12px',
  fontSize: 'sm',
  fontWeight: 500,
  border: '1px solid token(colors.border.subtle)',
  cursor: 'pointer',
  background: 'transparent',
  color: 'fg.dim',
});

const connectionStatusBaseStyle = css({
  fontSize: 'sm',
  color: 'fg.dim',
  display: 'flex',
  alignItems: 'center',
  gap: '1',
  _before: {
    content: '""',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'red',
  },
});

const connectionStatusConnectedStyle = css({
  fontSize: 'sm',
  color: 'fg.dim',
  display: 'flex',
  alignItems: 'center',
  gap: '1',
  _before: {
    content: '""',
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'green',
  },
});

const mainStyle = css({
  flex: 1,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
});

export function App() {
  const [currentPath, setCurrentPath] = useState('/');
  const { events, connected, error, clearEvents } = useSSE(SIDECAR_URL);
  const eventsResult = useEvents(events);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const { theme, cycle } = useTheme();
  const { toasts, addToast, removeToast } = useToasts();

  const { spanCount, logCount } = useMemo(() => {
    let s = 0, l = 0;
    for (const e of events) { e.type === 'span' ? s++ : l++; }
    return { spanCount: s, logCount: l };
  }, [events]);

  // Track last-processed index to avoid re-scanning all events
  const lastProcessedIdx = useRef(0);

  // Slow request detection — only processes NEW events since last check
  useEffect(() => {
    for (let i = lastProcessedIdx.current; i < events.length; i++) {
      const event = events[i];
      if (event.type !== 'span') continue;
      if (!event.data.traceId) continue;
      if (event.data.kind !== 'SERVER') continue;

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
    lastProcessedIdx.current = events.length;
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
    lastProcessedIdx.current = 0;
  }, [clearEvents]);

  const isActive = (path: string) => currentPath === path;

  const isEmpty = events.length === 0;

  return (
    <div className={appStyle}>
      <header className={headerStyle}>
        <Logo size={24} />
        <h1 className={headerH1Style}>NextDog</h1>
        <nav className={navStyle}>
          <a href="/" className={isActive('/') ? navLinkActiveStyle : navLinkStyle}>
            Spans
            {spanCount > 0 && (
              <span className={isActive('/') ? navBadgeActiveStyle : navBadgeStyle}>
                {spanCount > 999 ? '999+' : spanCount}
              </span>
            )}
          </a>
          <a href="/logs" className={isActive('/logs') ? navLinkActiveStyle : navLinkStyle}>
            Logs
            {logCount > 0 && (
              <span className={isActive('/logs') ? navBadgeActiveStyle : navBadgeStyle}>
                {logCount > 999 ? '999+' : logCount}
              </span>
            )}
          </a>
        </nav>
        <div className={headerRightStyle}>
          <Sparkline events={events} />
          {events.length > 0 && (
            <button
              className={pillStyle}
              onClick={handleClear}
              title="Clear all events"
            >
              Clear
            </button>
          )}
          <span className={connected ? connectionStatusConnectedStyle : connectionStatusBaseStyle}>
            {connected ? 'Connected' : error ?? 'Disconnected'}
          </span>
          <ThemeToggle theme={theme} onCycle={cycle} />
        </div>
      </header>
      <div className={mainStyle}>
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
      <ShortcutHelp />
      <ContextMenuContainer />
    </div>
  );
}
