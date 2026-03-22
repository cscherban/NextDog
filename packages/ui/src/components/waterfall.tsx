import type { SSEEvent } from '../hooks/use-sse.js';

const COLORS = ['var(--accent)', 'var(--blue)', 'var(--green)', 'var(--yellow)', 'var(--red)'];

interface WaterfallProps {
  spans: SSEEvent[];
  onSpanClick?: (event: SSEEvent) => void;
}

interface SpanTiming {
  name: string;
  startNano: bigint;
  endNano: bigint;
  durationMs: number;
  depth: number;
  color: string;
  serviceName: string;
  source: SSEEvent;
}

function buildTimings(spans: SSEEvent[]): { timings: SpanTiming[]; minNano: bigint; maxNano: bigint } {
  const timed = spans.filter((s) => s.data.startTimeUnixNano && s.data.endTimeUnixNano);
  if (timed.length === 0) return { timings: [], minNano: 0n, maxNano: 0n };

  const childMap = new Map<string, SSEEvent[]>();
  const spanMap = new Map<string, SSEEvent>();

  for (const s of timed) {
    if (s.data.spanId) spanMap.set(s.data.spanId, s);
    const pid = s.data.parentSpanId;
    if (pid) {
      if (!childMap.has(pid)) childMap.set(pid, []);
      childMap.get(pid)!.push(s);
    }
  }

  const depths = new Map<string, number>();
  const roots = timed.filter((s) => !s.data.parentSpanId || !spanMap.has(s.data.parentSpanId));

  function assignDepth(spanId: string, depth: number) {
    depths.set(spanId, depth);
    for (const child of childMap.get(spanId) ?? []) {
      if (child.data.spanId) assignDepth(child.data.spanId, depth + 1);
    }
  }
  for (const root of roots) {
    if (root.data.spanId) assignDepth(root.data.spanId, 0);
  }

  const ordered: SSEEvent[] = [];
  function dfs(spanId: string) {
    const span = spanMap.get(spanId);
    if (span) ordered.push(span);
    for (const child of childMap.get(spanId) ?? []) {
      if (child.data.spanId) dfs(child.data.spanId);
    }
  }
  for (const root of roots) {
    if (root.data.spanId) dfs(root.data.spanId);
  }

  let minNano = BigInt('9999999999999999999');
  let maxNano = 0n;

  const timings: SpanTiming[] = ordered.map((s, i) => {
    const startNano = BigInt(String(s.data.startTimeUnixNano).replace('n', ''));
    const endNano = BigInt(String(s.data.endTimeUnixNano).replace('n', ''));
    if (startNano < minNano) minNano = startNano;
    if (endNano > maxNano) maxNano = endNano;
    return {
      name: String(s.data.attributes['http.route'] ?? s.data.attributes['http.target'] ?? s.data.name),
      startNano, endNano,
      durationMs: Number(endNano - startNano) / 1_000_000,
      depth: depths.get(s.data.spanId ?? '') ?? 0,
      color: COLORS[i % COLORS.length],
      serviceName: s.data.serviceName,
      source: s,
    };
  });

  return { timings, minNano, maxNano };
}

function formatDuration(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function Waterfall({ spans, onSpanClick }: WaterfallProps) {
  const { timings, minNano, maxNano } = buildTimings(spans);
  const totalNano = maxNano - minNano;

  if (timings.length === 0) return <div class="empty">No timing data available</div>;

  return (
    <div class="waterfall">
      {timings.map((t, i) => {
        const leftPct = totalNano > 0n ? Number((t.startNano - minNano) * 10000n / totalNano) / 100 : 0;
        const widthPct = totalNano > 0n ? Math.max(0.5, Number((t.endNano - t.startNano) * 10000n / totalNano) / 100) : 100;
        return (
          <div key={i} class="waterfall-row" style={`padding-left:${t.depth * 16}px;${onSpanClick ? 'cursor:pointer' : ''}`} onClick={() => onSpanClick?.(t.source)}>
            <span class="waterfall-label" title={t.name}>
              <span style="color:var(--text-dim);font-size:11px">{t.serviceName} </span>{t.name}
            </span>
            <div class="waterfall-bar-container">
              <div class="waterfall-bar" style={`left:${leftPct}%;width:${widthPct}%;background:${t.color}`} />
            </div>
            <span class="waterfall-duration">{formatDuration(t.durationMs)}</span>
          </div>
        );
      })}
    </div>
  );
}
