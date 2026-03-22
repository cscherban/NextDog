import Router from 'preact-router';
import { useState, useCallback } from 'preact/hooks';
import { useSSE } from './hooks/use-sse.js';
import { useEvents } from './hooks/use-events.js';
import { Requests } from './views/requests.js';
import { Logs } from './views/logs.js';
import { Trace } from './views/trace.js';
import { DetailPane } from './components/detail-pane.js';

const SIDECAR_URL = window.location.port === '5173'
  ? 'http://localhost:6789'
  : window.location.origin;

export function App() {
  const [currentPath, setCurrentPath] = useState('/');
  const { events, connected, error } = useSSE(SIDECAR_URL);
  const eventsResult = useEvents(events);
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);

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
        <h1>NextDog</h1>
        <nav class="nav">
          <a href="/" class={navClass('/')}>Spans</a>
          <a href="/logs" class={navClass('/logs')}>Logs</a>
        </nav>
        <span style="margin-left:auto;font-size:11px;color:var(--text-dim)">
          {connected ? '● connected' : error ?? '○ disconnected'}
        </span>
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
