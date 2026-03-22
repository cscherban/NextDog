import Router from 'preact-router';
import { useState, useCallback, useMemo } from 'preact/hooks';
import { useSSE } from './hooks/use-sse.js';
import { useEvents } from './hooks/use-events.js';
import { useTheme } from './hooks/use-theme.js';
import { Requests } from './views/requests.js';
import { Logs } from './views/logs.js';
import { Trace } from './views/trace.js';
import { DetailPane } from './components/detail-pane.js';
import { Logo } from './components/logo.js';
import { ThemeToggle } from './components/theme-toggle.js';

const SIDECAR_URL = window.location.port === '5173'
  ? 'http://localhost:6789'
  : window.location.origin;

export function App() {
  const [currentPath, setCurrentPath] = useState('/');
  const { events, connected, error } = useSSE(SIDECAR_URL);
  const eventsResult = useEvents(events);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const { theme, cycle } = useTheme();

  const spanCount = useMemo(() => events.filter((e) => e.type === 'span').length, [events]);
  const logCount = useMemo(() => events.filter((e) => e.type === 'log').length, [events]);

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

  const navClass = (path: string) => currentPath === path ? 'active' : '';

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
          <span class={`connection-status ${connected ? 'connected' : ''}`}>
            {connected ? 'Connected' : error ?? 'Disconnected'}
          </span>
          <ThemeToggle theme={theme} onCycle={cycle} />
        </div>
      </header>
      <div class="main">
        <Router onChange={handleRoute}>
          <Requests path="/" eventsResult={eventsResult} onOpenTrace={openTrace} />
          <Logs path="/logs" eventsResult={eventsResult} allEvents={events} onOpenTrace={openTrace} onFilter={handleFilter} />
          <Trace path="/trace/:traceId" events={events} />
        </Router>
      </div>

      {selectedTraceId && (
        <DetailPane
          traceId={selectedTraceId}
          events={events}
          onClose={closePane}
          onFilter={handleFilter}
        />
      )}
    </div>
  );
}
