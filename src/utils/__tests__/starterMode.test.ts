import { describe, it, expect, beforeEach } from 'vitest';
import {
  STARTER_STATS_KEY,
  recordCompletedStarterStart,
  getStarterStartsThisWeek,
  getStarterStatsEntries,
  clearStarterStats,
} from '../starterStats';

// Mock localStorage helper
function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

describe('5-Minute Starter Mode & Statistics', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: Storage }).localStorage = createLocalStorageMock() as unknown as Storage;
    clearStarterStats();
  });

  it('records completed starter starts with timestamps', () => {
    expect(getStarterStatsEntries()).toEqual([]);
    recordCompletedStarterStart();
    const entries = getStarterStatsEntries();
    expect(entries).toHaveLength(1);
    expect(typeof entries[0].timestamp).toBe('number');

    recordCompletedStarterStart();
    expect(getStarterStatsEntries()).toHaveLength(2);
  });

  it('counts starts within the last 7 days and ignores older ones', () => {
    const now = new Date('2026-10-31T12:00:00Z');
    const twoDaysAgo = new Date('2026-10-29T12:00:00Z').getTime();
    const sixDaysAgo = new Date('2026-10-25T12:00:00Z').getTime();
    const eightDaysAgo = new Date('2026-10-23T12:00:00Z').getTime();

    const data = [
      { timestamp: twoDaysAgo },
      { timestamp: sixDaysAgo },
      { timestamp: eightDaysAgo },
    ];
    localStorage.setItem(STARTER_STATS_KEY, JSON.stringify(data));

    const count = getStarterStartsThisWeek(now);
    expect(count).toBe(2);
  });

  it('clears all starter stats on request', () => {
    recordCompletedStarterStart();
    recordCompletedStarterStart();
    expect(getStarterStatsEntries().length).toBe(2);

    clearStarterStats();
    expect(getStarterStatsEntries()).toEqual([]);
    expect(localStorage.getItem(STARTER_STATS_KEY)).toBeNull();
  });
});
