import { describe, it, expect } from 'vitest';
import { generateTriagePlan, TRIAGE_DISCLAIMER } from '../triage';
import { DEFAULT_CAPACITY_SETTINGS } from '../capacity';
import { Task } from '../../types';

describe('Triage Mode Generator', () => {
  const baseDate = new Date(2026, 9, 26, 8, 0, 0); // Monday

  const createTestTasks = (): Task[] => [
    {
      id: 't-urgent',
      title: 'Operating Systems Exam',
      course: 'CS 350',
      dueDateTime: new Date(2026, 9, 27, 10, 0, 0).toISOString(),
      estimatedHours: 6,
      priority: 'urgent',
      category: 'exam',
      completed: false,
      createdAt: baseDate.toISOString(),
      updatedAt: baseDate.toISOString(),
    },
    {
      id: 't-med',
      title: 'Problem Set 4',
      course: 'MATH 220',
      dueDateTime: new Date(2026, 9, 28, 23, 59, 0).toISOString(),
      estimatedHours: 4,
      priority: 'medium',
      category: 'assignment',
      completed: false,
      createdAt: baseDate.toISOString(),
      updatedAt: baseDate.toISOString(),
    },
    {
      id: 't-low',
      title: 'Weekly Discussion Forum',
      course: 'PHIL 101',
      dueDateTime: new Date(2026, 9, 29, 23, 59, 0).toISOString(),
      estimatedHours: 2,
      priority: 'low',
      category: 'reading',
      completed: false,
      createdAt: baseDate.toISOString(),
      updatedAt: baseDate.toISOString(),
    },
  ];

  it('correctly categorizes tasks into Do fully, Do minimum, and Safe to defer', () => {
    const tasks = createTestTasks();
    const plan = generateTriagePlan(tasks, DEFAULT_CAPACITY_SETTINGS, baseDate);

    // Urgent exam goes to Do fully
    expect(plan.doFully.some((item) => item.task.id === 't-urgent')).toBe(true);
    // Medium problem set goes to Do minimum
    expect(plan.doMinimum.some((item) => item.task.id === 't-med')).toBe(true);
    // Low priority discussion goes to Safe to defer
    expect(plan.safeToDefer.some((item) => item.task.id === 't-low')).toBe(true);
  });

  it('provides a concise one-line reason for every categorized task', () => {
    const tasks = createTestTasks();
    const plan = generateTriagePlan(tasks, DEFAULT_CAPACITY_SETTINGS, baseDate);

    const allItems = [...plan.doFully, ...plan.doMinimum, ...plan.safeToDefer];
    for (const item of allItems) {
      expect(typeof item.oneLineReason).toBe('string');
      expect(item.oneLineReason.length).toBeGreaterThan(15);
    }
  });

  it('calculates hours saved by applying partial credit and deferrals', () => {
    const tasks = createTestTasks();
    const plan = generateTriagePlan(tasks, DEFAULT_CAPACITY_SETTINGS, baseDate);

    // Original: 6h + 4h + 2h = 12h
    // Optimized: 6h (full) + 2h (50% min) + 0h (defer) = 8h
    // Hours saved = 4h
    expect(plan.hoursSaved).toBe(4);
    expect(plan.optimizedDemandHours).toBe(8);
  });

  it('includes explicit non-prediction disclaimer grounded in user inputs', () => {
    const tasks = createTestTasks();
    const plan = generateTriagePlan(tasks, DEFAULT_CAPACITY_SETTINGS, baseDate);

    expect(plan.disclaimer).toBe(TRIAGE_DISCLAIMER);
    expect(plan.disclaimer).toContain('own priority labels');
    expect(plan.disclaimer).toContain('not automated academic predictions');
  });
});

