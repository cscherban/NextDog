import { formatTime } from '../utils/format.js';
import type { SSEEvent } from '../hooks/use-sse.js';

function levelClass(level?: string): string {
  switch (level) {
    case 'error': return 'log-level log-error';
    case 'warn': return 'log-level log-warn';
    case 'info': return 'log-level log-info';
    case 'debug': return 'log-level log-debug';
    default: return 'log-level';
  }
}

function runtimeTag(event: SSEEvent): string | null {
  const rt = event.data.attributes.runtime as string | undefined;
  return rt === 'server' || rt === 'browser' ? rt : null;
}

interface LogRowProps {
  event: SSEEvent;
  selected?: boolean;
  showService?: boolean;
  onClick?: () => void;
  onCellContext?: (e: MouseEvent, key: string, value: string) => void;
  extraColumns?: { id: string; value: string; attrKey?: string }[];
  style?: string;
}

export function LogRow({ event, selected, showService, onClick, onCellContext, extraColumns, style }: LogRowProps) {
  const level = event.data.level ?? event.data.status?.code ?? '';
  const message = event.data.message ?? event.data.name;
  const ts = event.data.timestamp ?? event.timestamp;
  const runtime = runtimeTag(event);

  return (
    <div class={`log-row ${showService ? 'log-row-wide' : ''} ${selected ? 'log-row-selected' : ''}`} onClick={onClick} style={style}>
      <span class="log-time">{formatTime(ts)}</span>
      <span
        class={levelClass(event.data.level)}
        onContextMenu={onCellContext ? (e: MouseEvent) => onCellContext(e, 'level', String(level)) : undefined}
      >{level}</span>
      {showService && (
        <span
          class="service"
          onContextMenu={onCellContext ? (e: MouseEvent) => onCellContext(e, 'service', event.data.serviceName) : undefined}
        >{event.data.serviceName}</span>
      )}
      {runtime && <span class={`runtime-tag runtime-${runtime}`}>{runtime}</span>}
      <span
        class="log-message"
        onContextMenu={onCellContext ? (e: MouseEvent) => onCellContext(e, 'message', String(message)) : undefined}
      >{message}</span>
      {extraColumns?.map((col) => (
        <span
          key={col.id}
          class="custom-col"
          title={col.value}
          onContextMenu={onCellContext && col.attrKey ? (e: MouseEvent) => onCellContext(e, col.attrKey!, col.value) : undefined}
        >{col.value || '—'}</span>
      ))}
    </div>
  );
}
