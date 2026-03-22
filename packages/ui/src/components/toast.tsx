import { useState, useCallback, useRef, useEffect } from 'preact/hooks';
import type { FunctionComponent } from 'preact';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Toast {
  id: string;
  message: string;
  type: 'warning' | 'error' | 'info';
  traceId?: string;
  duration?: string;
}

export interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
  onOpenTrace?: (traceId: string) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 5000;

export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, 'id'> & { id?: string }) => {
      const id = toast.id ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: Toast = { ...toast, id };

      setToasts((prev) => {
        const next = [...prev, newToast];
        // Keep only the newest MAX_VISIBLE toasts
        return next.slice(-MAX_VISIBLE);
      });

      const timer = setTimeout(() => {
        removeToast(id);
      }, AUTO_DISMISS_MS);
      timers.current.set(id, timer);

      return id;
    },
    [removeToast],
  );

  // Cleanup all timers on unmount
  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
    };
  }, []);

  return { toasts, addToast, removeToast } as const;
}

// ---------------------------------------------------------------------------
// Styles (injected once)
// ---------------------------------------------------------------------------

const KEYFRAMES_ID = '__nextdog_toast_keyframes';

function ensureKeyframes() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement('style');
  style.id = KEYFRAMES_ID;
  style.textContent = `
@keyframes nextdog-toast-slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0);    opacity: 1; }
}`;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<Toast['type'], string> = {
  warning: 'var(--yellow)',
  error: 'var(--red)',
  info: 'var(--accent)',
};

const ToastCard: FunctionComponent<{
  toast: Toast;
  onClose: () => void;
  onOpenTrace?: (traceId: string) => void;
}> = ({ toast, onClose, onOpenTrace }) => {
  const clickable = !!toast.traceId && !!onOpenTrace;

  return (
    <div
      role="alert"
      onClick={clickable ? () => onOpenTrace!(toast.traceId!) : undefined}
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderLeft: `3px solid ${TYPE_COLORS[toast.type]}`,
        borderRadius: '6px',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: clickable ? 'pointer' : 'default',
        animation: 'nextdog-toast-slide-in 0.2s ease-out',
        maxWidth: '360px',
        boxSizing: 'border-box' as const,
      }}
    >
      {/* Message */}
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: '12px',
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {toast.message}
      </span>

      {/* Duration badge */}
      {toast.duration && (
        <span
          style={{
            fontFamily: 'monospace',
            fontSize: '11px',
            color: 'var(--text-dim, #888)',
            flexShrink: 0,
          }}
        >
          {toast.duration}
        </span>
      )}

      {/* Close button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Dismiss"
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0 2px',
          lineHeight: 1,
          fontSize: '14px',
          color: 'var(--text-dim, #888)',
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
};

export const ToastContainer: FunctionComponent<ToastContainerProps> = ({
  toasts,
  removeToast,
  onOpenTrace,
}) => {
  useEffect(() => {
    ensureKeyframes();
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '16px',
        right: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 99999,
        pointerEvents: 'auto',
      }}
    >
      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onClose={() => removeToast(toast.id)}
          onOpenTrace={onOpenTrace}
        />
      ))}
    </div>
  );
};
