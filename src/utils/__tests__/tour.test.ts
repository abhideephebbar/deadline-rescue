import { describe, it, expect, beforeEach } from 'vitest';
import {
  TOUR_STEPS,
  isTourSeen,
  markTourSeen,
  resetTourSeen,
  generateTourDemoTasks,
  TOUR_SEEN_KEY,
} from '../tour';
import { TASKS_STORAGE_KEY } from '../storageMigration';
import { Task } from '../../types';

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

describe('Product Tour Engine & State Logic', () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageMock() as any;
  });

  describe('TOUR_STEPS structure', () => {
    it('has at most 5 steps per product guidelines', () => {
      expect(TOUR_STEPS.length).toBeLessThanOrEqual(5);
      expect(TOUR_STEPS.length).toBe(5);
    });

    it('defines required metadata for every tour step', () => {
      TOUR_STEPS.forEach((step) => {
        expect(step.id).toBeTruthy();
        expect(step.targetId).toBeTruthy();
        expect(step.title.trim().length).toBeGreaterThan(0);
        expect(step.description.trim().length).toBeGreaterThan(0);
      });
    });

    it('covers all five core touchpoints in sequence', () => {
      const stepIds = TOUR_STEPS.map((s) => s.id);
      expect(stepIds).toEqual([
        'add-task',
        'now-card',
        'forecast',
        'ask-button',
        'menu-button',
      ]);
    });
  });

  describe('Tour Seen Persistence', () => {
    it('returns false initially and true once markTourSeen() is called', () => {
      expect(isTourSeen()).toBe(false);
      markTourSeen();
      expect(isTourSeen()).toBe(true);
      expect(localStorage.getItem(TOUR_SEEN_KEY)).toBe('true');
    });

    it('can be reset cleanly via resetTourSeen()', () => {
      markTourSeen();
      expect(isTourSeen()).toBe(true);
      resetTourSeen();
      expect(isTourSeen()).toBe(false);
    });
  });

  describe('In-Memory Demo Dataset Safety', () => {
    it('generates a valid set of realistic sample tasks without writing to localStorage', () => {
      const demoTasks = generateTourDemoTasks();
      expect(demoTasks.length).toBeGreaterThanOrEqual(3);

      // Verify task fields
      demoTasks.forEach((t) => {
        expect(t.title).toBeTruthy();
        expect(t.course).toBeTruthy();
        expect(new Date(t.dueDateTime).getTime()).not.toBeNaN();
        expect(t.estimatedHours).toBeGreaterThan(0);
        expect(['urgent', 'high', 'medium', 'low']).toContain(t.priority);
      });

      // Crucial requirement: generateTourDemoTasks must NEVER touch localStorage
      expect(localStorage.getItem(TASKS_STORAGE_KEY)).toBeNull();
    });

    it('guarantees user real tasks are preserved and never overwritten by tour mode', () => {
      const realUserTasks: Task[] = [
        {
          id: 'real-user-task-1',
          title: 'Real Machine Learning Project',
          course: 'CS 229',
          dueDateTime: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
          estimatedHours: 8,
          priority: 'urgent',
          category: 'project',
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      // Save real user tasks to storage
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(realUserTasks));

      // Simulate starting tour mode
      const tourTasks = generateTourDemoTasks();
      expect(tourTasks).not.toEqual(realUserTasks);

      // Verify localStorage still contains strictly the user's real tasks
      const stored = localStorage.getItem(TASKS_STORAGE_KEY);
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].id).toBe('real-user-task-1');
      expect(parsed[0].title).toBe('Real Machine Learning Project');
    });
  });
});

