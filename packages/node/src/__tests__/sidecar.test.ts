import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ensureSidecar } from '../sidecar.js';

const mockFetch = vi.fn();

describe('ensureSidecar', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns immediately if health check passes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ status: 'ok' }),
    });
    await ensureSidecar('http://localhost:6789');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:6789/health',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('does not throw if health check fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('connection refused'));
    await expect(ensureSidecar('http://localhost:6789')).resolves.not.toThrow();
  });
});
