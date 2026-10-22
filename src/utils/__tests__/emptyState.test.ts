import { describe, it, expect, beforeEach } from 'vitest';
import { isSampleTaskSet, isSampleBannerDismissed, dismissSampleBanner, SAMPLE_BANNER_DISMISSED_KEY } from '../sampleDetection';
import { generateSampleTasks } from '../../data/sampleTasks';
import { migrateStorage, TASKS_STORAGE_KEY, LEGACY_TASKS_KEY, STORAGE_VERSION_KEY } from '../storageMigration';
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

describe('Empty State & Sample Task Detection', () => {
  beforeEach(() => {
    globalThis.localStorage = createLocalStorageMock() as any;
  });

  describe('isSampleTaskSet', () => {
    it('returns true for freshly generated sample tasks', () => {
      const sampleTasks = generateSampleTasks();
      expect(isSampleTaskSet(sampleTasks)).toBe(true);
    });

    it('returns false for empty task array', () => {
      expect(isSampleTaskSet([])).toBe(false);
    });

    it('returns false for user-created custom tasks', () => {
      const userTasks: Task[] = [
        {
          id: 'user-task-1',
          title: 'My Custom History Paper',
          course: 'HIST 101',
          dueDateTime: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
          estimatedHours: 3,
          priority: 'high',
          category: 'assignment',
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'user-task-2',
          title: 'Chemistry Lab Report 3',
          course: 'CHEM 102',
          dueDateTime: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
          estimatedHours: 2,
          priority: 'medium',
          category: 'lab',
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      expect(isSampleTaskSet(userTasks)).toBe(false);
    });

    it('returns false when user tasks are mixed with sample tasks', () => {
      const sampleTasks = generateSampleTasks().slice(0, 3);
      const mixedTasks: Task[] = [
        ...sampleTasks,
        {
          id: 'user-task-mixed',
          title: 'Real Biology Quiz',
          course: 'BIO 100',
          dueDateTime: new Date(Date.now() + 12 * 3600 * 1000).toISOString(),
          estimatedHours: 1,
          priority: 'urgent',
          category: 'quiz',
          completed: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      // Mixed set is not purely sample tasks
      expect(isSampleTaskSet(mixedTasks)).toBe(false);
    });
  });

  describe('dismissSampleBanner', () => {
    it('correctly tracks and persists dismissal in localStorage', () => {
      expect(isSampleBannerDismissed()).toBe(false);
      dismissSampleBanner();
      expect(isSampleBannerDismissed()).toBe(true);
      expect(localStorage.getItem(SAMPLE_BANNER_DISMISSED_KEY)).toBe('true');
    });
  });

  describe('Storage Migration with Custom and Sample Tasks', () => {
    it('migrates legacy v1 tasks into v2 format without data loss', () => {
      const legacyTasks = [
        {
          id: 'legacy-1',
          title: 'Legacy Chem Lab',
          course: 'CHEM 101',
          dueDateTime: '2026-10-25T18:00:00.000Z',
          estimatedHours: 2.5,
          priority: 'urgent',
          category: 'lab',
          completed: false,
        },
      ];
      localStorage.setItem(LEGACY_TASKS_KEY, JSON.stringify(legacyTasks));
      localStorage.setItem(STORAGE_VERSION_KEY, '1');

      migrateStorage();

      const v2Data = localStorage.getItem(TASKS_STORAGE_KEY);
      expect(v2Data).not.toBeNull();
      const parsed = JSON.parse(v2Data!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].title).toBe('Legacy Chem Lab');
      expect(parsed[0].priority).toBe('urgent');
      expect(localStorage.getItem(STORAGE_VERSION_KEY)).toBe('2');
    });
  });
});

