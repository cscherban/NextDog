import type { ReadableSpan, SpanExporter } from '@opentelemetry/sdk-trace-node';
import type { ExportResult } from '@opentelemetry/core';

const ExportResultCode = { SUCCESS: 0, FAILED: 1 } as const;

const SPAN_KIND_MAP: Record<number, string> = {
  0: 'INTERNAL',
  1: 'SERVER',
  2: 'CLIENT',
  3: 'PRODUCER',
  4: 'CONSUMER',
};

const STATUS_CODE_MAP: Record<number, string> = {
  0: 'UNSET',
  1: 'OK',
  2: 'ERROR',
};

function hrtimeToNano(hrtime: [number, number]): string {
  const [seconds, nanos] = hrtime;
  return String(BigInt(seconds) * 1_000_000_000n + BigInt(nanos));
}

function convertSpan(span: ReadableSpan) {
  const ctx = span.spanContext();
  const serviceName = (span.resource?.attributes?.['service.name'] as string) ?? 'unknown';

  return {
    traceId: ctx.traceId,
    spanId: ctx.spanId,
    parentSpanId: (span as any).parentSpanId ?? (span as any).parentSpanContext?.spanId ?? undefined,
    name: span.name,
    kind: SPAN_KIND_MAP[span.kind] ?? 'INTERNAL',
    startTimeUnixNano: hrtimeToNano(span.startTime),
    endTimeUnixNano: hrtimeToNano(span.endTime),
    attributes: span.attributes as Record<string, string | number | boolean>,
    status: {
      code: STATUS_CODE_MAP[span.status.code] ?? 'UNSET',
      message: span.status.message,
    },
    serviceName,
  };
}

export class NextDogExporter implements SpanExporter {
  constructor(private url: string) {}

  export(spans: ReadableSpan[], resultCallback: (result: ExportResult) => void): void {
    const converted = spans.map(convertSpan);

    fetch(`${this.url}/v1/spans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spans: converted }),
    })
      .then(() => resultCallback({ code: ExportResultCode.SUCCESS }))
      .catch(() => resultCallback({ code: ExportResultCode.FAILED }));
  }

  async shutdown(): Promise<void> {}
}
