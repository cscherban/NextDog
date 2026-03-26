import { useState, useRef, useEffect } from 'preact/hooks';
import { css } from 'styled-system/css';

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
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className={css({ position: 'relative', display: 'inline-block' })}>
      <button
        onClick={() => setOpen(!open)}
        className={css({
          fontSize: 'sm', fontFamily: 'mono', py: '1', px: '2',
          borderRadius: 'md', border: '1px solid token(colors.border.subtle)',
          background: 'transparent', color: 'fg', cursor: 'pointer',
          _hover: { background: 'surface.hover' },
        })}
      >
        + Column
      </button>

      {open && (
        <div
          className={css({
            position: 'absolute', top: '100%', right: '0',
            zIndex: 50, marginTop: '1', width: '280px',
            background: 'surface.panel', border: '1px solid token(colors.border.subtle)',
            borderRadius: 'lg', boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            fontSize: 'md', fontFamily: 'mono', overflow: 'hidden',
          })}
        >
          <div
            className={css({
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              py: '2', px: '3', borderBottom: '1px solid token(colors.border.subtle)',
              fontSize: 'sm', fontWeight: '600', textTransform: 'uppercase',
              letterSpacing: '0.5px', color: 'fg.dim',
            })}
          >
            <span>Add column</span>
            <button
              onClick={() => setOpen(false)}
              className={css({
                background: 'none', border: 'none', color: 'fg.dim',
                cursor: 'pointer', fontSize: 'lg', lineHeight: '1',
                _hover: { color: 'fg.bright' },
              })}
            >×</button>
          </div>

          {customColumns.length > 0 && (
            <div className={css({ py: '1', px: '3', borderBottom: '1px solid token(colors.border.subtle)' })}>
              <div className={css({ fontSize: 'xs', color: 'fg.dim', marginBottom: '1' })}>Active:</div>
              {customColumns.map((col) => (
                <div key={col.id} className={css({ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1' })}>
                  <span>{col.attrKey}</span>
                  <button
                    onClick={() => onRemove(col.id)}
                    className={css({ background: 'none', border: 'none', cursor: 'pointer', color: 'red', fontSize: 'md', _hover: { opacity: 0.7 } })}
                  >×</button>
                </div>
              ))}
            </div>
          )}

          <div className={css({ maxHeight: '200px', overflowY: 'auto' })}>
            {availableAttrs.length === 0 ? (
              <div className={css({ py: '2', px: '3', color: 'fg.dim' })}>No more attributes available</div>
            ) : (
              availableAttrs.map((attr) => (
                <div
                  key={attr}
                  onClick={() => { onAdd(attr); setOpen(false); }}
                  className={css({ py: '1', px: '3', cursor: 'pointer', _hover: { background: 'surface.hover' } })}
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
