import { useMemo, useState, useRef, useCallback, useEffect } from 'preact/hooks';
import { route } from 'preact-router';
import { Waterfall } from './waterfall.js';
import { LogRow } from './log-row.js';
import { AttributeTable } from './attribute-table.js';
import { CopyCurl } from './copy-curl.js';
import { ReplayButton } from './replay-button.js';
import { formatSpanDuration } from '../utils/format.js';
import type { SSEEvent } from '../hooks/use-sse.js';

const STORAGE_KEY = 'nextdog:pane-width';
const DEFAULT_WIDTH = 520;
const MIN_WIDTH = 360;
const MAX_WIDTH = 1200;

function loadWidth(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const w = Number(saved);
      if (w >= MIN_WIDTH && w <= MAX_WIDTH) return w;
    }
  } catch {}
  return DEFAULT_WIDTH;
}

interface DetailPaneProps {
  traceId: string;
  events: SSEEvent[];
  onClose: () => void;
  onFilter?: (key: string, value: string) => void;
}

export function DetailPane({ traceId, events, onClose, onFilter }: DetailPaneProps) {
  const [selectedEvent, setSelectedEvent] = useState<SSEEvent | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [width, setWidth] = useState(loadWidth);
  const dragging = useRef(false);
  const paneRef = useRef<HTMLDivElement>(null);

  const onDragStart = useCallback((e: PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, window.innerWidth - e.clientX));
      setWidth(newWidth);
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Persist on drag end
      try { localStorage.setItem(STORAGE_KEY, String(loadWidth())); } catch {}
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, []);

  // Persist width on change (debounced via pointerup, but also save current)
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(width)); } catch {}
  }, [width]);

  const traceEvents = useMemo(
    () => events.filter((e) => e.data.traceId === traceId),
    [events, traceId]
  );

  const spans = useMemo(
    () => traceEvents.filter((e) => e.type === 'span'),
    [traceEvents]
  );

  const logs = useMemo(
    () => traceEvents.filter((e) => e.type === 'log'),
    [traceEvents]
  );

  // Find root span for header info
  const rootSpan = useMemo(() => {
    return spans.find((s) => s.data.kind === 'SERVER' && !s.data.parentSpanId) ?? spans[0];
  }, [spans]);

  const method = rootSpan ? String(rootSpan.data.attributes['http.method'] ?? '') : '';
  const routePath = rootSpan ? String(rootSpan.data.attributes['http.route'] ?? rootSpan.data.attributes['http.target'] ?? rootSpan.data.name) : traceId;
  const status = rootSpan?.data.status?.code ?? '';
  const duration = rootSpan ? (formatSpanDuration(rootSpan) || '—') : '—';

  const handleExpand = () => {
    route(`/trace/${traceId}`);
    onClose();
  };

  return (
    <>
      <div class="pane-backdrop" onClick={onClose} />
      <div class="detail-pane" ref={paneRef} style={`width:${width}px`}>
        <div class="pane-drag-handle" onPointerDown={onDragStart} />
        <div class="pane-header">
          <div class="pane-header-top">
            <div class="pane-title">
              {method && <span class={`method method-${method.toLowerCase()}`}>{method}</span>}
              <span class="pane-route">{routePath}</span>
            </div>
            <div class="pane-actions">
              <button class="pane-btn" onClick={handleExpand} title="Expand to full page">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="15 3 21 3 21 9" /><line x1="21" y1="3" x2="14" y2="10" />
                  <polyline points="9 21 3 21 3 15" /><line x1="3" y1="21" x2="10" y2="14" />
                </svg>
              </button>
              <button class="pane-btn" onClick={onClose} title="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
          <div class="pane-meta">
            <span class={status === 'ERROR' ? 'status-error' : 'status-ok'}>{status}</span>
            <span class="pane-meta-sep">|</span>
            <span>{duration}</span>
            <span class="pane-meta-sep">|</span>
            <span>{spans.length} spans</span>
            {logs.length > 0 && (
              <>
                <span class="pane-meta-sep">|</span>
                <span>{logs.length} logs</span>
              </>
            )}
            {rootSpan && rootSpan.data.attributes['http.method'] && (
              <>
                <span class="pane-meta-sep">|</span>
                <ReplayButton event={rootSpan} />
                <CopyCurl event={rootSpan} />
              </>
            )}
          </div>
        </div>

        <div class="pane-body">
          {/* Waterfall */}
          <div class="pane-section">
            <div class="pane-section-title">Waterfall</div>
            <Waterfall spans={spans} onSpanClick={(event) => setSelectedEvent(event)} />
          </div>

          {/* Logs */}
          {logs.length > 0 && (
            <div class="pane-section">
              <div class="pane-section-title">Logs</div>
              <div class="pane-logs">
                {logs.map((log, i) => (
                  <LogRow
                    key={i}
                    event={log}
                    selected={selectedEvent === log}
                    onClick={() => setSelectedEvent(log)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* If no logs, show all events as a timeline */}
          {logs.length === 0 && spans.length > 0 && (
            <div class="pane-section">
              <div class="pane-section-title">Spans</div>
              <div class="pane-logs">
                {spans.map((span, i) => (
                  <LogRow
                    key={i}
                    event={span}
                    selected={selectedEvent === span}
                    onClick={() => setSelectedEvent(span)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Detail panel for selected span/log */}
          {selectedEvent && (
            <div class="pane-section">
              <div class="pane-section-title">
                {selectedEvent.type === 'span' ? 'Span' : 'Log'} Detail
                <button
                  class="pill"
                  style="margin-left:8px"
                  onClick={() => setShowJson(!showJson)}
                >
                  {showJson ? 'Table' : 'JSON'}
                </button>
              </div>
              {showJson ? (
                <pre class="json-view">
                  {JSON.stringify(selectedEvent.data, null, 2)}
                </pre>
              ) : (
                <>
                  <AttributeTable
                    title="Properties"
                    onFilter={onFilter}
                    attributes={{
                      name: selectedEvent.data.name,
                      service: selectedEvent.data.serviceName,
                      kind: selectedEvent.data.kind,
                      status: selectedEvent.data.status?.code,
                      ...(selectedEvent.data.message ? { message: selectedEvent.data.message } : {}),
                      ...(selectedEvent.data.level ? { level: selectedEvent.data.level } : {}),
                      traceId: selectedEvent.data.traceId,
                      spanId: selectedEvent.data.spanId,
                      parentSpanId: selectedEvent.data.parentSpanId,
                    }}
                  />
                  {Object.keys(selectedEvent.data.attributes).length > 0 && (
                    <AttributeTable
                      title="Attributes"
                      onFilter={onFilter}
                      attributes={selectedEvent.data.attributes as Record<string, unknown>}
                    />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
