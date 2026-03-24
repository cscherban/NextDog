import { useRef, useEffect, useState, useMemo, useCallback } from 'preact/hooks';
import { LogRow } from '../components/log-row.js';
import { ServicePills } from '../components/service-pills.js';
import { SearchBar } from '../components/search-bar.js';
import { AttributeTable } from '../components/attribute-table.js';
import { useKeyboard } from '../hooks/use-keyboard.js';
import type { SSEEvent } from '../hooks/use-sse.js';
import type { UseEventsResult } from '../hooks/use-events.js';

const SIDEBAR_STORAGE_KEY = 'nextdog:log-detail-width';
const LOG_COLUMNS_STORAGE_KEY = 'nextdog:log-columns';
const DEFAULT_WIDTH = 380;
const MIN_WIDTH = 280;
const MAX_WIDTH = 900;

interface ColumnDef {
  id: string;
  label: string;
  attrKey: string;
}

function loadWidth(): number {
  try {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved) {
      const w = Number(saved);
      if (w >= MIN_WIDTH && w <= MAX_WIDTH) return w;
    }
  } catch {}
  return DEFAULT_WIDTH;
}

function loadCustomColumns(): ColumnDef[] {
  try {
    const saved = localStorage.getItem(LOG_COLUMNS_STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

function saveCustomColumns(cols: ColumnDef[]) {
  try { localStorage.setItem(LOG_COLUMNS_STORAGE_KEY, JSON.stringify(cols)); } catch {}
}

function SortIndicator({ field, sortBy, sortDir }: { field: string; sortBy: string; sortDir: 'asc' | 'desc' }) {
  if (field !== sortBy) return <span class="sort-indicator" />;
  return <span class="sort-indicator">{sortDir === 'asc' ? '▲' : '▼'}</span>;
}

interface LogsProps {
  path?: string;
  eventsResult: UseEventsResult;
  allEvents: SSEEvent[];
  onOpenTrace?: (traceId: string) => void;
  onFilter?: (key: string, value: string) => void;
}

export function Logs({ eventsResult, allEvents, onOpenTrace, onFilter }: LogsProps) {
  const { filtered, services, activeServices, toggleService, searchQuery, setSearchQuery } = eventsResult;
  const listRef = useRef<HTMLDivElement>(null);
  const [liveTail, setLiveTail] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [selectedLog, setSelectedLog] = useState<SSEEvent | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [customColumns, setCustomColumns] = useState<ColumnDef[]>(loadCustomColumns);
  const [showColPicker, setShowColPicker] = useState(false);
  const [sortBy, setSortBy] = useState<string>('time');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Draggable sidebar
  const [sidebarWidth, setSidebarWidth] = useState(loadWidth);
  const dragging = useRef(false);

  const onDragStart = useCallback((e: PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      // Sidebar is on the right, so width = viewport right edge minus pointer X
      // But it's inside a flex container, not fixed — compute from the parent
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - e.clientX));
      setSidebarWidth(newWidth);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  useEffect(() => {
    try { localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth)); } catch {}
  }, [sidebarWidth]);

  // Filter to logs only
  const logs = useMemo(() => filtered.filter((e) => e.type === 'log'), [filtered]);

  // In non-live mode, freeze the list
  const [frozenLogs, setFrozenLogs] = useState<SSEEvent[]>([]);
  const displayLogs = liveTail ? logs : frozenLogs;

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir(field === 'time' ? 'desc' : 'asc');
    }
  };

  // Sort display logs
  const sortedLogs = useMemo(() => {
    if (sortBy === 'time' && sortDir === 'desc') return displayLogs; // default order
    const sorted = [...displayLogs];
    const dir = sortDir === 'asc' ? 1 : -1;
    sorted.sort((a, b) => {
      switch (sortBy) {
        case 'time': return ((a.data.timestamp ?? a.timestamp) - (b.data.timestamp ?? b.timestamp)) * dir;
        case 'level': return (a.data.level ?? '').localeCompare(b.data.level ?? '') * dir;
        case 'service': return a.data.serviceName.localeCompare(b.data.serviceName) * dir;
        case 'message': return (a.data.message ?? a.data.name ?? '').localeCompare(b.data.message ?? b.data.name ?? '') * dir;
        default: {
          const av = String(a.data.attributes[sortBy.replace('custom-', '')] ?? '');
          const bv = String(b.data.attributes[sortBy.replace('custom-', '')] ?? '');
          const an = Number(av), bn = Number(bv);
          if (!isNaN(an) && !isNaN(bn)) return (an - bn) * dir;
          return av.localeCompare(bv) * dir;
        }
      }
    });
    return sorted;
  }, [displayLogs, sortBy, sortDir]);

  const toggleLiveTail = () => {
    if (liveTail) {
      setFrozenLogs([...logs]);
      setLiveTail(false);
    } else {
      setLiveTail(true);
      setAutoScroll(true);
    }
  };

  // Discover available attribute keys for the column picker
  const availableAttrs = useMemo(() => {
    const keys = new Set<string>();
    for (const e of displayLogs) {
      if (e.data.attributes) {
        for (const k of Object.keys(e.data.attributes)) keys.add(k);
      }
    }
    for (const col of customColumns) keys.delete(col.attrKey);
    return [...keys].sort();
  }, [displayLogs, customColumns]);

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

  // Dynamic grid template for log rows with custom columns
  const gridTemplate = useMemo(() => {
    const base = '90px 50px 80px auto 1fr';
    if (customColumns.length === 0) return undefined; // use CSS default
    return base + customColumns.map(() => ' 120px').join('');
  }, [customColumns]);

  useKeyboard({
    onNext: () => setSelectedIndex((i) => Math.min(i + 1, displayLogs.length - 1)),
    onPrev: () => setSelectedIndex((i) => Math.max(i - 1, 0)),
    onSelect: () => {
      if (selectedIndex >= 0 && displayLogs[selectedIndex]) {
        setSelectedLog(displayLogs[selectedIndex]);
      }
    },
    onBack: () => {
      if (selectedLog) {
        setSelectedLog(null);
      } else {
        setSelectedIndex(-1);
      }
    },
  });

  useEffect(() => {
    if (liveTail && autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [displayLogs.length, autoScroll, liveTail]);

  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
  };

  const handleLogClick = (log: SSEEvent, index: number) => {
    setSelectedIndex(index);
    setSelectedLog(log);
  };

  return (
    <div style="display:flex;flex:1;overflow:hidden">
      <div style="display:flex;flex-direction:column;flex:1;min-width:0">
        <ServicePills services={services} active={activeServices} onToggle={toggleService} events={filtered} />
        <SearchBar value={searchQuery} onChange={setSearchQuery} events={filtered} />
        <div style="padding:4px 16px;display:flex;gap:8px;align-items:center;border-bottom:1px solid var(--border)">
          <button class={`pill ${liveTail ? 'active' : ''}`} onClick={toggleLiveTail}>
            {liveTail ? '● Live' : '○ Paused'}
          </button>
          <span style="font-size:11px;color:var(--text-dim)">{displayLogs.length} logs</span>
          {!liveTail && (
            <button class="pill" onClick={toggleLiveTail}>Resume</button>
          )}
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
                    onClick={() => addColumn(attr)}
                  >
                    <span style="font-family:var(--mono);font-size:12px">{attr}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Column headers — click to sort */}
        <div
          class="log-row log-row-wide log-row-header"
          style={gridTemplate ? `grid-template-columns:${gridTemplate}` : undefined}
        >
          <span class="col-header" onClick={() => toggleSort('time')}>Time<SortIndicator field="time" sortBy={sortBy} sortDir={sortDir} /></span>
          <span class="col-header" onClick={() => toggleSort('level')}>Level<SortIndicator field="level" sortBy={sortBy} sortDir={sortDir} /></span>
          <span class="col-header" onClick={() => toggleSort('service')}>Service<SortIndicator field="service" sortBy={sortBy} sortDir={sortDir} /></span>
          <span></span>{/* runtime tag column */}
          <span class="col-header" onClick={() => toggleSort('message')}>Message<SortIndicator field="message" sortBy={sortBy} sortDir={sortDir} /></span>
          {customColumns.map((col) => (
            <span key={col.id} class="col-header custom-col" title={col.attrKey} onClick={() => toggleSort(col.id)}>{col.label}<SortIndicator field={col.id} sortBy={sortBy} sortDir={sortDir} /></span>
          ))}
        </div>

        <div class="event-list" ref={listRef} onScroll={handleScroll}>
          {sortedLogs.length === 0 ? (
            <div class="empty">{searchQuery || activeServices.size > 0 ? 'No logs match this filter' : 'No logs yet'}</div>
          ) : (
            sortedLogs.map((log, i) => (
              <LogRow
                key={i}
                event={log}
                showService
                selected={i === selectedIndex}
                onClick={() => handleLogClick(log, i)}
                style={gridTemplate ? `grid-template-columns:${gridTemplate}` : undefined}
                extraColumns={customColumns.map((col) => ({
                  id: col.id,
                  value: log.data.attributes[col.attrKey] != null ? String(log.data.attributes[col.attrKey]) : '',
                }))}
              />
            ))
          )}
        </div>
      </div>

      {/* Log detail sidebar — draggable */}
      {selectedLog && (
        <div class="log-detail" style={`width:${sidebarWidth}px`}>
          <div class="log-drag-handle" onPointerDown={onDragStart} />
          <div class="log-detail-header">
            <span style="font-weight:600;color:var(--text-bright)">Log Detail</span>
            <div style="display:flex;gap:4px">
              {selectedLog.data.traceId && (
                <button
                  class="pill"
                  onClick={() => onOpenTrace?.(selectedLog.data.traceId!)}
                >
                  View Trace
                </button>
              )}
              <button class="pane-btn" onClick={() => setSelectedLog(null)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
          <div class="log-detail-body">
            <div class="log-detail-message">
              {selectedLog.data.message ?? selectedLog.data.name}
            </div>
            <div style="display:flex;gap:4px;margin-bottom:8px">
              <button class="pill" style={!showJson ? 'background:var(--accent);border-color:var(--accent);color:white' : ''} onClick={() => setShowJson(false)}>Table</button>
              <button class="pill" style={showJson ? 'background:var(--accent);border-color:var(--accent);color:white' : ''} onClick={() => setShowJson(true)}>JSON</button>
            </div>
            {showJson ? (
              <pre class="json-view">{JSON.stringify(selectedLog.data, null, 2)}</pre>
            ) : (
              <>
                <AttributeTable
                  title="Properties"
                  onFilter={onFilter}
                  attributes={{
                    level: selectedLog.data.level,
                    message: selectedLog.data.message,
                    service: selectedLog.data.serviceName,
                    traceId: selectedLog.data.traceId,
                    spanId: selectedLog.data.spanId,
                  }}
                />
                {Object.keys(selectedLog.data.attributes).length > 0 && (
                  <AttributeTable
                    title="Attributes"
                    onFilter={onFilter}
                    attributes={selectedLog.data.attributes as Record<string, unknown>}
                  />
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
