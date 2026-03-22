import type { SSEEvent } from '../hooks/use-sse.js';

function formatTime(timestamp: number): string {
  const ago = Date.now() - timestamp;
  if (ago < 5000) return 'just now';
  if (ago < 60000) return `${Math.floor(ago / 1000)}s ago`;
  if (ago < 3600000) return `${Math.floor(ago / 60000)}m ago`;
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-US', { hour12: false });
}

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
}

export function LogRow({ event, selected, showService, onClick }: LogRowProps) {
  const level = event.data.level ?? event.data.status?.code ?? '';
  const message = event.data.message ?? event.data.name;
  const ts = event.data.timestamp ?? event.timestamp;
  const runtime = runtimeTag(event);

  return (
    <div class={`log-row ${showService ? 'log-row-wide' : ''} ${selected ? 'log-row-selected' : ''}`} onClick={onClick}>
      <span class="log-time">{formatTime(ts)}</span>
      <span class={levelClass(event.data.level)}>{level}</span>
      {showService && <span class="service">{event.data.serviceName}</span>}
      {runtime && <span class={`runtime-tag runtime-${runtime}`}>{runtime}</span>}
      <span class="log-message">{message}</span>
    </div>
  );
}
