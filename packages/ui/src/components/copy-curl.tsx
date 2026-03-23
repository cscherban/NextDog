import { useState, useCallback } from 'preact/hooks';
import { extractHttpMeta } from '../utils/format.js';
import type { SSEEvent } from '../hooks/use-sse.js';

/** Sensitive headers to strip in safe mode */
const SENSITIVE_HEADERS = new Set([
  'authorization', 'cookie', 'set-cookie', 'x-csrf-token',
  'x-api-key', 'x-auth-token', 'proxy-authorization',
]);

function buildCurl(event: SSEEvent, includeSensitive: boolean): string {
  const attrs = event.data.attributes;
  const { method, url } = extractHttpMeta(attrs, event.data.name);

  const parts = [`curl -X ${method}`];

  // Add headers from attributes
  for (const [key, value] of Object.entries(attrs)) {
    if (key.startsWith('http.request.header.')) {
      const headerName = key.replace('http.request.header.', '');
      if (!includeSensitive && SENSITIVE_HEADERS.has(headerName.toLowerCase())) continue;
      parts.push(`  -H '${headerName}: ${String(value)}'`);
    }
  }

  // Add cookies if present and in full mode
  const cookies = attrs['http.request.cookies'] ?? attrs['cookie'];
  if (cookies && includeSensitive) {
    parts.push(`  -b '${String(cookies)}'`);
  } else if (cookies && !includeSensitive) {
    parts.push(`  # cookies omitted (use Full mode to include)`);
  }

  // Add body if present
  const body = attrs['http.request.body'];
  if (body) {
    parts.push(`  -d '${String(body)}'`);
  }

  parts.push(`  '${url}'`);
  return parts.join(' \\\n');
}

interface CopyCurlProps {
  event: SSEEvent;
}

export function CopyCurl({ event }: CopyCurlProps) {
  const [copied, setCopied] = useState<'safe' | 'full' | null>(null);

  const copy = useCallback(async (mode: 'safe' | 'full') => {
    const curl = buildCurl(event, mode === 'full');
    await navigator.clipboard.writeText(curl);
    setCopied(mode);
    setTimeout(() => setCopied(null), 2000);
  }, [event]);

  return (
    <div style="display:flex;gap:4px">
      <button
        class="pill"
        onClick={() => copy('safe')}
        title="Copy curl without cookies/auth headers"
      >
        {copied === 'safe' ? '✓ Copied' : 'Copy curl'}
      </button>
      <button
        class="pill"
        onClick={() => copy('full')}
        title="Copy curl with all headers including cookies (may contain session tokens)"
        style={copied === 'full' ? 'color:var(--green)' : 'color:var(--yellow)'}
      >
        {copied === 'full' ? '✓ Copied' : 'Full'}
      </button>
    </div>
  );
}
