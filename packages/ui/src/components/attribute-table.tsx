interface AttributeTableProps {
  attributes: Record<string, unknown>;
  title?: string;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

function isLongValue(value: unknown): boolean {
  const str = formatValue(value);
  return str.length > 80 || str.includes('\n');
}

export function AttributeTable({ attributes, title }: AttributeTableProps) {
  const entries = Object.entries(attributes).filter(([_, v]) => v !== undefined);
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
