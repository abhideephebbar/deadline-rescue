import { describe, it, expect, beforeEach } from 'vitest';
import {
  isFirstVisit,
  markFirstVisitSeen,
  setStoredName,
  getStoredName,
  setNameSkipped,
  isNameSkipped,
  sanitizeGreetingName,
  FIRST_VISIT_STORAGE_KEY,
  NAME_STORAGE_KEY,
  NAME_SKIPPED_KEY,
} from '../greeting';
import { clearAllAppData } from '../storageMigration';
import { INTENT_STORAGE_KEY } from '../../components/WelcomeFlow';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
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
};

describe('Welcome Flow & First-Visit Onboarding Gating', () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageMock() as any;
  });

  it('isFirstVisit returns true on a fresh visit with no storage keys', () => {
    expect(isFirstVisit()).toBe(true);
  });

  it('markFirstVisitSeen sets first visit seen key and flips isFirstVisit to false', () => {
    expect(isFirstVisit()).toBe(true);
    markFirstVisitSeen();
    expect(localStorage.getItem(FIRST_VISIT_STORAGE_KEY)).toBe('true');
    expect(isFirstVisit()).toBe(false);
  });

  it('preserves returning user status if first_visit_seen is already true', () => {
    localStorage.setItem(FIRST_VISIT_STORAGE_KEY, 'true');
    expect(isFirstVisit()).toBe(false);
  });

  it('correctly handles name storage and skipping in onboarding', () => {
    // Storing clean name
    const sanitized = sanitizeGreetingName('  Rohan Sharma  ');
    expect(sanitized).toBe('Rohan Sharma');
    setStoredName(sanitized);
    expect(getStoredName()).toBe('Rohan Sharma');
    expect(isNameSkipped()).toBe(false);

    // Skipping name
    setNameSkipped(true);
    expect(isNameSkipped()).toBe(true);
  });

  it('stores selected intent in deadline_rescue_intent key', () => {
    localStorage.setItem(INTENT_STORAGE_KEY, 'deadlines');
    expect(localStorage.getItem(INTENT_STORAGE_KEY)).toBe('deadlines');

    localStorage.setItem(INTENT_STORAGE_KEY, 'exams');
    expect(localStorage.getItem(INTENT_STORAGE_KEY)).toBe('exams');
  });

  it('clearAllAppData wipes onboarding keys so welcome flow replays on next visit', () => {
    markFirstVisitSeen();
    setStoredName('Aarav');
    localStorage.setItem(INTENT_STORAGE_KEY, 'timetable');
    expect(isFirstVisit()).toBe(false);

    clearAllAppData();

    expect(localStorage.getItem(FIRST_VISIT_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(NAME_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(NAME_SKIPPED_KEY)).toBeNull();
    expect(localStorage.getItem(INTENT_STORAGE_KEY)).toBeNull();
    expect(isFirstVisit()).toBe(true);
  });
});
