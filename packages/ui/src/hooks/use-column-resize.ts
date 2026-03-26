import { useState, useEffect, useRef, useMemo, useCallback } from 'preact/hooks';

const STORAGE_KEY_PREFIX = 'nextdog:col-widths:';
const MIN_WIDTH = 40;

export interface ColumnConfig {
  id: string;
  defaultWidth: number;
}

function loadWidths(viewId: string): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + viewId);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveWidths(viewId: string, widths: Record<string, number>) {
  try { localStorage.setItem(STORAGE_KEY_PREFIX + viewId, JSON.stringify(widths)); } catch {}
}

export function useColumnResize(viewId: string, columns: ColumnConfig[]) {
  const [overrides, setOverrides] = useState<Record<string, number>>(() => loadWidths(viewId));
  const dragging = useRef<{ colId: string; startX: number; startWidth: number } | null>(null);
  const pendingWidth = useRef<{ colId: string; width: number } | null>(null);
  const rafId = useRef<number>(0);

  // Persist on change
  useEffect(() => {
    saveWidths(viewId, overrides);
  }, [viewId, overrides]);

  // Pointer move/up handlers (registered once)
  useEffect(() => {
    const flushPending = () => {
      if (pendingWidth.current) {
        const { colId, width } = pendingWidth.current;
        pendingWidth.current = null;
        setOverrides((prev) => ({ ...prev, [colId]: width }));
      }
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - dragging.current.startX;
      const newWidth = Math.max(MIN_WIDTH, dragging.current.startWidth + delta);
      pendingWidth.current = { colId: dragging.current.colId, width: newWidth };
      cancelAnimationFrame(rafId.current);
      rafId.current = requestAnimationFrame(flushPending);
    };

    const onUp = () => {
      if (!dragging.current) return;
      // Flush any pending width
      if (pendingWidth.current) {
        const { colId, width } = pendingWidth.current;
        pendingWidth.current = null;
        setOverrides((prev) => ({ ...prev, [colId]: width }));
      }
      dragging.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  const startResize = useCallback((colId: string, startX: number) => {
    const width = overrides[colId] ?? columns.find((c) => c.id === colId)?.defaultWidth ?? 100;
    dragging.current = { colId, startX, startWidth: width };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, [overrides, columns]);

  const gridTemplate = useMemo(() => {
    return columns.map((col) => {
      const w = overrides[col.id] ?? col.defaultWidth;
      if (col.defaultWidth === 0) return '1fr';
      return `${w}px`;
    }).join(' ');
  }, [columns, overrides]);

  const resetWidths = useCallback(() => {
    setOverrides({});
    try { localStorage.removeItem(STORAGE_KEY_PREFIX + viewId); } catch {}
  }, [viewId]);

  return { gridTemplate, startResize, resetWidths };
}
