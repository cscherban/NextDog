import { useMemo, useState, useCallback } from 'preact/hooks';
import type { SSEEvent } from './use-sse.js';

export interface UseEventsResult {
  filtered: SSEEvent[];
  services: string[];
  activeServices: Set<string>;
  toggleService: (name: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string | ((prev: string) => string)) => void;
}

function parseFilter(part: string): { key: string; value: string } | null {
  // Split on first colon only — handles values with colons (URLs, timestamps)
  const idx = part.indexOf(':');
  if (idx <= 0 || idx === part.length - 1) return null;
  return { key: part.slice(0, idx), value: part.slice(idx + 1) };
}

function matchesFilter(event: SSEEvent, key: string, value: string): boolean {
  const valueLower = value.toLowerCase();

  // Built-in field matchers
  switch (key) {
    case 'level':
      return (event.data.level ?? '').toLowerCase() === valueLower;
    case 'service':
      return event.data.serviceName.toLowerCase() === valueLower;
    case 'route': {
      const route = String(
        event.data.attributes['http.route'] ??
        event.data.attributes['http.target'] ??
        event.data.name ?? ''
      ).toLowerCase();
      return route.includes(valueLower);
    }
    case 'status':
      return (event.data.status?.code ?? '').toLowerCase() === valueLower;
    case 'trace':
    case 'traceId':
      return event.data.traceId === value;
    case 'span':
    case 'spanId':
      return event.data.spanId === value;
    case 'name':
      return (event.data.name ?? '').toLowerCase().includes(valueLower);
    case 'message':
      return (event.data.message ?? '').toLowerCase().includes(valueLower);
    case 'kind':
      return (event.data.kind ?? '').toLowerCase() === valueLower;
    case 'type':
      return event.type === value;
  }

  // Check attributes (including dot-notation nested keys)
  const attrVal = event.data.attributes[key];
  if (attrVal !== undefined) {
    return String(attrVal).toLowerCase().includes(valueLower);
  }

  return false;
}

function matchesQuery(event: SSEEvent, query: string): boolean {
  if (!query) return true;

  const parts = query.split(/\s+/).filter(Boolean);
  return parts.every((part) => {
    const filter = parseFilter(part);
    if (filter) {
      return matchesFilter(event, filter.key, filter.value);
    }

    // Freetext search across all visible fields
    const searchText = [
      event.data.name,
      event.data.message,
      event.data.serviceName,
      event.data.level,
      event.data.status?.code,
      event.data.traceId,
      ...Object.values(event.data.attributes).map(String),
    ].filter(Boolean).join(' ').toLowerCase();

    return searchText.includes(part.toLowerCase());
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
