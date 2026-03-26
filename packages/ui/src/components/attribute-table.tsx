import { showContextMenu, attrContextActions } from './context-menu.js';

interface AttributeTableProps {
  attributes: Record<string, unknown>;
  title?: string;
  onFilter?: (key: string, value: string) => void;
  onAddColumn?: (attrKey: string) => void;
  onRemoveColumn?: (attrKey: string) => void;
  activeColumns?: Set<string>;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function isLongValue(value: unknown): boolean {
  const str = formatValue(value);
  return str.length > 80 || str.includes('\n');
}

function isFilterable(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'object') return false;
  return String(value).length > 0 && String(value).length < 100;
}

export function AttributeTable({ attributes, title, onFilter, onAddColumn, onRemoveColumn, activeColumns }: AttributeTableProps) {
  const entries = Object.entries(attributes).filter(([_, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return null;

  const handleContextMenu = (e: MouseEvent, key: string, value: string) => {
    if (!onFilter) return;
    e.preventDefault();
    const actions = attrContextActions(key, value, {
      onFilter: (q) => onFilter(key, q),
      onAddColumn,
      onRemoveColumn: onRemoveColumn ? () => onRemoveColumn(key) : undefined,
      isColumnActive: activeColumns?.has(key),
    });
    showContextMenu(e.clientX, e.clientY, actions);
  };

  return (
    <div class="attr-table">
      {title && <div class="attr-table-title">{title}</div>}
      <table>
        <tbody>
          {entries.map(([key, value]) => (
            <tr key={key}>
              <td class="attr-key">{key}</td>
              <td class={`attr-value ${isLongValue(value) ? 'attr-value-long' : ''}`}>
                {isLongValue(value) ? (
                  <pre>{formatValue(value)}</pre>
                ) : onFilter && isFilterable(value) ? (
                  <span
                    class="attr-value-filterable"
                    onClick={() => onFilter(key, String(value))}
                    onContextMenu={(e: MouseEvent) => handleContextMenu(e, key, String(value))}
                    title={`Left-click to filter, right-click for options`}
                  >
                    {formatValue(value)}
                  </span>
                ) : (
                  formatValue(value)
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
