import { useState, useCallback, useRef, useEffect } from 'preact/hooks';
import type { FunctionComponent } from 'preact';
import { css } from 'styled-system/css';

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
// Styles
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<Toast['type'], string> = {
  warning: 'var(--colors-yellow)',
  error: 'var(--colors-red)',
  info: 'var(--colors-accent)',
};

const cardBaseStyle = css({
  background: 'surface.panel',
  border: '1px solid token(colors.border.subtle)',
  borderRadius: 'md',
  padding: '2 3',
  display: 'flex',
  alignItems: 'center',
  gap: '2',
  animation: 'nextdog-toast-slide-in 0.2s ease-out',
  maxWidth: '360px',
  boxSizing: 'border-box',
});

const messageStyle = css({
  fontFamily: 'mono',
  fontSize: 'md',
  flex: 1,
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

const durationStyle = css({
  fontFamily: 'mono',
  fontSize: 'sm',
  color: 'fg.dim',
  flexShrink: 0,
});

const closeButtonStyle = css({
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '0 2px',
  lineHeight: 1,
  fontSize: 'xl',
  color: 'fg.dim',
  flexShrink: 0,
});

const containerStyle = css({
  position: 'fixed',
  bottom: '4',
  right: '4',
  display: 'flex',
  flexDirection: 'column',
  gap: '2',
  zIndex: 99999,
  pointerEvents: 'auto',
});

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

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
      className={cardBaseStyle}
      style={{
        borderLeft: `3px solid ${TYPE_COLORS[toast.type]}`,
        cursor: clickable ? 'pointer' : 'default',
      }}
    >
      {/* Message */}
      <span className={messageStyle}>
        {toast.message}
      </span>

      {/* Duration badge */}
      {toast.duration && (
        <span className={durationStyle}>
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
        className={closeButtonStyle}
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
    <div className={containerStyle}>
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
