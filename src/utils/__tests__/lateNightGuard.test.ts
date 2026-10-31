import { describe, it, expect, beforeEach } from 'vitest';
import {
  isLateNight,
  getCalendarNightKey,
  hasShownLateNightPromptTonight,
  markLateNightPromptShown,
  clearLateNightPromptDate,
  getWindDownTime,
  setWindDownTime,
  DEFAULT_WIND_DOWN_TIME,
  WIND_DOWN_KEY,
  LATE_NIGHT_PROMPT_DATE_KEY,
} from '../windDown';
import { clearAllAppData } from '../storageMigration';

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

describe('Phase 7: Late-Night Honesty Guard & Sleep Protection', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: Storage }).localStorage = createLocalStorageMock() as unknown as Storage;
    clearLateNightPromptDate();
  });

  describe('isLateNight calculation', () => {
    it('correctly detects late night with default 23:30 wind-down', () => {
      // 22:00 -> false
      const d22 = new Date(2026, 9, 31, 22, 0, 0);
      expect(isLateNight(d22, '23:30')).toBe(false);

      // 23:29 -> false
      const d2329 = new Date(2026, 9, 31, 23, 29, 0);
      expect(isLateNight(d2329, '23:30')).toBe(false);

      // 23:30 -> true
      const d2330 = new Date(2026, 9, 31, 23, 30, 0);
      expect(isLateNight(d2330, '23:30')).toBe(true);

      // 23:59 -> true
      const d2359 = new Date(2026, 9, 31, 23, 59, 0);
      expect(isLateNight(d2359, '23:30')).toBe(true);

      // 00:00 midnight -> true
      const d00 = new Date(2026, 10, 1, 0, 0, 0);
      expect(isLateNight(d00, '23:30')).toBe(true);

      // 02:30 -> true
      const d0230 = new Date(2026, 10, 1, 2, 30, 0);
      expect(isLateNight(d0230, '23:30')).toBe(true);

      // 04:59 -> true
      const d0459 = new Date(2026, 10, 1, 4, 59, 0);
      expect(isLateNight(d0459, '23:30')).toBe(true);

      // 05:00 morning cutoff -> false
      const d0500 = new Date(2026, 10, 1, 5, 0, 0);
      expect(isLateNight(d0500, '23:30')).toBe(false);

      // 14:00 daytime -> false
      const d1400 = new Date(2026, 10, 1, 14, 0, 0);
      expect(isLateNight(d1400, '23:30')).toBe(false);
    });

    it('handles post-midnight wind-down (e.g. 01:00 AM)', () => {
      // 23:45 -> false
      const d2345 = new Date(2026, 9, 31, 23, 45, 0);
      expect(isLateNight(d2345, '01:00')).toBe(false);

      // 00:30 -> false
      const d0030 = new Date(2026, 10, 1, 0, 30, 0);
      expect(isLateNight(d0030, '01:00')).toBe(false);

      // 01:00 -> true
      const d0100 = new Date(2026, 10, 1, 1, 0, 0);
      expect(isLateNight(d0100, '01:00')).toBe(true);

      // 03:00 -> true
      const d0300 = new Date(2026, 10, 1, 3, 0, 0);
      expect(isLateNight(d0300, '01:00')).toBe(true);

      // 05:00 -> false
      const d0500 = new Date(2026, 10, 1, 5, 0, 0);
      expect(isLateNight(d0500, '01:00')).toBe(false);
    });

    it('handles earlier evening wind-down (e.g. 21:00 / 9:00 PM)', () => {
      const d2045 = new Date(2026, 9, 31, 20, 45, 0);
      expect(isLateNight(d2045, '21:00')).toBe(false);

      const d2100 = new Date(2026, 9, 31, 21, 0, 0);
      expect(isLateNight(d2100, '21:00')).toBe(true);

      const d0200 = new Date(2026, 10, 1, 2, 0, 0);
      expect(isLateNight(d0200, '21:00')).toBe(true);
    });
  });

  describe('Calendar night grouping and once-per-night prompting', () => {
    it('groups post-midnight hours into preceding calendar evening', () => {
      const evening = new Date(2026, 9, 31, 23, 45, 0);
      const pastMidnight = new Date(2026, 10, 1, 2, 15, 0);
      const nextMorning = new Date(2026, 10, 1, 9, 0, 0);

      expect(getCalendarNightKey(evening)).toBe('2026-10-31');
      expect(getCalendarNightKey(pastMidnight)).toBe('2026-10-31');
      expect(getCalendarNightKey(nextMorning)).toBe('2026-11-01');
    });

    it('prompts only once per calendar night', () => {
      const evening = new Date(2026, 9, 31, 23, 45, 0);
      const pastMidnight = new Date(2026, 10, 1, 2, 15, 0);
      const nextNight = new Date(2026, 10, 1, 23, 45, 0);

      expect(hasShownLateNightPromptTonight(evening)).toBe(false);

      markLateNightPromptShown(evening);

      expect(hasShownLateNightPromptTonight(evening)).toBe(true);
      // Same late-night cycle at 2:15 AM
      expect(hasShownLateNightPromptTonight(pastMidnight)).toBe(true);

      // Next calendar evening is ready for a new prompt
      expect(hasShownLateNightPromptTonight(nextNight)).toBe(false);
    });
  });

  describe('Settings persistence and data wipe', () => {
    it('persists and retrieves wind-down preference', () => {
      expect(getWindDownTime()).toBe(DEFAULT_WIND_DOWN_TIME);
      setWindDownTime('22:00');
      expect(getWindDownTime()).toBe('22:00');
      expect(localStorage.getItem(WIND_DOWN_KEY)).toBe('22:00');
    });

    it('clearAllAppData wipes wind-down and late-night prompt date keys', () => {
      setWindDownTime('22:00');
      markLateNightPromptShown();
      expect(localStorage.getItem(WIND_DOWN_KEY)).toBe('22:00');
      expect(localStorage.getItem(LATE_NIGHT_PROMPT_DATE_KEY)).not.toBeNull();

      clearAllAppData();

      expect(localStorage.getItem(WIND_DOWN_KEY)).toBeNull();
      expect(localStorage.getItem(LATE_NIGHT_PROMPT_DATE_KEY)).toBeNull();
    });
  });
});
