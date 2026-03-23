import { useMemo, useState } from 'preact/hooks';
import { Waterfall } from '../components/waterfall.js';
import { LogRow } from '../components/log-row.js';
import { AttributeTable } from '../components/attribute-table.js';
import { CopyCurl } from '../components/copy-curl.js';
import { ReplayButton } from '../components/replay-button.js';
import type { SSEEvent } from '../hooks/use-sse.js';

interface TraceProps {
  path?: string;
  traceId?: string;
  events: SSEEvent[];
}

function formatDuration(event: SSEEvent): string {
  if (!event.data.startTimeUnixNano || !event.data.endTimeUnixNano) return '';
  const start = BigInt(String(event.data.startTimeUnixNano).replace('n', ''));
  const end = BigInt(String(event.data.endTimeUnixNano).replace('n', ''));
  const ms = Number(end - start) / 1_000_000;
  if (ms < 1) return `${(ms * 1000).toFixed(0)}us`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function Trace({ traceId, events }: TraceProps) {
  const [selectedEvent, setSelectedEvent] = useState<SSEEvent | null>(null);
  const [showJson, setShowJson] = useState(false);

  const traceEvents = useMemo(
    () => events.filter((e) => e.data.traceId === traceId),
    [events, traceId]
  );

  const spans = useMemo(() => traceEvents.filter((e) => e.type === 'span'), [traceEvents]);
  const logs = useMemo(() => traceEvents.filter((e) => e.type === 'log'), [traceEvents]);

  const rootSpan = useMemo(
    () => spans.find((s) => s.data.kind === 'SERVER' && !s.data.parentSpanId) ?? spans[0],
    [spans]
  );

  if (!traceId) return <div class="empty">No trace selected</div>;

  const method = rootSpan ? String(rootSpan.data.attributes['http.method'] ?? '') : '';
  const routePath = rootSpan ? String(rootSpan.data.attributes['http.route'] ?? rootSpan.data.attributes['http.target'] ?? rootSpan.data.name) : traceId;

  return (
    <div style="flex:1;overflow-y:auto">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg)">
        <a href="/" style="font-size:12px;color:var(--text-dim);display:inline-flex;align-items:center;gap:4px;text-decoration:none;padding:4px 8px;border-radius:4px;margin:-4px -8px" class="back-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to requests
        </a>
        <div style="display:flex;align-items:center;gap:8px;margin-top:4px">
          {method && <span class={`method method-${method.toLowerCase()}`} style="font-size:14px">{method}</span>}
          <h2 style="font-size:14px;color:var(--text-bright);font-family:var(--mono)">{routePath}</h2>
        </div>
        <div style="display:flex;gap:8px;margin-top:4px;font-size:12px;color:var(--text-dim);font-family:var(--mono)">
          <span class={rootSpan?.data.status?.code === 'ERROR' ? 'status-error' : 'status-ok'}>
            {rootSpan?.data.status?.code ?? ''}
          </span>
          <span>|</span>
          <span>{rootSpan ? formatDuration(rootSpan) : ''}</span>
          <span>|</span>
          <span>{spans.length} spans</span>
          {logs.length > 0 && <><span>|</span><span>{logs.length} logs</span></>}
        </div>
        {rootSpan && rootSpan.data.attributes['http.method'] && (
          <div style="display:flex;gap:6px;align-items:center;margin-top:8px">
            <ReplayButton event={rootSpan} />
            <CopyCurl event={rootSpan} />
          </div>
        )}
      </div>

      <div class="pane-section">
        <div class="pane-section-title">Waterfall</div>
        <Waterfall spans={spans} onSpanClick={(event) => setSelectedEvent(event)} />
      </div>

      {logs.length > 0 && (
        <div class="pane-section">
          <div class="pane-section-title">Logs</div>
          <div style="max-height:300px;overflow-y:auto">
            {logs.map((log, i) => (
              <LogRow key={i} event={log} selected={selectedEvent === log} onClick={() => setSelectedEvent(log)} />
            ))}
          </div>
        </div>
      )}

      {logs.length === 0 && spans.length > 0 && (
        <div class="pane-section">
          <div class="pane-section-title">Spans</div>
          {spans.map((span, i) => (
            <LogRow key={i} event={span} selected={selectedEvent === span} onClick={() => setSelectedEvent(span)} />
          ))}
        </div>
      )}

      {selectedEvent && (
        <div class="pane-section">
          <div class="pane-section-title">
            {selectedEvent.type === 'span' ? 'Span' : 'Log'} Detail
            <button class="pill" style="margin-left:8px" onClick={() => setShowJson(!showJson)}>
              {showJson ? 'Table' : 'JSON'}
            </button>
          </div>
          {showJson ? (
            <pre class="json-view">{JSON.stringify(selectedEvent.data, null, 2)}</pre>
          ) : (
            <>
              <AttributeTable
                title="Properties"
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
                <AttributeTable title="Attributes" attributes={selectedEvent.data.attributes as Record<string, unknown>} />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
