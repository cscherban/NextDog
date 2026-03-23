import { useState, useRef, useMemo } from 'preact/hooks';
import type { SSEEvent } from '../hooks/use-sse.js';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  events?: SSEEvent[];
}

interface FilterToken {
  raw: string;
  negated: boolean;
  key?: string;
  value: string;
  operator: 'AND' | 'OR';
}

function parseTokens(query: string): FilterToken[] {
  if (!query.trim()) return [];
  const tokens: FilterToken[] = [];
  // Split by spaces but preserve quoted strings
  const parts = query.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  let nextOperator: 'AND' | 'OR' = 'AND';

  for (const part of parts) {
    if (part.toUpperCase() === 'OR') {
      nextOperator = 'OR';
      continue;
    }
    if (part.toUpperCase() === 'AND') {
      nextOperator = 'AND';
      continue;
    }

    let raw = part;
    let negated = false;
    let working = part;

    if (working.startsWith('!') || working.startsWith('-')) {
      negated = true;
      working = working.slice(1);
    }

    const colonIdx = working.indexOf(':');
    if (colonIdx > 0) {
      const key = working.slice(0, colonIdx);
      let value = working.slice(colonIdx + 1);
      // Strip quotes
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      tokens.push({ raw, negated, key, value, operator: nextOperator });
    } else {
      let value = working;
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      tokens.push({ raw, negated, value, operator: nextOperator });
    }
    nextOperator = 'AND';
  }
  return tokens;
}

function pillColor(key?: string, negated?: boolean): string {
  if (negated) return 'pill-filter pill-negated';
  switch (key) {
    case 'level': return 'pill-filter pill-level';
    case 'service': return 'pill-filter pill-service';
    case 'status': return 'pill-filter pill-status';
    case 'route':
    case 'name': return 'pill-filter pill-route';
    case 'trace':
    case 'traceId': return 'pill-filter pill-trace';
    default: return 'pill-filter';
  }
}

function removeToken(query: string, tokenRaw: string): string {
  // Remove the token and any adjacent OR/AND operators
  const parts = query.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
  const idx = parts.indexOf(tokenRaw);
  if (idx === -1) return query;

  // Remove the token
  parts.splice(idx, 1);
  // Clean up orphaned OR/AND
  if (idx > 0 && parts[idx - 1]?.toUpperCase() === 'OR') {
    parts.splice(idx - 1, 1);
  } else if (idx < parts.length && parts[idx]?.toUpperCase() === 'OR') {
    parts.splice(idx, 1);
  }
  if (idx > 0 && parts[idx - 1]?.toUpperCase() === 'AND') {
    parts.splice(idx - 1, 1);
  }

  return parts.join(' ');
}

// Collect known facets from events for autocomplete
function collectFacets(events: SSEEvent[]): string[] {
  const facets = new Set<string>(['level', 'service', 'status', 'route', 'name', 'message', 'type', 'kind', 'trace']);
  for (const e of events.slice(-200)) {
    for (const key of Object.keys(e.data.attributes)) {
      facets.add(key);
    }
  }
  return [...facets].sort();
}

export function SearchBar({ value, onChange, events }: SearchBarProps) {
  const [focused, setFocused] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const tokens = parseTokens(value);
  const facets = useMemo(() => collectFacets(events ?? []), [events]);

  // Filter suggestions based on current input
  const suggestions = useMemo(() => {
    if (!inputValue) return facets.slice(0, 8).map((f) => `${f}:`);
    const lower = inputValue.toLowerCase();
    if (inputValue.includes(':')) return [];
    return facets
      .filter((f) => f.toLowerCase().includes(lower))
      .slice(0, 8)
      .map((f) => `${f}:`);
  }, [inputValue, facets]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        const newQuery = value ? `${value} ${inputValue.trim()}` : inputValue.trim();
        onChange(newQuery);
        setInputValue('');
        setShowSuggestions(false);
      }
    } else if (e.key === 'Backspace' && !inputValue && tokens.length > 0) {
      // Remove last token
      const lastToken = tokens[tokens.length - 1];
      onChange(removeToken(value, lastToken.raw));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      (e.target as HTMLInputElement).blur();
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleRemoveToken = (tokenRaw: string) => {
    onChange(removeToken(value, tokenRaw));
  };

  const [showHelp, setShowHelp] = useState(false);

  return (
    <div class="search-bar-container">
      <div style="display:flex;gap:6px;align-items:stretch">
      <div class={`search-bar-input ${focused ? 'search-bar-focused' : ''}`} style="flex:1" onClick={() => inputRef.current?.focus()}>
        {tokens.map((token, i) => (
          <span key={i} class={pillColor(token.key, token.negated)}>
            {token.operator === 'OR' && i > 0 && <span class="pill-operator">OR</span>}
            {token.negated && <span class="pill-neg">!</span>}
            {token.key && <span class="pill-key">{token.key}</span>}
            {token.key && <span class="pill-sep">:</span>}
            <span class="pill-val">{token.value}</span>
            <button class="pill-remove" onClick={(e) => { e.stopPropagation(); handleRemoveToken(token.raw); }}>x</button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          class="search-input"
          placeholder={tokens.length === 0 ? 'Filter... (e.g. level:error, !service:noisy, status:OK OR status:ERROR)' : ''}
          value={inputValue}
          onInput={(e) => {
            setInputValue((e.target as HTMLInputElement).value);
            setShowSuggestions(true);
          }}
          onFocus={() => { setFocused(true); setShowSuggestions(true); }}
          onBlur={() => { setFocused(false); setTimeout(() => setShowSuggestions(false), 150); }}
          onKeyDown={handleKeyDown}
        />
      </div>
      <button
        class="pill"
        style="font-size:12px;padding:4px 8px;flex-shrink:0;position:relative"
        onClick={() => setShowHelp((v) => !v)}
        title="Search syntax help"
      >
        ?
      </button>
      </div>
      {showHelp && (
        <div style="
          margin-top:6px;padding:10px 12px;
          background:var(--bg-surface);border:1px solid var(--border);
          border-radius:4px;font-size:11px;font-family:var(--mono);
        ">
          <div style="font-weight:600;color:var(--text-bright);margin-bottom:6px">Filter Syntax</div>
          <div style="color:var(--text-dim);line-height:1.8">
            <div><span style="color:var(--text)">key:value</span> — filter by attribute</div>
            <div><span style="color:var(--text)">!key:value</span> — exclude matches</div>
            <div><span style="color:var(--text)">a OR b</span> — match either</div>
            <div><span style="color:var(--text)">text</span> — search name, message, route</div>
            <div style="margin-top:4px;color:var(--text-dim)">Keys: level, service, route, status, name, kind, runtime, traceId</div>
          </div>
        </div>
      )}
      {showSuggestions && suggestions.length > 0 && focused && (
        <div class="search-suggestions">
          {suggestions.map((s) => (
            <div key={s} class="search-suggestion" onMouseDown={() => handleSuggestionClick(s)}>
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
