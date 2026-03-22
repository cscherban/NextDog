export interface Span {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: 'SERVER' | 'CLIENT' | 'INTERNAL' | 'PRODUCER' | 'CONSUMER';
  startTimeUnixNano: bigint;
  endTimeUnixNano: bigint;
  attributes: Record<string, string | number | boolean>;
  status: { code: 'OK' | 'ERROR' | 'UNSET'; message?: string };
  statusCode?: number;
  serviceName: string;
}

export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  attributes: Record<string, unknown>;
  traceId?: string;
  spanId?: string;
  serviceName: string;
}

export type NextDogEvent =
  | { type: 'span'; timestamp: number; data: Span }
  | { type: 'log'; timestamp: number; data: LogEntry };
