import { useRef, useEffect, useState } from 'preact/hooks';
import { EventRow } from '../components/event-row.js';
import { ServicePills } from '../components/service-pills.js';
import { SearchBar } from '../components/search-bar.js';
import { useKeyboard } from '../hooks/use-keyboard.js';
import type { SSEEvent } from '../hooks/use-sse.js';
import type { UseEventsResult } from '../hooks/use-events.js';

interface LiveTailProps {
  path?: string;
  eventsResult: UseEventsResult;
  onOpenTrace?: (traceId: string) => void;
}

export function LiveTail({ eventsResult, onOpenTrace }: LiveTailProps) {
  const { filtered, services, activeServices, toggleService, searchQuery, setSearchQuery } = eventsResult;
  const listRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useKeyboard({
    onNext: () => setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)),
    onPrev: () => setSelectedIndex((i) => Math.max(i - 1, 0)),
    onSelect: () => {
      if (selectedIndex >= 0 && filtered[selectedIndex]?.data.traceId) {
        onOpenTrace?.(filtered[selectedIndex].data.traceId!);
      }
    },
    onBack: () => setSelectedIndex(-1),
  });

  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [filtered.length, autoScroll]);

  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
  };

  const handleEventClick = (event: SSEEvent) => {
    if (event.data.traceId) onOpenTrace?.(event.data.traceId);
  };

  return (
    <>
      <ServicePills services={services} active={activeServices} onToggle={toggleService} />
      <SearchBar value={searchQuery} onChange={setSearchQuery} />
      <div class="event-list" ref={listRef} onScroll={handleScroll}>
        {filtered.length === 0 ? (
          <div class="empty">Waiting for events...</div>
        ) : (
          filtered.map((event, i) => (
            <EventRow key={i} event={event} selected={i === selectedIndex} onClick={() => handleEventClick(event)} />
          ))
        )}
      </div>
      {!autoScroll && (
        <button style="position:fixed;bottom:16px;right:16px;padding:6px 12px;background:var(--accent);color:white;border:none;border-radius:4px;cursor:pointer;font-size:12px;" onClick={() => setAutoScroll(true)}>
          Resume auto-scroll
        </button>
      )}
    </>
  );
}
