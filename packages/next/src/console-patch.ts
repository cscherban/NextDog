import { trace, context } from '@opentelemetry/api';

const LEVELS = ['debug', 'log', 'info', 'warn', 'error'] as const;
type Level = typeof LEVELS[number];

const LEVEL_MAP: Record<Level, string> = {
  debug: 'debug',
  log: 'info',
  info: 'info',
  warn: 'warn',
  error: 'error',
};

function formatArg(arg: unknown): string {
  if (typeof arg === 'string') return arg;
  if (arg instanceof Error) return `${arg.message}\n${arg.stack ?? ''}`;
  try { return JSON.stringify(arg); } catch { return String(arg); }
}

function extractAttributes(args: unknown[]): Record<string, unknown> {
  const attrs: Record<string, unknown> = {};
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg && typeof arg === 'object' && !(arg instanceof Error)) {
      Object.assign(attrs, arg);
    }
  }
  return attrs;
}

export function patchConsole(url: string, serviceName: string) {
  const buffer: Array<{
    timestamp: number;
    level: string;
    message: string;
    attributes: Record<string, unknown>;
    traceId?: string;
    spanId?: string;
    serviceName: string;
  }> = [];

  let flushTimer: ReturnType<typeof setInterval> | undefined;

  function flush() {
    if (buffer.length === 0) return;
    const logs = buffer.splice(0, buffer.length);
    const body = JSON.stringify({
      logs: logs.map((l) => ({
        type: 'log',
        timestamp: l.timestamp,
        data: l,
      })),
    });
    fetch(`${url}/v1/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }).catch(() => {
      // Silently drop — don't log errors about logging
    });
  }

  // Flush every 500ms
  flushTimer = setInterval(flush, 500);
  if (flushTimer.unref) flushTimer.unref();

  for (const level of LEVELS) {
    const original = console[level].bind(console);

    console[level] = (...args: unknown[]) => {
      // Call original console method
      original(...args);

      // Skip our own messages
      const firstArg = args[0];
      if (typeof firstArg === 'string' && firstArg.startsWith('[nextdog]')) return;

      // Extract trace context if active
      const activeSpan = trace.getActiveSpan();
      const spanCtx = activeSpan?.spanContext();

      const message = args.map(formatArg).join(' ');
      const attributes = extractAttributes(args);

      buffer.push({
        timestamp: Date.now(),
        level: LEVEL_MAP[level],
        message,
        attributes,
        traceId: spanCtx?.traceId,
        spanId: spanCtx?.spanId,
        serviceName,
      });
    };
  }
}
