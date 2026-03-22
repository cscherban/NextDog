import { useMemo } from 'preact/hooks';
import type { SSEEvent } from '../hooks/use-sse.js';

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
    <div class="service-pills">
      {services.map((name) => {
        const s = stats.get(name);
        const hasErrors = s && s.errors > 0;
        return (
          <button key={name} class={`pill ${active.has(name) ? 'active' : ''}`} onClick={() => onToggle(name)}>
            {name}
            {hasErrors && (
              <span class="pill-error-dot" title={`${s!.errors} errors`} />
            )}
          </button>
        );
      })}
    </div>
  );
}
