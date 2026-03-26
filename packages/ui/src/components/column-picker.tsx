import { useState, useRef, useEffect } from 'preact/hooks';

interface ColumnDef {
  id: string;
  label: string;
  attrKey: string;
}

interface ColumnPickerProps {
  customColumns: ColumnDef[];
  availableAttrs: string[];
  onAdd: (attrKey: string) => void;
  onRemove: (id: string) => void;
}

export function ColumnPicker({ customColumns, availableAttrs, onAdd, onRemove }: ColumnPickerProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('pointerdown', handler);
    return () => window.removeEventListener('pointerdown', handler);
  }, [open]);

  return (
    <div style="position:relative;display:inline-block">
      <button
        ref={btnRef}
        class="pill"
        onClick={() => setOpen(!open)}
        title="Customize columns"
        style="font-size:11px"
      >
        + Column
      </button>
      {open && (
        <div ref={popRef} class="col-picker-popover">
          <div class="col-picker-header">
            <span>Add attribute column</span>
            <button class="pane-btn" onClick={() => setOpen(false)} title="Close">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          {customColumns.length > 0 && (
            <div class="col-picker-active">
              <div class="col-picker-section-label">Active:</div>
              {customColumns.map((col) => (
                <div key={col.id} class="col-picker-active-item">
                  <span>{col.attrKey}</span>
                  <button class="pill" onClick={() => onRemove(col.id)} style="font-size:10px;color:var(--red);padding:1px 6px">×</button>
                </div>
              ))}
            </div>
          )}
          <div class="col-picker-list">
            {availableAttrs.length === 0 ? (
              <div class="col-picker-empty">No more attributes available</div>
            ) : (
              availableAttrs.map((attr) => (
                <div
                  key={attr}
                  class="col-picker-item"
                  onClick={() => onAdd(attr)}
                >
                  {attr}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
