import { useMemo, useState, useEffect, useCallback } from 'preact/hooks';
import { ServicePills } from '../components/service-pills.js';
import { SearchBar } from '../components/search-bar.js';
import { useKeyboard } from '../hooks/use-keyboard.js';
import { showContextMenu, attrContextActions } from '../components/context-menu.js';
import { formatTime, formatDurationMs, spanDurationMs, extractHttpMeta } from '../utils/format.js';
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
  /** Arbitrary extra attributes keyed by column ID */
  extraAttrs: Record<string, string>;
}

/** Column definitions */
interface ColumnDef {
  id: string;
  label: string;
  /** If true, this is a core column that's always present */
  core?: boolean;
  /** Attribute key to pull from span attributes (for custom columns) */
  attrKey?: string;
}

const CORE_COLUMNS: ColumnDef[] = [
  { id: 'time', label: 'Time', core: true },
  { id: 'method', label: 'Method', core: true },
  { id: 'route', label: 'Route', core: true },
  { id: 'status', label: 'Status', core: true },
  { id: 'duration', label: 'Duration', core: true },
  { id: 'service', label: 'Service', core: true },
];

const COLUMNS_STORAGE_KEY = 'nextdog:request-columns';

function loadCustomColumns(): ColumnDef[] {
  try {
    const saved = localStorage.getItem(COLUMNS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveCustomColumns(cols: ColumnDef[]) {
  try { localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(cols)); } catch {}
}

function groupByTrace(events: SSEEvent[], customColumns: ColumnDef[]): RequestGroup[] {
  const groups = new Map<string, SSEEvent[]>();
  for (const event of events) {
    const traceId = event.data.traceId;
    if (!traceId) continue;
    if (!groups.has(traceId)) groups.set(traceId, []);
    groups.get(traceId)!.push(event);
  }

  return [...groups.entries()].map(([traceId, spans]) => {
    const rootSpan = spans.find((s) => s.data.kind === 'SERVER' && !s.data.parentSpanId) ?? spans[0];
    const { method, route: routePath } = extractHttpMeta(rootSpan.data.attributes, rootSpan.data.name);
    const statusCode = rootSpan.data.status?.code ?? 'OK';
    const httpCode = (rootSpan.data as any).statusCode ?? (Number(rootSpan.data.attributes['http.status_code']) || undefined);
    const durationMs = spanDurationMs(rootSpan);
    const duration = formatDurationMs(durationMs);

    // Extract custom column values
    const extraAttrs: Record<string, string> = {};
    for (const col of customColumns) {
      if (col.attrKey) {
        const val = rootSpan.data.attributes[col.attrKey];
        extraAttrs[col.id] = val != null ? String(val) : '';
      }
    }

    return { traceId, method, routePath, status: statusCode, httpCode, duration, durationMs, serviceName: rootSpan.data.serviceName, spans, timestamp: rootSpan.timestamp, extraAttrs };
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

type SortField = 'time' | 'method' | 'route' | 'status' | 'duration' | 'service' | string;
type SortDir = 'asc' | 'desc';

function SortIndicator({ field, sortBy, sortDir }: { field: string; sortBy: string; sortDir: SortDir }) {
  if (field !== sortBy) return <span class="sort-indicator" />;
  return <span class="sort-indicator">{sortDir === 'asc' ? '▲' : '▼'}</span>;
}

interface RequestsProps {
  path?: string;
  eventsResult: UseEventsResult;
  onOpenTrace?: (traceId: string) => void;
}

export function Requests({ eventsResult, onOpenTrace }: RequestsProps) {
  const { filtered, services, activeServices, toggleService, searchQuery, setSearchQuery } = eventsResult;
  const [sortBy, setSortBy] = useState<SortField>('time');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [customColumns, setCustomColumns] = useState<ColumnDef[]>(loadCustomColumns);
  const [showColPicker, setShowColPicker] = useState(false);

  const allColumns = useMemo(() => [...CORE_COLUMNS, ...customColumns], [customColumns]);

  // Discover available attribute keys from the events for the column picker
  const availableAttrs = useMemo(() => {
    const keys = new Set<string>();
    for (const e of filtered) {
      if (e.data.attributes) {
        for (const k of Object.keys(e.data.attributes)) keys.add(k);
      }
    }
    // Remove already-added custom columns
    for (const col of customColumns) {
      if (col.attrKey) keys.delete(col.attrKey);
    }
    return [...keys].sort();
  }, [filtered, customColumns]);

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir(field === 'time' ? 'desc' : 'asc');
    }
  };

  const groups = useMemo(() => {
    const g = groupByTrace(filtered, customColumns);
    const dir = sortDir === 'asc' ? 1 : -1;
    g.sort((a, b) => {
      switch (sortBy) {
        case 'time': return (a.timestamp - b.timestamp) * dir;
        case 'method': return a.method.localeCompare(b.method) * dir;
        case 'route': return a.routePath.localeCompare(b.routePath) * dir;
        case 'status': return ((a.httpCode ?? 0) - (b.httpCode ?? 0)) * dir;
        case 'duration': return (a.durationMs - b.durationMs) * dir;
        case 'service': return a.serviceName.localeCompare(b.serviceName) * dir;
        default: {
          // Custom column sort
          const av = a.extraAttrs[sortBy] ?? '';
          const bv = b.extraAttrs[sortBy] ?? '';
          const an = Number(av), bn = Number(bv);
          if (!isNaN(an) && !isNaN(bn)) return (an - bn) * dir;
          return av.localeCompare(bv) * dir;
        }
      }
    });
    return g;
  }, [filtered, sortBy, sortDir, customColumns]);

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

  const addColumn = (attrKey: string) => {
    const label = attrKey.split('.').pop() ?? attrKey;
    const col: ColumnDef = { id: `custom-${attrKey}`, label, attrKey };
    const next = [...customColumns, col];
    setCustomColumns(next);
    saveCustomColumns(next);
  };

  const removeColumn = (id: string) => {
    const next = customColumns.filter((c) => c.id !== id);
    setCustomColumns(next);
    saveCustomColumns(next);
  };

  const activeColumnKeys = useMemo(() => new Set(customColumns.map((c) => c.attrKey)), [customColumns]);

  const handleCellContext = useCallback((e: MouseEvent, key: string, value: string) => {
    e.preventDefault();
    const actions = attrContextActions(key, value, {
      onFilter: (q) => setSearchQuery((prev) => prev ? `${prev} ${q}` : q),
      onAddColumn: (k) => addColumn(k),
      onRemoveColumn: (k) => {
        const col = customColumns.find((c) => c.attrKey === k);
        if (col) removeColumn(col.id);
      },
      isColumnActive: activeColumnKeys.has(key),
    });
    showContextMenu(e.clientX, e.clientY, actions);
  }, [setSearchQuery, addColumn, removeColumn, customColumns, activeColumnKeys]);

  // Dynamic grid template: core columns + 120px per custom column
  const gridTemplate = useMemo(() => {
    const base = '75px 55px 1fr 50px 75px 90px';
    if (customColumns.length === 0) return base;
    return base + customColumns.map(() => ' 120px').join('');
  }, [customColumns]);

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
      <div style="padding:4px 16px;display:flex;gap:8px;align-items:center;border-bottom:1px solid var(--border)">
        <div style="margin-left:auto">
          <button
            class="pill"
            onClick={() => setShowColPicker(!showColPicker)}
            title="Customize columns"
            style="font-size:11px"
          >
            + Column
          </button>
        </div>
      </div>

      {/* Column picker dropdown */}
      {showColPicker && (
        <div class="column-picker">
          <div class="column-picker-header">
            <span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-dim)">
              Add attribute column
            </span>
            <button class="pane-btn" onClick={() => setShowColPicker(false)} title="Close">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          {customColumns.length > 0 && (
            <div style="padding:4px 12px;border-bottom:1px solid var(--border)">
              <div style="font-size:10px;color:var(--text-dim);margin-bottom:4px">Active custom columns:</div>
              {customColumns.map((col) => (
                <div key={col.id} style="display:flex;align-items:center;justify-content:space-between;padding:2px 0">
                  <span style="font-size:12px;font-family:var(--mono)">{col.attrKey}</span>
                  <button class="pill" onClick={() => removeColumn(col.id)} style="font-size:10px;color:var(--red)">Remove</button>
                </div>
              ))}
            </div>
          )}
          <div style="max-height:200px;overflow-y:auto">
            {availableAttrs.length === 0 ? (
              <div style="padding:8px 12px;font-size:12px;color:var(--text-dim)">No more attributes available</div>
            ) : (
              availableAttrs.map((attr) => (
                <div
                  key={attr}
                  class="column-picker-item"
                  onClick={() => { addColumn(attr); }}
                >
                  <span style="font-family:var(--mono);font-size:12px">{attr}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Column headers — click to sort */}
      <div class="request-row request-row-header" style={`grid-template-columns:${gridTemplate}`}>
        <span class="col-header" onClick={() => toggleSort('time')}>Time<SortIndicator field="time" sortBy={sortBy} sortDir={sortDir} /></span>
        <span class="col-header" onClick={() => toggleSort('method')}>Method<SortIndicator field="method" sortBy={sortBy} sortDir={sortDir} /></span>
        <span class="col-header" onClick={() => toggleSort('route')}>Route<SortIndicator field="route" sortBy={sortBy} sortDir={sortDir} /></span>
        <span class="col-header" onClick={() => toggleSort('status')}>Status<SortIndicator field="status" sortBy={sortBy} sortDir={sortDir} /></span>
        <span class="col-header" onClick={() => toggleSort('duration')}>Duration<SortIndicator field="duration" sortBy={sortBy} sortDir={sortDir} /></span>
        <span class="col-header" onClick={() => toggleSort('service')}>Service<SortIndicator field="service" sortBy={sortBy} sortDir={sortDir} /></span>
        {customColumns.map((col) => (
          <span key={col.id} class="col-header custom-col" title={col.attrKey} onClick={() => toggleSort(col.id)}>{col.label}<SortIndicator field={col.id} sortBy={sortBy} sortDir={sortDir} /></span>
        ))}
      </div>

      <div class="event-list">
        {groups.length === 0 ? (
          <div class="empty">{searchQuery || activeServices.size > 0 ? 'No requests match this filter' : 'No requests yet'}</div>
        ) : (
          groups.map((group, i) => (
            <div
              key={group.traceId}
              class={`request-row ${i === selectedIndex ? 'request-row-selected' : ''}`}
              style={`grid-template-columns:${gridTemplate}`}
              onClick={() => { setSelectedIndex(i); onOpenTrace?.(group.traceId); }}
            >
              <span class="timestamp">{formatTime(group.timestamp)}</span>
              <span class={methodClass(group.method)} onContextMenu={(e: MouseEvent) => handleCellContext(e, 'http.method', group.method)}>{group.method}</span>
              <span class="route" onContextMenu={(e: MouseEvent) => handleCellContext(e, 'route', group.routePath)}>{group.routePath}</span>
              {group.httpCode ? (
                <span class={`http-status http-${Math.floor(group.httpCode / 100)}xx`} onContextMenu={(e: MouseEvent) => handleCellContext(e, 'statusCode', String(group.httpCode))}>{group.httpCode}</span>
              ) : (
                <span class={group.status === 'ERROR' ? 'status-error' : 'status-ok'} onContextMenu={(e: MouseEvent) => handleCellContext(e, 'status', group.status)}>{group.status}</span>
              )}
              <span class={durationClass(group.durationMs, percentiles)}>{group.duration}</span>
              <span class="service" onContextMenu={(e: MouseEvent) => handleCellContext(e, 'service', group.serviceName)}>{group.serviceName}</span>
              {customColumns.map((col) => (
                <span key={col.id} class="custom-col" title={group.extraAttrs[col.id]} onContextMenu={(e: MouseEvent) => handleCellContext(e, col.attrKey, group.extraAttrs[col.id])}>{group.extraAttrs[col.id] || '—'}</span>
              ))}
            </div>
          ))
        )}
      </div>
    </>
  );
}
