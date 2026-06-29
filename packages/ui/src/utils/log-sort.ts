import type { SSEEvent } from '../hooks/use-sse';

export type SortDir = 'asc' | 'desc';

/** Time used to order a log row — the log's own timestamp, falling back to the
 *  envelope timestamp. Matches the key {@link mergeEvents} sorts the buffer by, so
 *  the ascending fast path below is genuinely consistent with a real sort. */
function logTime(e: SSEEvent): number {
  return e.data.timestamp ?? e.timestamp;
}

/**
 * Sort a list of log events (already oldest-first, as the live buffer is kept) by
 * `sortBy`/`sortDir`, returning a new array — except the ascending-time case, which
 * is already satisfied and returned as-is to preserve reference identity (and the
 * live-tail fast path).
 *
 * Issue #59: the previous inline sort short-circuited the *descending* time case to
 * the raw buffer. But the buffer is oldest-first (ascending), so "desc" rendered
 * ascending — identical to "asc". Toggling the Time header therefore had no visible
 * effect. A descending time sort must actually reverse the order; only ascending is
 * the no-op fast path.
 */
export function sortLogs(logs: SSEEvent[], sortBy: string, sortDir: SortDir): SSEEvent[] {
  if (sortBy === 'time' && sortDir === 'asc') return logs; // buffer is already ascending

  const dir = sortDir === 'asc' ? 1 : -1;
  const sorted = [...logs];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'time':
        return (logTime(a) - logTime(b)) * dir;
      case 'level':
        return (a.data.level ?? '').localeCompare(b.data.level ?? '') * dir;
      case 'service':
        return a.data.serviceName.localeCompare(b.data.serviceName) * dir;
      case 'message':
        return (
          (a.data.message ?? a.data.name ?? '').localeCompare(
            b.data.message ?? b.data.name ?? '',
          ) * dir
        );
      default: {
        const key = sortBy.replace('custom-', '');
        const av = String(a.data.attributes[key] ?? '');
        const bv = String(b.data.attributes[key] ?? '');
        const an = Number(av);
        const bn = Number(bv);
        if (!Number.isNaN(an) && !Number.isNaN(bn)) return (an - bn) * dir;
        return av.localeCompare(bv) * dir;
      }
    }
  });
  return sorted;
}
