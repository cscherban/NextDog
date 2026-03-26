import { useMemo, useState } from 'preact/hooks';
import { css } from 'styled-system/css';
import { token } from 'styled-system/tokens';
import { Waterfall } from '../components/waterfall.js';
import { LogRow } from '../components/log-row.js';
import { AttributeTable } from '../components/attribute-table.js';
import { CopyCurl } from '../components/copy-curl.js';
import { ReplayButton } from '../components/replay-button.js';
import { formatSpanDuration } from '../utils/format.js';
import { pillStyle, jsonViewStyle, emptyStyle } from '../styles/shared.js';
import type { SSEEvent } from '../hooks/use-sse.js';

const styles = {
  root: css({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  }),
  header: css({
    py: '3', px: '4',
    borderBottom: '1px solid token(colors.border.subtle)',
    background: 'surface.bg',
  }),
  backLink: css({
    fontSize: 'md',
    color: 'fg.dim',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1',
    textDecoration: 'none',
    py: '1', px: '2',
    borderRadius: 'sm',
    margin: '-4px -8px',
    _hover: {
      background: 'surface.hover',
      color: 'fg.bright',
    },
  }),
  titleRow: css({
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    marginTop: '1',
  }),
  routeHeading: css({
    fontSize: 'xl',
    color: 'fg.bright',
    fontFamily: 'mono',
  }),
  metaRow: css({
    display: 'flex',
    gap: '2',
    marginTop: '1',
    fontSize: 'md',
    color: 'fg.dim',
    fontFamily: 'mono',
  }),
  actionsRow: css({
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    marginTop: '2',
  }),
  paneSection: css({
    borderBottom: '1px solid token(colors.border.subtle)',
  }),
  paneSectionFlex: css({
    borderBottom: '1px solid token(colors.border.subtle)',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  }),
  paneSectionTitle: css({
    display: 'flex',
    alignItems: 'center',
    py: '2', px: '4',
    fontSize: 'sm',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: 'fg.dim',
    background: 'surface.bg',
    position: 'sticky',
    top: 0,
    zIndex: 1,
  }),
  scrollArea: css({
    flex: 1,
    overflowY: 'auto',
  }),
  detailSection: css({
    borderBottom: '1px solid token(colors.border.subtle)',
    flexShrink: 0,
    maxHeight: '40%',
    overflowY: 'auto',
  }),
  pillMl: css({ marginLeft: '2' }),
  emptyLarge: css({ fontSize: 'xl' }),
  statusOk: css({ color: 'green' }),
  statusError: css({ color: 'red' }),
  methodBase: css({ fontWeight: 600, fontSize: 'xl' }),
};

const METHOD_COLORS: Record<string, string> = {
  get: token('colors.green'),
  post: token('colors.blue'),
  put: token('colors.yellow'),
  delete: token('colors.red'),
};

function methodColorStyle(method: string) {
  const color = METHOD_COLORS[method.toLowerCase()] ?? token('colors.fg');
  return css({ color });
}

interface TraceProps {
  path?: string;
  traceId?: string;
  events: SSEEvent[];
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

  if (!traceId) return <div className={`${emptyStyle} ${styles.emptyLarge}`}>No trace selected</div>;

  const method = rootSpan ? String(rootSpan.data.attributes['http.method'] ?? '') : '';
  const routePath = rootSpan ? String(rootSpan.data.attributes['http.route'] ?? rootSpan.data.attributes['http.target'] ?? rootSpan.data.name) : traceId;

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <a href="/" className={styles.backLink}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg>
          Back to requests
        </a>
        <div className={styles.titleRow}>
          {method && <span className={`${styles.methodBase} ${methodColorStyle(method)}`}>{method}</span>}
          <h2 className={styles.routeHeading}>{routePath}</h2>
        </div>
        <div className={styles.metaRow}>
          <span className={rootSpan?.data.status?.code === 'ERROR' ? styles.statusError : styles.statusOk}>
            {rootSpan?.data.status?.code ?? ''}
          </span>
          <span>|</span>
          <span>{rootSpan ? formatSpanDuration(rootSpan) : ''}</span>
          <span>|</span>
          <span>{spans.length} spans</span>
          {logs.length > 0 && <><span>|</span><span>{logs.length} logs</span></>}
        </div>
        {rootSpan && rootSpan.data.attributes['http.method'] && (
          <div className={styles.actionsRow}>
            <ReplayButton event={rootSpan} />
            <CopyCurl event={rootSpan} />
          </div>
        )}
      </div>

      <div className={styles.paneSection}>
        <div className={styles.paneSectionTitle}>Waterfall</div>
        <Waterfall spans={spans} onSpanClick={(event) => setSelectedEvent(event)} />
      </div>

      {logs.length > 0 && (
        <div className={styles.paneSectionFlex}>
          <div className={styles.paneSectionTitle}>Logs</div>
          <div className={styles.scrollArea}>
            {logs.map((log, i) => (
              <LogRow key={i} event={log} selected={selectedEvent === log} onClick={() => setSelectedEvent(log)} />
            ))}
          </div>
        </div>
      )}

      {logs.length === 0 && spans.length > 0 && (
        <div className={styles.paneSectionFlex}>
          <div className={styles.paneSectionTitle}>Spans</div>
          <div className={styles.scrollArea}>
            {spans.map((span, i) => (
              <LogRow key={i} event={span} selected={selectedEvent === span} onClick={() => setSelectedEvent(span)} />
            ))}
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className={styles.detailSection}>
          <div className={styles.paneSectionTitle}>
            {selectedEvent.type === 'span' ? 'Span' : 'Log'} Detail
            <button className={`${pillStyle} ${styles.pillMl}`} onClick={() => setShowJson(!showJson)}>
              {showJson ? 'Table' : 'JSON'}
            </button>
          </div>
          {showJson ? (
            <pre className={jsonViewStyle}>{JSON.stringify(selectedEvent.data, null, 2)}</pre>
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
