import { describe, it, expect, beforeEach } from 'vitest';
import {
  pickGreeting,
  getTimeBucket,
  shouldReroll,
  sanitizeGreetingName,
  getGreetingIcon,
  buildGreetingSubline,
  buildGreetingChips,
  mulberry32,
  getStoredName,
  setStoredName,
  isNameSkipped,
  setNameSkipped,
  clearStoredName,
  getStoredLastShownId,
  setStoredLastShownId,
  isFirstVisit,
  markFirstVisitSeen,
  TIME_HEADLINES,
  WEATHER_HEADLINES,
} from '../greeting';
import { AppFacts } from '../facts';
import { WeatherData } from '../weather';

function createMockStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    length: 0,
  };
}

describe('greeting.ts - Claude-style greeting engine', () => {
  let mockStorage: Storage;
  const baseNow = new Date(2026, 9, 22, 10, 0, 0); // Thursday, 10 AM (morning)

  const mockFacts: AppFacts = {
    currentTime: 'Thursday, Oct 22, 10:00 AM',
    weekday: 'thursday',
    topTask: {
      id: 'task-1',
      title: 'Operating Systems Lab 2',
      course: 'CS 350',
      dueDateTime: new Date(baseNow.getTime() + 6 * 3600 * 1000).toISOString(),
      dueRelative: 'Due in 6h',
      hours: 4,
      remainingEffort: 4,
      reason: 'Urgent priority with 6h remaining',
    },
    today: {
      demandHours: 4,
      capacityHours: 4,
      deficitHours: 0,
      isOnTrack: true,
    },
    tomorrow: {
      demandHours: 4,
      capacityHours: 4,
      isHeavy: false,
    },
    weekly: {
      demandHours: 12,
      capacityHours: 20,
      deficitHours: 0,
    },
    tasksDue48h: [],
    tasksDue7d: [],
    catchUpCount: 0,
    nextUp: [],
    totalActiveCount: 3,
    totalActiveHours: 10,
  };

  beforeEach(() => {
    mockStorage = createMockStorage();
  });

  describe('mulberry32 PRNG', () => {
    it('generates deterministic numbers in [0, 1)', () => {
      const rng1 = mulberry32(12345);
      const rng2 = mulberry32(12345);
      const val1 = rng1();
      const val2 = rng2();
      expect(val1).toBe(val2);
      expect(val1).toBeGreaterThanOrEqual(0);
      expect(val1).toBeLessThan(1);
    });
  });

  describe('Time bucket detection & boundary hours', () => {
    it('correctly maps all hours and critical boundaries (4/5, 8/9, 11/12, 16/17, 20/21)', () => {
      // 00-04 late night
      expect(getTimeBucket(0)).toBe('late_night');
      expect(getTimeBucket(2)).toBe('late_night');
      expect(getTimeBucket(4)).toBe('late_night'); // boundary 4

      // 05-08 early morning
      expect(getTimeBucket(5)).toBe('early_morning'); // boundary 5
      expect(getTimeBucket(7)).toBe('early_morning');
      expect(getTimeBucket(8)).toBe('early_morning'); // boundary 8

      // 09-11 morning
      expect(getTimeBucket(9)).toBe('morning'); // boundary 9
      expect(getTimeBucket(10)).toBe('morning');
      expect(getTimeBucket(11)).toBe('morning'); // boundary 11

      // 12-16 afternoon
      expect(getTimeBucket(12)).toBe('afternoon'); // boundary 12
      expect(getTimeBucket(14)).toBe('afternoon');
      expect(getTimeBucket(16)).toBe('afternoon'); // boundary 16

      // 17-20 evening
      expect(getTimeBucket(17)).toBe('evening'); // boundary 17
      expect(getTimeBucket(19)).toBe('evening');
      expect(getTimeBucket(20)).toBe('evening'); // boundary 20

      // 21-23 night
      expect(getTimeBucket(21)).toBe('night'); // boundary 21
      expect(getTimeBucket(22)).toBe('night');
      expect(getTimeBucket(23)).toBe('night');
    });

    it('has at least 6 headlines in every time bucket', () => {
      const buckets = [
        'late_night',
        'early_morning',
        'morning',
        'afternoon',
        'evening',
        'night',
      ] as const;

      for (const bucket of buckets) {
        expect(TIME_HEADLINES[bucket].length).toBeGreaterThanOrEqual(6);
      }
    });

    it('late night headlines are gentle and never urge all-nighters', () => {
      for (const def of TIME_HEADLINES.late_night) {
        const withName = def.format('Alex');
        const withoutName = def.format();
        expect(withName.toLowerCase()).not.toContain('all-nighter');
        expect(withName.toLowerCase()).not.toContain('push through');
        expect(withoutName.toLowerCase()).not.toContain('grind');
      }
    });
  });

  describe('Headline formatting: name present vs absent', () => {
    it('formats cleanly with name without duplicate punctuation', () => {
      const greeting = pickGreeting({
        now: new Date(2026, 9, 22, 10, 0), // morning
        name: 'Alex',
        facts: mockFacts,
        seed: 42,
      });

      expect(greeting.headline).toContain('Alex');
      expect(greeting.headline).not.toContain(',,');
      expect(greeting.headline).not.toContain('..');
    });

    it('formats cleanly without name and contains no stray commas', () => {
      // Test all headline definitions across all buckets
      const buckets = [
        'late_night',
        'early_morning',
        'morning',
        'afternoon',
        'evening',
        'night',
      ] as const;

      for (const bucket of buckets) {
        for (const def of TIME_HEADLINES[bucket]) {
          const withoutName = def.format();
          expect(withoutName).not.toMatch(/,\s*$/); // No trailing comma
          expect(withoutName).not.toMatch(/,\s*\./); // No comma before period
          expect(withoutName).not.toMatch(/,\s*\?/); // No comma before question mark
          expect(withoutName).not.toContain('{name}');
        }
      }
    });
  });

  describe('Never repeating lastShownId', () => {
    it('never selects the lastShownId when alternatives exist', () => {
      const now = new Date(2026, 9, 22, 10, 0); // morning

      // Get first selection
      const first = pickGreeting({
        now,
        name: 'Alex',
        facts: mockFacts,
        seed: 100,
      });

      // Try multiple different seeds passing the first id as lastShownId
      for (let seed = 1; seed <= 50; seed++) {
        const next = pickGreeting({
          now,
          name: 'Alex',
          facts: mockFacts,
          lastShownId: first.id,
          seed,
        });

        expect(next.id).not.toBe(first.id);
      }
    });
  });

  describe('Weather overlay & half-the-time rule with fixed seed', () => {
    const weatherData: WeatherData = {
      temperatureC: 16,
      weatherCode: 61,
      isDay: true,
      category: 'rain_drizzle',
      cachedAt: Date.now(),
    };

    it('uses a weather headline about half the time when weather exists', () => {
      // Find a seed where rng() < 0.5
      let weatherPicks = 0;
      let nonWeatherPicks = 0;

      for (let seed = 1; seed <= 100; seed++) {
        const g = pickGreeting({
          now: baseNow,
          name: 'Sam',
          weather: weatherData,
          facts: mockFacts,
          seed,
        });

        if (g.category === 'weather') {
          weatherPicks++;
        } else {
          nonWeatherPicks++;
        }
      }

      // Over 100 random seeds, weather should be chosen ~50% of the time (between 35 and 65)
      expect(weatherPicks).toBeGreaterThanOrEqual(35);
      expect(weatherPicks).toBeLessThanOrEqual(65);
      expect(nonWeatherPicks).toBeGreaterThanOrEqual(35);
    });

    it('has at least 3 headlines for each weather category and resolves cleanly', () => {
      const categories: WeatherData['category'][] = [
        'rain_drizzle',
        'thunderstorm',
        'snow',
        'fog',
        'clear_hot',
        'clear_cool',
        'cloudy',
        'clear',
      ];

      for (const cat of categories) {
        const list = WEATHER_HEADLINES[cat];
        expect(list.length).toBeGreaterThanOrEqual(3);

        for (const def of list) {
          const withName = def.format('Jordan');
          const withoutName = def.format();
          expect(withName).toContain('Jordan');
          expect(withoutName).not.toMatch(/,\s*$/); // No trailing comma
          expect(withoutName).not.toMatch(/,\s*\./); // No comma before period
          expect(withoutName).not.toContain('{name}');
        }
      }
    });

    it('maps weather categories to appropriate icons', () => {
      expect(getGreetingIcon('morning', { ...weatherData, category: 'thunderstorm' })).toBe(
        'cloud-lightning'
      );
      expect(getGreetingIcon('morning', { ...weatherData, category: 'snow' })).toBe('snowflake');
      expect(getGreetingIcon('morning', { ...weatherData, category: 'rain_drizzle' })).toBe(
        'cloud-rain'
      );
      expect(getGreetingIcon('morning', { ...weatherData, category: 'fog' })).toBe('cloud-fog');
      expect(getGreetingIcon('morning', { ...weatherData, category: 'cloudy' })).toBe('cloud');
      expect(getGreetingIcon('morning', { ...weatherData, category: 'clear', isDay: true })).toBe(
        'sun'
      );
      expect(getGreetingIcon('night', { ...weatherData, category: 'clear', isDay: false })).toBe(
        'moon'
      );
    });
  });

  describe('Day overlays (Monday, Friday, Sunday evening)', () => {
    it('includes Monday headlines on Mondays', () => {
      const monday = new Date(2026, 9, 19, 10, 0); // Monday morning
      expect(monday.getDay()).toBe(1);

      let foundMondayHeadline = false;
      for (let seed = 1; seed <= 50; seed++) {
        const g = pickGreeting({
          now: monday,
          name: 'Taylor',
          facts: mockFacts,
          seed,
        });
        if (g.id.startsWith('day_monday')) {
          foundMondayHeadline = true;
          expect(g.category).toBe('day');
          expect(g.headline).toContain('week');
          break;
        }
      }
      expect(foundMondayHeadline).toBe(true);
    });

    it('includes Friday headlines on Fridays', () => {
      const friday = new Date(2026, 9, 23, 14, 0); // Friday afternoon
      expect(friday.getDay()).toBe(5);

      let foundFridayHeadline = false;
      for (let seed = 1; seed <= 50; seed++) {
        const g = pickGreeting({
          now: friday,
          name: 'Taylor',
          facts: mockFacts,
          seed,
        });
        if (g.id.startsWith('day_friday')) {
          foundFridayHeadline = true;
          expect(g.category).toBe('day');
          expect(g.headline).toContain('weekend');
          break;
        }
      }
      expect(foundFridayHeadline).toBe(true);
    });

    it('includes Sunday evening headlines on Sunday nights', () => {
      const sundayEvening = new Date(2026, 9, 25, 18, 0); // Sunday 6 PM
      expect(sundayEvening.getDay()).toBe(0);

      let foundSundayHeadline = false;
      for (let seed = 1; seed <= 50; seed++) {
        const g = pickGreeting({
          now: sundayEvening,
          name: 'Taylor',
          facts: mockFacts,
          seed,
        });
        if (g.id.startsWith('day_sunday_eve')) {
          foundSundayHeadline = true;
          expect(g.category).toBe('day');
          expect(g.headline).toContain('Sunday evening');
          break;
        }
      }
      expect(foundSundayHeadline).toBe(true);
    });
  });

  describe('30-minute re-roll rule (shouldReroll)', () => {
    const now = 1700000000000;

    it('returns true on page load (lastHiddenAt is null)', () => {
      expect(shouldReroll(null, now)).toBe(true);
    });

    it('returns false when user was away for less than 30 minutes', () => {
      expect(shouldReroll(now - 1000, now)).toBe(false);
      expect(shouldReroll(now - 15 * 60 * 1000, now)).toBe(false);
      expect(shouldReroll(now - 29 * 60 * 1000, now)).toBe(false);
    });

    it('returns true when user was away for 30 minutes or more', () => {
      expect(shouldReroll(now - 30 * 60 * 1000, now)).toBe(true);
      expect(shouldReroll(now - 45 * 60 * 1000, now)).toBe(true);
      expect(shouldReroll(now - 24 * 3600 * 1000, now)).toBe(true);
    });
  });

  describe('Name sanitizing & length capping', () => {
    it('strips HTML tags completely', () => {
      expect(sanitizeGreetingName('<script>alert("hack")</script>Alex')).toBe('alert("hack")Alex');
      expect(sanitizeGreetingName('<b>Sam</b>')).toBe('Sam');
      expect(sanitizeGreetingName('<img src=x onerror=alert(1)>Jordan')).toBe('Jordan');
    });

    it('strips control characters', () => {
      expect(sanitizeGreetingName('Hello\x00\x1FWorld')).toBe('HelloWorld');
      expect(sanitizeGreetingName('Test\x7FUser')).toBe('TestUser');
    });

    it('trims leading/trailing whitespace and caps at 24 characters', () => {
      expect(sanitizeGreetingName('   Alex   ')).toBe('Alex');
      const longName = 'Alexander Bartholomew The Great';
      const sanitized = sanitizeGreetingName(longName);
      expect(sanitized.length).toBe(24);
      expect(sanitized).toBe('Alexander Bartholomew Th');
    });

    it('handles empty or non-string inputs safely', () => {
      expect(sanitizeGreetingName('')).toBe('');
      expect(sanitizeGreetingName(null as unknown as string)).toBe('');
      expect(sanitizeGreetingName(undefined as unknown as string)).toBe('');
    });
  });

  describe('Storage failure resilience', () => {
    it('manages name and skipped status properly', () => {
      expect(getStoredName(mockStorage)).toBeNull();
      expect(isNameSkipped(mockStorage)).toBe(false);

      setStoredName('Morgan', mockStorage);
      expect(getStoredName(mockStorage)).toBe('Morgan');

      setNameSkipped(true, mockStorage);
      expect(isNameSkipped(mockStorage)).toBe(true);

      clearStoredName(mockStorage);
      expect(getStoredName(mockStorage)).toBeNull();
      expect(isNameSkipped(mockStorage)).toBe(false);
    });

    it('persists and retrieves lastShownId', () => {
      expect(getStoredLastShownId(mockStorage)).toBeNull();
      setStoredLastShownId('morning_1', mockStorage);
      expect(getStoredLastShownId(mockStorage)).toBe('morning_1');
    });

    it('handles throwing storage gracefully without crashing', () => {
      const brokenStorage: Storage = {
        getItem: () => {
          throw new Error('QuotaExceeded');
        },
        setItem: () => {
          throw new Error('SecurityError');
        },
        removeItem: () => {
          throw new Error('AccessDenied');
        },
        clear: () => {},
        key: () => null,
        length: 0,
      };

      expect(() => getStoredName(brokenStorage)).not.toThrow();
      expect(getStoredName(brokenStorage)).toBeNull();
      expect(() => setStoredName('Alex', brokenStorage)).not.toThrow();
      expect(() => isNameSkipped(brokenStorage)).not.toThrow();
      expect(isNameSkipped(brokenStorage)).toBe(false);
      expect(() => setNameSkipped(true, brokenStorage)).not.toThrow();
      expect(() => clearStoredName(brokenStorage)).not.toThrow();
      expect(() => getStoredLastShownId(brokenStorage)).not.toThrow();
      expect(getStoredLastShownId(brokenStorage)).toBeNull();
      expect(() => setStoredLastShownId('id-1', brokenStorage)).not.toThrow();
      expect(() => isFirstVisit(brokenStorage)).not.toThrow();
      expect(() => markFirstVisitSeen(brokenStorage)).not.toThrow();
    });
  });

  describe('Subline & chip generation', () => {
    it('builds supportive subline when user has zero tasks without guilt', () => {
      const emptyFacts: AppFacts = {
        ...mockFacts,
        topTask: null,
        totalActiveCount: 0,
        totalActiveHours: 0,
        catchUpCount: 0,
      };

      const subline = buildGreetingSubline(emptyFacts);
      expect(subline).toContain('all caught up');
      expect(subline.toLowerCase()).not.toContain('fail');
      expect(subline.toLowerCase()).not.toContain('behind');
    });

    it('builds supportive subline highlighting catch-up items when present', () => {
      const overdueFacts: AppFacts = {
        ...mockFacts,
        catchUpCount: 2,
      };

      const subline = buildGreetingSubline(overdueFacts);
      expect(subline).toContain('2 older items that need attention');
    });

    it('builds supportive subline referencing top task and daily hours', () => {
      const subline = buildGreetingSubline(mockFacts);
      expect(subline).toContain('Operating Systems Lab 2');
      expect(subline).toContain('due in 6h');
      expect(subline).toContain('4h planned');
    });

    it('builds forecast-aware subline when today is clear and tomorrow is heavy', () => {
      const tomorrowHeavyFacts: AppFacts = {
        ...mockFacts,
        today: {
          demandHours: 0,
          capacityHours: 4,
          deficitHours: 0,
          isOnTrack: true,
        },
        tomorrow: {
          demandHours: 7,
          capacityHours: 4,
          isHeavy: true,
        },
        catchUpCount: 0,
      };

      const subline = buildGreetingSubline(tomorrowHeavyFacts);
      expect(subline).toBe(
        "Today's clear — but tomorrow is heavy (7h of work, 4h of capacity). Want to start one thing early?"
      );
    });

    it('returns first-time chips for new users or zero tasks', () => {
      const emptyFacts: AppFacts = {
        ...mockFacts,
        topTask: null,
        totalActiveCount: 0,
      };

      const chips = buildGreetingChips(emptyFacts, true);
      expect(chips.map((c) => c.action)).toEqual(['paste', 'add', 'tour']);
    });

    it('returns action chips tailored to top task for returning users', () => {
      const chips = buildGreetingChips(mockFacts, false);
      expect(chips.length).toBeLessThanOrEqual(3);
      expect(chips[0].action).toBe('start_top');
      expect(chips[0].label).toContain('Operating Systems Lab 2');
      expect(chips[1].action).toBe('plan_week');
      expect(chips[2].action).toBe('swamped');
    });
  });
});
