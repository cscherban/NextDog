import { useMemo } from 'preact/hooks';
import { Waterfall } from '../components/waterfall.js';
import type { SSEEvent } from '../hooks/use-sse.js';

interface TraceProps {
  path?: string;
  traceId?: string;
  events: SSEEvent[];
}

export function Trace({ traceId, events }: TraceProps) {
  const traceSpans = useMemo(
    () => events.filter((e) => e.data.traceId === traceId),
    [events, traceId]
  );

  if (!traceId) return <div class="empty">No trace selected</div>;

  return (
    <div style="flex:1;overflow-y:auto">
      <div style="padding:12px 16px;border-bottom:1px solid var(--border)">
        <a href="/" style="font-size:12px;color:var(--text-dim)">← Back</a>
        <h2 style="font-size:14px;margin-top:4px;color:var(--text-bright)">Trace {traceId}</h2>
        <span style="font-size:12px;color:var(--text-dim)">{traceSpans.length} spans</span>
      </div>
      <Waterfall spans={traceSpans} />
    </div>
  );
}
