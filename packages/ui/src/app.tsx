import Router from 'preact-router';
import { useState, useCallback } from 'preact/hooks';

function LiveTail() {
  return <div class="empty">Live Tail — coming soon</div>;
}

function Requests() {
  return <div class="empty">Requests — coming soon</div>;
}

function Trace({ traceId }: { traceId?: string }) {
  return <div class="empty">Trace {traceId} — coming soon</div>;
}

export function App() {
  const [currentPath, setCurrentPath] = useState('/');
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
      </header>
      <div class="main">
        <Router onChange={handleRoute}>
          <LiveTail path="/" />
          <Requests path="/requests" />
          <Trace path="/trace/:traceId" />
        </Router>
      </div>
    </div>
  );
}
