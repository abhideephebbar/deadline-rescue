import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateAttendanceStats,
  clampAttendance,
  sortSubjectsByRisk,
  getStoredAttendance,
  saveStoredAttendance,
  clearStoredAttendance,
  ATTENDANCE_STORAGE_KEY,
} from '../attendanceMath';
import { SubjectAttendance } from '../../types';

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

describe('Attendance Guard Math & Logic', () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageMock() as any;
  });

  describe('Percentage Calculation & Rounding Down', () => {
    it('conservative rounding down: 74.6% displays 74% (never inflates safety)', () => {
      // 97 attended out of 130 held = 74.615%
      const subject: SubjectAttendance = {
        id: 'sub-1',
        name: 'Operating Systems',
        thresholdPct: 75,
        classesHeld: 130,
        classesAttended: 97,
      };

      const stats = calculateAttendanceStats(subject);
      expect(stats.currentPct).toBe(74);
      expect(stats.formattedPct).toBe('74%');
      expect(stats.isBelowThreshold).toBe(true);
      expect(stats.status).toBe('danger');
    });

    it('returns "—" and safe status when classes held is 0', () => {
      const subject: SubjectAttendance = {
        id: 'sub-0',
        name: 'New Semester Course',
        thresholdPct: 75,
        classesHeld: 0,
        classesAttended: 0,
      };

      const stats = calculateAttendanceStats(subject);
      expect(stats.currentPct).toBeNull();
      expect(stats.formattedPct).toBe('—');
      expect(stats.summaryText).toBe('safe for now');
      expect(stats.isBelowThreshold).toBe(false);
    });
  });

  describe('Skip Headroom & Recovery Calculations', () => {
    it('calculates canMiss correctly when safely above 75% threshold', () => {
      // 20 attended out of 24 held at 75% -> floor(20 / 0.75 - 24) = floor(26.66 - 24) = 2
      const subject: SubjectAttendance = {
        id: 'sub-safe',
        name: 'Database Management',
        thresholdPct: 75,
        classesHeld: 24,
        classesAttended: 20,
      };

      const stats = calculateAttendanceStats(subject);
      expect(stats.canMiss).toBe(2);
      expect(stats.needToAttend).toBe(0);
      expect(stats.summaryText).toBe('can skip 2');
      expect(stats.status).toBe('safe');
    });

    it('handles exact boundary threshold: 18/24 at 75% -> canMiss 0, safe for now', () => {
      // 18 / 24 = exactly 75%. If 1 missed, 18/25 = 72% < 75%.
      const subject: SubjectAttendance = {
        id: 'sub-edge',
        name: 'Data Structures',
        thresholdPct: 75,
        classesHeld: 24,
        classesAttended: 18,
      };

      const stats = calculateAttendanceStats(subject);
      expect(stats.currentPct).toBe(75);
      expect(stats.canMiss).toBe(0);
      expect(stats.needToAttend).toBe(0);
      expect(stats.summaryText).toBe('safe for now');
      expect(stats.status).toBe('warning');
    });

    it('calculates needToAttend when below 75%: 17/24 -> needToAttend 4', () => {
      // ceil((0.75*24 - 17) / (1 - 0.75)) = ceil((18 - 17) / 0.25) = 4
      const subject: SubjectAttendance = {
        id: 'sub-below',
        name: 'Algorithms',
        thresholdPct: 75,
        classesHeld: 24,
        classesAttended: 17,
      };

      const stats = calculateAttendanceStats(subject);
      expect(stats.currentPct).toBe(70);
      expect(stats.canMiss).toBe(0);
      expect(stats.needToAttend).toBe(4);
      expect(stats.summaryText).toBe('attend next 4 to be safe');
      expect(stats.isBelowThreshold).toBe(true);
      expect(stats.status).toBe('danger');
    });

    it('supports 85% VTU threshold quick-pick', () => {
      // 22 attended of 24 held at 85%
      // 22 / 24 = 91.6% -> 91%
      // canMiss: floor(22 / 0.85 - 24) = floor(25.88 - 24) = 1
      const subject: SubjectAttendance = {
        id: 'vtu-sub',
        name: 'Microcontrollers',
        thresholdPct: 85,
        classesHeld: 24,
        classesAttended: 22,
      };

      const stats = calculateAttendanceStats(subject);
      expect(stats.currentPct).toBe(91);
      expect(stats.canMiss).toBe(1);
      expect(stats.summaryText).toBe('can skip 1');
    });
  });

  describe('Classes Left and Honest Unrecoverable Copy', () => {
    it('detects mathematically unrecoverable state when classesLeft is limited', () => {
      // 10 attended out of 30 held, 10 classes left.
      // Max possible: (10 + 10) / (30 + 10) = 20 / 40 = 50% < 75%
      const subject: SubjectAttendance = {
        id: 'lost-cause',
        name: 'Engineering Physics',
        thresholdPct: 75,
        classesHeld: 30,
        classesAttended: 10,
        classesLeft: 10,
      };

      const stats = calculateAttendanceStats(subject);
      expect(stats.unrecoverable).toBe(true);
      expect(stats.maxPossiblePct).toBe(50);
      expect(stats.status).toBe('unrecoverable');
      expect(stats.honestNotice).toContain('Even attending every remaining class lands you at 50%');
      expect(stats.honestNotice).toContain('Worth talking to your faculty early');
    });

    it('does not flag unrecoverable if remaining classes can push above threshold', () => {
      // 15 attended out of 25 held (60%). 20 classes left.
      // Max possible: (15 + 20) / (25 + 20) = 35 / 45 = 77% >= 75%
      const subject: SubjectAttendance = {
        id: 'salvageable',
        name: 'Discrete Math',
        thresholdPct: 75,
        classesHeld: 25,
        classesAttended: 15,
        classesLeft: 20,
      };

      const stats = calculateAttendanceStats(subject);
      expect(stats.unrecoverable).toBe(false);
      expect(stats.isBelowThreshold).toBe(true);
      expect(stats.status).toBe('danger');
    });
  });

  describe('Input Clamping & Validation', () => {
    it('clamps attended between 0 and held', () => {
      expect(clampAttendance(20, 25)).toEqual({ held: 20, attended: 20, classesLeft: undefined });
      expect(clampAttendance(-5, -2)).toEqual({ held: 0, attended: 0, classesLeft: undefined });
      expect(clampAttendance(30, 15, -3)).toEqual({ held: 30, attended: 15, classesLeft: 0 });
    });
  });

  describe('Risk Ordering', () => {
    it('orders below-threshold subjects first, then fewest can-miss', () => {
      const subjects: SubjectAttendance[] = [
        { id: '1', name: 'Safe High Headroom', thresholdPct: 75, classesHeld: 20, classesAttended: 20 }, // canMiss 6
        { id: '2', name: 'Below Threshold Badly', thresholdPct: 75, classesHeld: 20, classesAttended: 12 }, // 60%, need 12
        { id: '3', name: 'Safe Low Headroom', thresholdPct: 75, classesHeld: 20, classesAttended: 16 }, // canMiss 1
        { id: '4', name: 'Below Threshold Slightly', thresholdPct: 75, classesHeld: 20, classesAttended: 14 }, // 70%, need 4
      ];

      const sorted = sortSubjectsByRisk(subjects);
      expect(sorted.map((s) => s.id)).toEqual(['2', '4', '3', '1']);
    });
  });

  describe('Persistence & Clear All Data', () => {
    it('saves, reads, and clears attendance records in localStorage', () => {
      const subs: SubjectAttendance[] = [
        { id: 's1', name: 'DBMS', thresholdPct: 75, classesHeld: 20, classesAttended: 18 },
      ];
      saveStoredAttendance(subs);
      expect(getStoredAttendance()).toHaveLength(1);
      expect(getStoredAttendance()[0].name).toBe('DBMS');

      clearStoredAttendance();
      expect(getStoredAttendance()).toHaveLength(0);
      expect(localStorage.getItem(ATTENDANCE_STORAGE_KEY)).toBeNull();
    });
  });
});
