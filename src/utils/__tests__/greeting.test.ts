import { describe, it, expect, beforeEach } from 'vitest';
import {
  getWelcomeGreeting,
  dismissGreetingToday,
  isGreetingDismissedToday,
  markFirstVisitSeen,
  isFirstVisit,
} from '../greeting';
import { AppFacts } from '../facts';

// Mock in-memory storage for deterministic testing
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

describe('greeting.ts - Welcome Greeting Engine', () => {
  let mockStorage: Storage;
  const baseNow = new Date(2026, 9, 22, 10, 0, 0); // 10 AM local time (morning)

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
    weekly: {
      demandHours: 12,
      capacityHours: 20,
      deficitHours: 0,
    },
    tasksDue48h: [],
    catchUpCount: 0,
    nextUp: [],
    totalActiveCount: 3,
    totalActiveHours: 10,
  };

  beforeEach(() => {
    mockStorage = createMockStorage();
  });

  it('selects first visit greeting on first launch', () => {
    expect(isFirstVisit(mockStorage)).toBe(true);

    const greeting = getWelcomeGreeting(mockFacts, baseNow, mockStorage);
    expect(greeting).not.toBeNull();
    expect(greeting?.type).toBe('first_visit');
    expect(greeting?.greeting).toContain('Welcome to Deadline Rescue');
    expect(greeting?.actionChips.map((c) => c.action)).toEqual(['paste', 'add', 'tour']);
  });

  it('selects returning greeting with concrete facts and top task', () => {
    markFirstVisitSeen(mockStorage);
    expect(isFirstVisit(mockStorage)).toBe(false);

    const greeting = getWelcomeGreeting(mockFacts, baseNow, mockStorage);
    expect(greeting?.type).toBe('returning');
    expect(greeting?.greeting).toBe('Good morning!');
    expect(greeting?.subtext).toContain('Operating Systems Lab 2');
    expect(greeting?.subtext).toContain('due in 6h');
    expect(greeting?.actionChips.some((c) => c.action === 'start_top')).toBe(true);
    expect(greeting?.actionChips.some((c) => c.action === 'plan_week')).toBe(true);
    expect(greeting?.actionChips.some((c) => c.action === 'swamped')).toBe(true);
  });

  it('selects no_tasks greeting when returning user has zero tasks', () => {
    markFirstVisitSeen(mockStorage);

    const emptyFacts: AppFacts = {
      ...mockFacts,
      topTask: null,
      totalActiveCount: 0,
      totalActiveHours: 0,
      catchUpCount: 0,
    };

    const greeting = getWelcomeGreeting(emptyFacts, baseNow, mockStorage);
    expect(greeting?.type).toBe('no_tasks');
    expect(greeting?.subtext).toContain('all caught up');
    expect(greeting?.actionChips.map((c) => c.action)).toEqual(['add', 'paste']);
  });

  it('highlights catchUpCount when user has overdue items', () => {
    markFirstVisitSeen(mockStorage);

    const overdueFacts: AppFacts = {
      ...mockFacts,
      catchUpCount: 2,
    };

    const greeting = getWelcomeGreeting(overdueFacts, baseNow, mockStorage);
    expect(greeting?.subtext).toContain('2 older items that need attention');
  });

  it('returns null on the same day if greeting was dismissed', () => {
    markFirstVisitSeen(mockStorage);

    expect(isGreetingDismissedToday(baseNow, mockStorage)).toBe(false);

    dismissGreetingToday(baseNow, mockStorage);
    expect(isGreetingDismissedToday(baseNow, mockStorage)).toBe(true);

    const greeting = getWelcomeGreeting(mockFacts, baseNow, mockStorage);
    expect(greeting).toBeNull();
  });

  it('shows greeting again the next day after dismissal', () => {
    markFirstVisitSeen(mockStorage);

    dismissGreetingToday(baseNow, mockStorage);
    expect(getWelcomeGreeting(mockFacts, baseNow, mockStorage)).toBeNull();

    // Advance 1 day
    const tomorrow = new Date(baseNow.getTime() + 24 * 3600 * 1000);
    expect(isGreetingDismissedToday(tomorrow, mockStorage)).toBe(false);

    const tomorrowGreeting = getWelcomeGreeting(mockFacts, tomorrow, mockStorage);
    expect(tomorrowGreeting).not.toBeNull();
  });
});
