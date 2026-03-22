import { useState, useCallback } from 'preact/hooks';
import type { SSEEvent } from '../hooks/use-sse.js';

interface ReplayResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  duration: number;
  url: string;
  method: string;
}

interface ReplayError {
  error: string;
  message: string;
  url: string;
  method: string;
}

type ReplayState =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'success'; data: ReplayResponse }
  | { phase: 'error'; data: ReplayError };

function StatusBadge({ status }: { status: number }) {
  const color = status < 300 ? 'var(--green)' : status < 400 ? 'var(--yellow)' : 'var(--red)';
  return <span style={`color:${color};font-weight:600`}>{status}</span>;
}

function formatBody(body: string, contentType: string): string {
  if (contentType.includes('json')) {
    try {
      return JSON.stringify(JSON.parse(body), null, 2);
    } catch {
      return body;
    }
  }
  return body;
}

interface ReplayButtonProps {
  event: SSEEvent;
}

export function ReplayButton({ event }: ReplayButtonProps) {
  const [state, setState] = useState<ReplayState>({ phase: 'idle' });

  const replay = useCallback(async () => {
    setState({ phase: 'loading' });

    try {
      const res = await fetch('/api/replay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spanId: event.data.spanId }),
      });

      const data = await res.json();

      if (res.ok) {
        setState({ phase: 'success', data: data as ReplayResponse });
      } else {
        setState({ phase: 'error', data: data as ReplayError });
      }
    } catch (err) {
      setState({
        phase: 'error',
        data: {
          error: 'network error',
          message: (err as Error).message,
          url: '',
          method: '',
        },
      });
    }
  }, [event]);

  return (
    <div>
      <button
        class="pill"
        onClick={replay}
        disabled={state.phase === 'loading'}
        style={`
          background: var(--accent);
          color: var(--bg);
          font-weight: 600;
          opacity: ${state.phase === 'loading' ? '0.6' : '1'};
        `}
      >
        {state.phase === 'loading' ? 'Replaying...' : 'Replay'}
      </button>

      {state.phase === 'success' && (
        <div style="margin-top:8px;border:1px solid var(--border);border-radius:6px;overflow:hidden">
          {/* Response header bar */}
          <div style="
            display:flex;align-items:center;gap:8px;
            padding:8px 12px;
            background:var(--bg-surface);
            border-bottom:1px solid var(--border);
            font-family:var(--mono);font-size:12px;
          ">
            <StatusBadge status={state.data.status} />
            <span style="color:var(--text-dim)">{state.data.statusText}</span>
            <span style="color:var(--text-dim)">|</span>
            <span style="color:var(--text-dim)">{state.data.duration}ms</span>
            <span style="color:var(--text-dim)">|</span>
            <span style="color:var(--text-dim)">{state.data.method} {state.data.url}</span>
          </div>

          {/* Response headers (collapsed by default) */}
          <details style="border-bottom:1px solid var(--border)">
            <summary style="
              padding:6px 12px;font-size:11px;color:var(--text-dim);
              cursor:pointer;user-select:none;
            ">
              Response Headers ({Object.keys(state.data.headers).length})
            </summary>
            <div style="padding:4px 12px 8px;font-family:var(--mono);font-size:11px">
              {Object.entries(state.data.headers).map(([k, v]) => (
                <div key={k} style="color:var(--text-dim)">
                  <span style="color:var(--text)">{k}</span>: {v}
                </div>
              ))}
            </div>
          </details>

          {/* Response body */}
          <pre style="
            margin:0;padding:12px;
            font-family:var(--mono);font-size:12px;
            max-height:400px;overflow:auto;
            color:var(--text);
            white-space:pre-wrap;word-break:break-all;
          ">{formatBody(
            state.data.body,
            state.data.headers['content-type'] ?? ''
          )}</pre>
        </div>
      )}

      {state.phase === 'error' && (
        <div style="
          margin-top:8px;padding:8px 12px;
          border:1px solid var(--red);border-radius:6px;
          font-family:var(--mono);font-size:12px;
          color:var(--red);
        ">
          <div style="font-weight:600">Replay failed</div>
          <div style="color:var(--text-dim);margin-top:4px">{state.data.message}</div>
          {state.data.url && (
            <div style="color:var(--text-dim);margin-top:2px">{state.data.method} {state.data.url}</div>
          )}
        </div>
      )}
    </div>
  );
}
