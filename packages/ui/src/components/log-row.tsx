import type { SSEEvent } from '../hooks/use-sse.js';

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 3 });
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

interface LogRowProps {
  event: SSEEvent;
  selected?: boolean;
  onClick?: () => void;
}

export function LogRow({ event, selected, onClick }: LogRowProps) {
  const level = event.data.level ?? event.data.status?.code ?? '';
  const message = event.data.message ?? event.data.name;
  const ts = event.data.timestamp ?? event.timestamp;

  return (
    <div class={`log-row ${selected ? 'log-row-selected' : ''}`} onClick={onClick}>
      <span class="log-time">{formatTime(ts)}</span>
      <span class={levelClass(event.data.level)}>{level}</span>
      <span class="log-message">{message}</span>
    </div>
  );
}
