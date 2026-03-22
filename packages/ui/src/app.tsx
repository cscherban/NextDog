import Router from 'preact-router';
import { useState, useCallback } from 'preact/hooks';
import { useSSE } from './hooks/use-sse.js';
import { useEvents } from './hooks/use-events.js';
import { LiveTail } from './views/live-tail.js';
import { Requests } from './views/requests.js';
import { Trace } from './views/trace.js';

const SIDECAR_URL = window.location.port === '5173'
  ? 'http://localhost:6789'
  : window.location.origin;

export function App() {
  const [currentPath, setCurrentPath] = useState('/');
  const { events, connected, error } = useSSE(SIDECAR_URL);
  const eventsResult = useEvents(events);

  const handleRoute = useCallback((e: { url: string }) => {
    setCurrentPath(e.url);
  }, []);

  const navClass = (path: string) => currentPath === path ? 'active' : '';

  return (
    <div class="app">
      <header class="header">
        <h1>NextDog</h1>
        <nav class="nav">
          <a href="/" class={navClass('/')}>Live Tail</a>
          <a href="/requests" class={navClass('/requests')}>Requests</a>
        </nav>
        <span style="margin-left:auto;font-size:11px;color:var(--text-dim)">
          {connected ? '● connected' : error ?? '○ disconnected'}
        </span>
      </header>
      <div class="main">
        <Router onChange={handleRoute}>
          <LiveTail path="/" eventsResult={eventsResult} />
          <Requests path="/requests" eventsResult={eventsResult} />
          <Trace path="/trace/:traceId" events={events} />
        </Router>
      </div>
    </div>
  );
}
