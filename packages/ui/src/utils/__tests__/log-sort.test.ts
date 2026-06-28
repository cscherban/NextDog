import { describe, expect, it } from 'vitest';
import type { SSEEvent } from '../../hooks/use-sse';
import { sortLogs } from '../log-sort';

// Logs are kept oldest-first in the buffer (mergeEvents/appendLiveEvents), so these
// fixtures are ascending by time, matching what the Logs view feeds to sortLogs.
const log = (ts: number, message: string, level = 'info', serviceName = 'web'): SSEEvent => ({
  type: 'log',
  timestamp: ts,
  data: { name: '', message, level, timestamp: ts, attributes: {}, serviceName },
});

const ascending = [log(10, 'a'), log(20, 'b'), log(30, 'c')];

describe('sortLogs — time (issue #59)', () => {
  it('returns the buffer unchanged for ascending time (it is already ascending)', () => {
    expect(sortLogs(ascending, 'time', 'asc')).toBe(ascending);
  });

  it('actually reverses for descending time — the bug was this being a no-op', () => {
    const desc = sortLogs(ascending, 'time', 'desc');
    expect(desc.map((e) => e.timestamp)).toEqual([30, 20, 10]);
  });

  it('asc and desc by time produce different orders (regression guard)', () => {
    const asc = sortLogs(ascending, 'time', 'asc').map((e) => e.timestamp);
    const desc = sortLogs(ascending, 'time', 'desc').map((e) => e.timestamp);
    expect(asc).not.toEqual(desc);
  });

  it('orders by the log timestamp, not the envelope timestamp, when they differ', () => {
    // Envelope ts ascending, but inner data.timestamp reversed → desc must follow data.ts.
    const a = { ...log(1, 'first'), data: { ...log(1, 'first').data, timestamp: 300 } };
    const b = { ...log(2, 'second'), data: { ...log(2, 'second').data, timestamp: 100 } };
    const desc = sortLogs([a, b], 'time', 'desc');
    expect(desc.map((e) => e.data.message)).toEqual(['first', 'second']); // 300 before 100
  });

  it('survives a live append: a newer event sorts to the front in desc order', () => {
    // Mirrors the live view: a new (newest) event is appended to the ascending
    // buffer, then re-sorted descending. It must land first.
    const withNew = [...ascending, log(40, 'newest')];
    const desc = sortLogs(withNew, 'time', 'desc');
    expect(desc[0].data.message).toBe('newest');
    expect(desc.map((e) => e.timestamp)).toEqual([40, 30, 20, 10]);
  });
});

describe('sortLogs — other fields', () => {
  it('sorts by level', () => {
    const rows = [log(1, 'a', 'warn'), log(2, 'b', 'error'), log(3, 'c', 'info')];
    expect(sortLogs(rows, 'level', 'asc').map((e) => e.data.level)).toEqual([
      'error',
      'info',
      'warn',
    ]);
  });

  it('sorts by message descending', () => {
    const rows = [log(1, 'apple'), log(2, 'cherry'), log(3, 'banana')];
    expect(sortLogs(rows, 'message', 'desc').map((e) => e.data.message)).toEqual([
      'cherry',
      'banana',
      'apple',
    ]);
  });

  it('sorts a custom numeric attribute column numerically', () => {
    const mk = (ts: number, dur: number): SSEEvent => ({
      type: 'log',
      timestamp: ts,
      data: { name: '', message: '', timestamp: ts, attributes: { duration: dur }, serviceName: 'w' },
    });
    const rows = [mk(1, 100), mk(2, 9), mk(3, 50)];
    expect(sortLogs(rows, 'custom-duration', 'asc').map((e) => e.data.attributes.duration)).toEqual([
      9, 50, 100,
    ]);
  });
});
