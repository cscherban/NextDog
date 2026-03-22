interface AttributeTableProps {
  attributes: Record<string, unknown>;
  title?: string;
  onFilter?: (key: string, value: string) => void;
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

export function AttributeTable({ attributes, title, onFilter }: AttributeTableProps) {
  const entries = Object.entries(attributes).filter(([_, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return null;

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
                    title={`Filter by ${key}:${value}`}
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
