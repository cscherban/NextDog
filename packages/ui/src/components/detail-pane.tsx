import { useMemo, useState } from 'preact/hooks';
import { route } from 'preact-router';
import { Waterfall } from './waterfall.js';
import { LogRow } from './log-row.js';
import { AttributeTable } from './attribute-table.js';
import { CopyCurl } from './copy-curl.js';
import { ReplayButton } from './replay-button.js';
import type { SSEEvent } from '../hooks/use-sse.js';

interface DetailPaneProps {
  traceId: string;
  events: SSEEvent[];
  onClose: () => void;
  onFilter?: (key: string, value: string) => void;
}

function formatDuration(event: SSEEvent): string {
  if (!event.data.startTimeUnixNano || !event.data.endTimeUnixNano) return '—';
  const start = BigInt(String(event.data.startTimeUnixNano).replace('n', ''));
  const end = BigInt(String(event.data.endTimeUnixNano).replace('n', ''));
  const ms = Number(end - start) / 1_000_000;
  if (ms < 1) return `${(ms * 1000).toFixed(0)}us`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function DetailPane({ traceId, events, onClose, onFilter }: DetailPaneProps) {
  const [selectedEvent, setSelectedEvent] = useState<SSEEvent | null>(null);
  const [showJson, setShowJson] = useState(false);

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
  const duration = rootSpan ? formatDuration(rootSpan) : '—';

  const handleExpand = () => {
    route(`/trace/${traceId}`);
    onClose();
  };

  return (
    <>
      <div class="pane-backdrop" onClick={onClose} />
      <div class="detail-pane">
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
