import { useEffect, useRef, useState, useCallback } from 'preact/hooks';

export interface SSEEvent {
  type: 'span' | 'log';
  timestamp: number;
  data: {
    traceId?: string;
    spanId?: string;
    parentSpanId?: string;
    name: string;
    kind?: string;
    startTimeUnixNano?: string;
    endTimeUnixNano?: string;
    attributes: Record<string, unknown>;
    status?: { code: string; message?: string };
    statusCode?: number;
    serviceName: string;
    level?: string;
    message?: string;
    timestamp?: number;
  };
}

export interface UseSSEResult {
  events: SSEEvent[];
  connected: boolean;
  error: string | null;
  clearEvents: () => void;
}

export function useSSE(url: string): UseSSEResult {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const initialLoadDone = useRef(false);

  // Fetch recent events from REST API on initial load (survives page refresh)
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    fetch(`${url}/api/spans?last=500`)
      .then((r) => r.json())
      .then((data) => {
        const spans = (data.spans ?? []) as SSEEvent[];
        if (spans.length > 0) {
          setEvents((prev) => {
            if (prev.length > 0) return prev; // SSE already populated
            return spans;
          });
        }
      })
      .catch(() => {}); // Silently fail — SSE will still work
  }, [url]);

  useEffect(() => {
    const es = new EventSource(`${url}/sse`);
    esRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };

    es.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as SSEEvent;
        setEvents((prev) => {
          // Deduplicate: skip if this spanId/timestamp already exists (from initial load)
          if (event.data.spanId && prev.some((p) => p.data.spanId === event.data.spanId)) return prev;
          const next = [...prev, event];
          if (next.length > 2000) return next.slice(-2000);
          return next;
        });
      } catch {
        // Ignore malformed events
      }
    };

    es.onerror = () => {
      setConnected(false);
      setError('Connection lost — reconnecting...');
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [url]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return { events, connected, error, clearEvents };
}
