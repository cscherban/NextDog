import type { SSEEvent } from '../hooks/use-sse.js';

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
}

function formatDuration(event: SSEEvent): string {
  if (!event.data.startTimeUnixNano || !event.data.endTimeUnixNano) return '—';
  const start = BigInt(String(event.data.startTimeUnixNano).replace('n', ''));
  const end = BigInt(String(event.data.endTimeUnixNano).replace('n', ''));
  const ms = Number(end - start) / 1_000_000;
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(1)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function statusClass(event: SSEEvent): string {
  const code = event.data.status?.code;
  if (code === 'ERROR') return 'status-error';
  if (code === 'OK') return 'status-ok';
  if (event.data.level === 'error') return 'status-error';
  if (event.data.level === 'warn') return 'status-warn';
  return 'status-ok';
}

interface EventRowProps {
  event: SSEEvent;
  selected?: boolean;
  onClick?: () => void;
}

export function EventRow({ event, selected, onClick }: EventRowProps) {
  const route = event.data.attributes['http.route'] ?? event.data.attributes['http.target'] ?? event.data.name;
  return (
    <div class={`event-row ${selected ? 'selected' : ''}`} onClick={onClick}>
      <span class="timestamp">{formatTime(event.timestamp)}</span>
      <span class="service">{event.data.serviceName}</span>
      <span class="route">{String(route)}</span>
      <span class="duration">{formatDuration(event)}</span>
      <span class={statusClass(event)}>{event.data.status?.code ?? event.data.level ?? ''}</span>
    </div>
  );
}
