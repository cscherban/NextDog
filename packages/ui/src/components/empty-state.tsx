interface EmptyStateProps {
  connected: boolean;
}

export function EmptyState({ connected }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        gap: '16px',
      }}
    >
      <div style={{ fontSize: '48px', lineHeight: 1 }}>🐾</div>

      <div style={{ fontSize: '16px', color: 'var(--text-dim)' }}>
        {connected ? 'Waiting for events...' : 'Connecting to sidecar...'}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontSize: '13px',
          color: 'var(--text-dim)',
        }}
      >
        <div>✓ Add withNextDog() to next.config.js</div>
        <div>✓ Add register() to instrumentation.ts</div>
        <div>✓ Run npm run dev</div>
        {connected ? (
          <div style={{ color: 'var(--green)' }}>✓ Sidecar connected on :6789</div>
        ) : (
          <div>○ Waiting for sidecar on :6789</div>
        )}
      </div>

      <div
        style={{
          fontSize: '11px',
          fontStyle: 'italic',
          color: 'var(--text-dim)',
        }}
      >
        Events will appear here automatically
      </div>
    </div>
  );
}
