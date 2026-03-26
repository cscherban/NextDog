import { Popover } from '@ark-ui/react/popover';
import { Portal } from '@ark-ui/react/portal';
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
  return (
    <Popover.Root positioning={{ placement: 'bottom-end', gutter: 4 }}>
      <Popover.Trigger
        className={css({
          fontSize: 'sm',
          fontFamily: 'mono',
          padding: '1 2',
          borderRadius: 'md',
          border: '1px solid token(colors.border.subtle)',
          background: 'transparent',
          color: 'fg',
          cursor: 'pointer',
          _hover: { background: 'surface.hover' },
        })}
      >
        + Column
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            className={css({
              width: '280px',
              background: 'surface.panel',
              border: '1px solid token(colors.border.subtle)',
              borderRadius: 'lg',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              fontSize: 'md',
              fontFamily: 'mono',
              overflow: 'hidden',
            })}
          >
            <div
              className={css({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2 3',
                borderBottom: '1px solid token(colors.border.subtle)',
                fontSize: 'sm',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: 'fg.dim',
              })}
            >
              <span>Add column</span>
              <Popover.CloseTrigger
                className={css({
                  background: 'none',
                  border: 'none',
                  color: 'fg.dim',
                  cursor: 'pointer',
                  fontSize: 'lg',
                  lineHeight: '1',
                  _hover: { color: 'fg.bright' },
                })}
              >
                ×
              </Popover.CloseTrigger>
            </div>

            {customColumns.length > 0 && (
              <div className={css({ padding: '1 3', borderBottom: '1px solid token(colors.border.subtle)' })}>
                <div className={css({ fontSize: 'xs', color: 'fg.dim', marginBottom: '1' })}>Active:</div>
                {customColumns.map((col) => (
                  <div
                    key={col.id}
                    className={css({
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingBottom: '1',
                    })}
                  >
                    <span>{col.attrKey}</span>
                    <button
                      onClick={() => onRemove(col.id)}
                      className={css({
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'red',
                        fontSize: 'md',
                        _hover: { opacity: 0.7 },
                      })}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className={css({ maxHeight: '200px', overflowY: 'auto' })}>
              {availableAttrs.length === 0 ? (
                <div className={css({ padding: '2 3', color: 'fg.dim' })}>
                  No more attributes available
                </div>
              ) : (
                availableAttrs.map((attr) => (
                  <Popover.CloseTrigger
                    key={attr}
                    asChild
                  >
                    <div
                      onClick={() => onAdd(attr)}
                      className={css({
                        padding: '1 3',
                        cursor: 'pointer',
                        _hover: { background: 'surface.hover' },
                      })}
                    >
                      {attr}
                    </div>
                  </Popover.CloseTrigger>
                ))
              )}
            </div>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
}
