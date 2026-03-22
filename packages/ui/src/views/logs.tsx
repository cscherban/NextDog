import { useRef, useEffect, useState, useMemo } from 'preact/hooks';
import { LogRow } from '../components/log-row.js';
import { ServicePills } from '../components/service-pills.js';
import { SearchBar } from '../components/search-bar.js';
import { AttributeTable } from '../components/attribute-table.js';
import { useKeyboard } from '../hooks/use-keyboard.js';
import type { SSEEvent } from '../hooks/use-sse.js';
import type { UseEventsResult } from '../hooks/use-events.js';

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

  // Filter to logs only
  const logs = useMemo(() => filtered.filter((e) => e.type === 'log'), [filtered]);

  // In non-live mode, freeze the list
  const [frozenLogs, setFrozenLogs] = useState<SSEEvent[]>([]);
  const displayLogs = liveTail ? logs : frozenLogs;

  const toggleLiveTail = () => {
    if (liveTail) {
      // Freezing: snapshot current logs
      setFrozenLogs([...logs]);
      setLiveTail(false);
    } else {
      setLiveTail(true);
      setAutoScroll(true);
    }
  };

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
        </div>
        <div class="event-list" ref={listRef} onScroll={handleScroll}>
          {displayLogs.length === 0 ? (
            <div class="empty">No logs yet</div>
          ) : (
            displayLogs.map((log, i) => (
              <LogRow
                key={i}
                event={log}
                showService
                selected={i === selectedIndex}
                onClick={() => handleLogClick(log, i)}
              />
            ))
          )}
        </div>
      </div>

      {/* Log detail sidebar */}
      {selectedLog && (
        <div class="log-detail">
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
