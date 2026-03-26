import { css } from 'styled-system/css';

interface EmptyStateProps {
  connected: boolean;
}

export function EmptyState({ connected }: EmptyStateProps) {
  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        gap: '4',
      })}
    >
      <div className={css({ fontSize: '48px', lineHeight: '1' })}>🐾</div>

      <div className={css({ fontSize: 'xl', color: 'fg.dim' })}>
        {connected ? 'Waiting for events...' : 'Connecting to sidecar...'}
      </div>

      <div
        className={css({
          display: 'flex',
          flexDirection: 'column',
          gap: '1',
          fontSize: 'lg',
          color: 'fg.dim',
        })}
      >
        <div>✓ Add withNextDog() to next.config.js</div>
        <div>✓ Add register() to instrumentation.ts</div>
        <div>✓ Run npm run dev</div>
        {connected ? (
          <div className={css({ color: 'green' })}>✓ Sidecar connected on :6789</div>
        ) : (
          <div>○ Waiting for sidecar on :6789</div>
        )}
      </div>

      <div
        className={css({
          fontSize: 'sm',
          fontStyle: 'italic',
          color: 'fg.dim',
        })}
      >
        Events will appear here automatically
      </div>
    </div>
  );
}
