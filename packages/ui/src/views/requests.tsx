import { useMemo, useState } from 'preact/hooks';
import { ServicePills } from '../components/service-pills.js';
import { SearchBar } from '../components/search-bar.js';
import type { SSEEvent } from '../hooks/use-sse.js';
import type { UseEventsResult } from '../hooks/use-events.js';

interface RequestGroup {
  traceId: string;
  method: string;
  routePath: string;
  status: string;
  duration: string;
  durationMs: number;
  serviceName: string;
  spans: SSEEvent[];
}

function groupByTrace(events: SSEEvent[]): RequestGroup[] {
  const groups = new Map<string, SSEEvent[]>();
  for (const event of events) {
    const traceId = event.data.traceId;
    if (!traceId) continue;
    if (!groups.has(traceId)) groups.set(traceId, []);
    groups.get(traceId)!.push(event);
  }

  return [...groups.entries()].map(([traceId, spans]) => {
    const rootSpan = spans.find((s) => s.data.kind === 'SERVER' && !s.data.parentSpanId) ?? spans[0];
    const method = String(rootSpan.data.attributes['http.method'] ?? 'GET');
    const routePath = String(rootSpan.data.attributes['http.route'] ?? rootSpan.data.attributes['http.target'] ?? rootSpan.data.name);
    const statusCode = rootSpan.data.status?.code ?? 'OK';

    let durationMs = 0;
    if (rootSpan.data.startTimeUnixNano && rootSpan.data.endTimeUnixNano) {
      const start = BigInt(String(rootSpan.data.startTimeUnixNano).replace('n', ''));
      const end = BigInt(String(rootSpan.data.endTimeUnixNano).replace('n', ''));
      durationMs = Number(end - start) / 1_000_000;
    }

    const duration = durationMs < 1 ? `${(durationMs * 1000).toFixed(0)}µs` : durationMs < 1000 ? `${durationMs.toFixed(1)}ms` : `${(durationMs / 1000).toFixed(2)}s`;

    return { traceId, method, routePath, status: statusCode, duration, durationMs, serviceName: rootSpan.data.serviceName, spans };
  }).reverse();
}

type SortField = 'time' | 'duration';

interface RequestsProps {
  path?: string;
  eventsResult: UseEventsResult;
  onOpenTrace?: (traceId: string) => void;
}

export function Requests({ eventsResult, onOpenTrace }: RequestsProps) {
  const { filtered, services, activeServices, toggleService, searchQuery, setSearchQuery } = eventsResult;
  const [sortBy, setSortBy] = useState<SortField>('time');

  const groups = useMemo(() => {
    const g = groupByTrace(filtered);
    if (sortBy === 'duration') g.sort((a, b) => b.durationMs - a.durationMs);
    return g;
  }, [filtered, sortBy]);

  const methodClass = (method: string) => {
    const m = method.toUpperCase();
    if (m === 'GET') return 'method method-get';
    if (m === 'POST') return 'method method-post';
    if (m === 'PUT') return 'method method-put';
    if (m === 'DELETE') return 'method method-delete';
    return 'method';
  };

  return (
    <>
      <ServicePills services={services} active={activeServices} onToggle={toggleService} />
      <SearchBar value={searchQuery} onChange={setSearchQuery} />
      <div style="padding:4px 16px;display:flex;gap:8px;border-bottom:1px solid var(--border)">
        <button class={`pill ${sortBy === 'time' ? 'active' : ''}`} onClick={() => setSortBy('time')}>Newest</button>
        <button class={`pill ${sortBy === 'duration' ? 'active' : ''}`} onClick={() => setSortBy('duration')}>Slowest</button>
      </div>
      <div class="event-list">
        {groups.length === 0 ? (
          <div class="empty">No requests yet</div>
        ) : (
          groups.map((group) => (
            <div key={group.traceId} class="request-row" onClick={() => onOpenTrace?.(group.traceId)}>
              <span class={methodClass(group.method)}>{group.method}</span>
              <span class="route">{group.routePath}</span>
              <span class={group.status === 'ERROR' ? 'status-error' : 'status-ok'}>{group.status}</span>
              <span class="duration">{group.duration}</span>
              <span class="service">{group.serviceName}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
