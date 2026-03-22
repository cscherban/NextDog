import { useEffect, useRef, useState } from 'preact/hooks';

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

interface UseSSEResult {
  events: SSEEvent[];
  connected: boolean;
  error: string | null;
}

export function useSSE(url: string): UseSSEResult {
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const esRef = useRef<EventSource | null>(null);

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
        setEvents((prev) => [...prev, event]);
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

  return { events, connected, error };
}
