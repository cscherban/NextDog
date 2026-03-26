import { css } from 'styled-system/css';
import { useMemo } from 'preact/hooks';
import type { SSEEvent } from '../hooks/use-sse.js';

const servicePillsStyle = css({
  display: 'flex',
  gap: '6px',
  padding: '2 4',
  borderBottom: '1px solid token(colors.border.subtle)',
  flexWrap: 'wrap',
});

const pillStyle = css({
  padding: '2px 10px',
  borderRadius: 'full',
  fontSize: 'sm',
  fontWeight: 500,
  border: '1px solid token(colors.border.subtle)',
  cursor: 'pointer',
  background: 'transparent',
  color: 'fg.dim',
});

const pillActiveStyle = css({
  background: 'accent',
  borderColor: 'accent',
  color: 'white',
});

const pillErrorDotStyle = css({
  display: 'inline-block',
  width: '6px',
  height: '6px',
  borderRadius: '50%',
  background: 'red',
  marginLeft: '1',
  verticalAlign: 'middle',
});

interface ServicePillsProps {
  services: string[];
  active: Set<string>;
  onToggle: (name: string) => void;
  events?: SSEEvent[];
}

interface ServiceStats {
  total: number;
  errors: number;
}

export function ServicePills({ services, active, onToggle, events }: ServicePillsProps) {
  if (services.length === 0) return null;

  const stats = useMemo(() => {
    const map = new Map<string, ServiceStats>();
    if (!events) return map;
    for (const e of events) {
      const name = e.data.serviceName;
      if (!map.has(name)) map.set(name, { total: 0, errors: 0 });
      const s = map.get(name)!;
      s.total++;
      if (e.data.status?.code === 'ERROR' || (e.data.statusCode && e.data.statusCode >= 500)) {
        s.errors++;
      }
    }
    return map;
  }, [events]);

  return (
    <div className={servicePillsStyle}>
      {services.map((name) => {
        const s = stats.get(name);
        const hasErrors = s && s.errors > 0;
        return (
          <button key={name} className={`${pillStyle} ${active.has(name) ? pillActiveStyle : ''}`} onClick={() => onToggle(name)}>
            {name}
            {hasErrors && (
              <span className={pillErrorDotStyle} title={`${s!.errors} errors`} />
            )}
          </button>
        );
      })}
    </div>
  );
}
