import { useMemo, useState, useCallback } from 'preact/hooks';
import type { SSEEvent } from './use-sse.js';

export interface UseEventsResult {
  filtered: SSEEvent[];
  services: string[];
  activeServices: Set<string>;
  toggleService: (name: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

function matchesQuery(event: SSEEvent, query: string): boolean {
  if (!query) return true;
  const parts = query.split(/\s+/).filter(Boolean);
  return parts.every((part) => {
    const [key, value] = part.split(':');
    if (key && value) {
      if (key === 'level' && event.data.level) return event.data.level === value;
      if (key === 'service') return event.data.serviceName === value;
      if (key === 'route') {
        const route = event.data.attributes['http.route'] ?? event.data.attributes['http.target'] ?? event.data.name;
        return String(route).includes(value);
      }
      if (key === 'status') return event.data.status?.code?.toLowerCase() === value.toLowerCase();
      if (key === 'trace') return event.data.traceId === value;
      const attrVal = event.data.attributes[key];
      if (attrVal !== undefined) return String(attrVal).includes(value);
    }
    const text = `${event.data.name} ${event.data.message ?? ''} ${event.data.serviceName}`.toLowerCase();
    return text.includes(part.toLowerCase());
  });
}

export function useEvents(events: SSEEvent[]): UseEventsResult {
  const [activeServices, setActiveServices] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  const services = useMemo(() => {
    const set = new Set<string>();
    for (const e of events) set.add(e.data.serviceName);
    return [...set].sort();
  }, [events]);

  const toggleService = useCallback((name: string) => {
    setActiveServices((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (activeServices.size > 0 && !activeServices.has(e.data.serviceName)) return false;
      return matchesQuery(e, searchQuery);
    });
  }, [events, activeServices, searchQuery]);

  return { filtered, services, activeServices, toggleService, searchQuery, setSearchQuery };
}
