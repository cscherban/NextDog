import { useMemo, useState } from 'preact/hooks';
import { ServicePills } from '../components/service-pills.js';
import { SearchBar } from '../components/search-bar.js';
import { useKeyboard } from '../hooks/use-keyboard.js';
import type { SSEEvent } from '../hooks/use-sse.js';
import type { UseEventsResult } from '../hooks/use-events.js';

interface RequestGroup {
  traceId: string;
  method: string;
  routePath: string;
  status: string;
  httpCode?: number;
  duration: string;
  durationMs: number;
  serviceName: string;
  spans: SSEEvent[];
  timestamp: number;
}

function formatTime(ts: number): string {
  const ago = Date.now() - ts;
  if (ago < 5000) return 'just now';
  if (ago < 60000) return `${Math.floor(ago / 1000)}s ago`;
  if (ago < 3600000) return `${Math.floor(ago / 60000)}m ago`;
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour12: false });
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
    const httpCode = (rootSpan.data as any).statusCode ?? (Number(rootSpan.data.attributes['http.status_code']) || undefined);

    let durationMs = 0;
    if (rootSpan.data.startTimeUnixNano && rootSpan.data.endTimeUnixNano) {
      const start = BigInt(String(rootSpan.data.startTimeUnixNano).replace('n', ''));
      const end = BigInt(String(rootSpan.data.endTimeUnixNano).replace('n', ''));
      durationMs = Number(end - start) / 1_000_000;
    }

    const duration = durationMs < 1 ? `${(durationMs * 1000).toFixed(0)}µs` : durationMs < 1000 ? `${durationMs.toFixed(1)}ms` : `${(durationMs / 1000).toFixed(2)}s`;

    return { traceId, method, routePath, status: statusCode, httpCode, duration, durationMs, serviceName: rootSpan.data.serviceName, spans, timestamp: rootSpan.timestamp };
  }).reverse();
}

/** Compute percentile thresholds from durations */
function computePercentiles(groups: RequestGroup[]): { p50: number; p90: number; p99: number } {
  if (groups.length === 0) return { p50: 0, p90: 0, p99: 0 };
  const sorted = groups.map((g) => g.durationMs).filter((d) => d > 0).sort((a, b) => a - b);
  if (sorted.length === 0) return { p50: 0, p90: 0, p99: 0 };
  const at = (p: number) => sorted[Math.min(Math.floor(sorted.length * p), sorted.length - 1)];
  return { p50: at(0.5), p90: at(0.9), p99: at(0.99) };
}

function durationClass(ms: number, p: { p50: number; p90: number; p99: number }): string {
  if (p.p50 === 0) return 'duration';
  if (ms >= p.p99) return 'duration duration-p99';
  if (ms >= p.p90) return 'duration duration-p90';
  return 'duration';
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
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const groups = useMemo(() => {
    const g = groupByTrace(filtered);
    if (sortBy === 'duration') g.sort((a, b) => b.durationMs - a.durationMs);
    return g;
  }, [filtered, sortBy]);

  const percentiles = useMemo(() => computePercentiles(groups), [groups]);

  useKeyboard({
    onNext: () => setSelectedIndex((i) => Math.min(i + 1, groups.length - 1)),
    onPrev: () => setSelectedIndex((i) => Math.max(i - 1, 0)),
    onSelect: () => {
      if (selectedIndex >= 0 && groups[selectedIndex]) {
        onOpenTrace?.(groups[selectedIndex].traceId);
      }
    },
    onBack: () => setSelectedIndex(-1),
  });

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
      <ServicePills services={services} active={activeServices} onToggle={toggleService} events={filtered} />
      <SearchBar value={searchQuery} onChange={setSearchQuery} events={filtered} />
      <div style="padding:4px 16px;display:flex;gap:8px;border-bottom:1px solid var(--border)">
        <button class={`pill ${sortBy === 'time' ? 'active' : ''}`} onClick={() => setSortBy('time')}>Newest</button>
        <button class={`pill ${sortBy === 'duration' ? 'active' : ''}`} onClick={() => setSortBy('duration')}>Slowest</button>
      </div>
      <div class="event-list">
        {groups.length === 0 ? (
          <div class="empty">{searchQuery || activeServices.size > 0 ? 'No requests match this filter' : 'No requests yet'}</div>
        ) : (
          groups.map((group, i) => (
            <div
              key={group.traceId}
              class={`request-row ${i === selectedIndex ? 'request-row-selected' : ''}`}
              onClick={() => { setSelectedIndex(i); onOpenTrace?.(group.traceId); }}
            >
              <span class="timestamp">{formatTime(group.timestamp)}</span>
              <span class={methodClass(group.method)}>{group.method}</span>
              <span class="route">{group.routePath}</span>
              {group.httpCode ? (
                <span class={`http-status http-${Math.floor(group.httpCode / 100)}xx`}>{group.httpCode}</span>
              ) : (
                <span class={group.status === 'ERROR' ? 'status-error' : 'status-ok'}>{group.status}</span>
              )}
              <span class={durationClass(group.durationMs, percentiles)}>{group.duration}</span>
              <span class="service">{group.serviceName}</span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
