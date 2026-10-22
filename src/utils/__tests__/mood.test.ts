import { describe, it, expect } from 'vitest';
import { getWorkloadMood } from '../mood';
import { Task, CapacitySettings } from '../../types';

describe('mood.ts - Workload Mood Calculation', () => {
  const baseNow = new Date('2026-10-22T12:00:00Z');

  // 4h/day weekdays, 5h/day weekends => total 30h/week
  const capacity: CapacitySettings = {
    dailyWorkHours: {
      mon: 4,
      tue: 4,
      wed: 4,
      thu: 4,
      fri: 4,
      sat: 5,
      sun: 5,
    },
    blockedSlots: [],
  };

  const createTask = (id: string, hours: number, dueDaysAhead: number = 2): Task => ({
    id,
    title: `Task ${id}`,
    course: 'TEST 101',
    dueDateTime: new Date(baseNow.getTime() + dueDaysAhead * 24 * 3600 * 1000).toISOString(),
    estimatedHours: hours,
    priority: 'medium',
    category: 'assignment',
    completed: false,
    createdAt: baseNow.toISOString(),
    updatedAt: baseNow.toISOString(),
  });

  it('returns "calm" when there are no tasks', () => {
    expect(getWorkloadMood([], capacity, baseNow)).toBe('calm');
  });

  it('returns "calm" when demand / capacity is below 0.7', () => {
    // 30h capacity * 0.5 = 15h demand (ratio 0.5 < 0.7)
    const tasks = [createTask('t1', 15)];
    expect(getWorkloadMood(tasks, capacity, baseNow)).toBe('calm');
  });

  it('returns "busy" when demand / capacity is between 0.7 and 1.0', () => {
    // 30h capacity * 0.8 = 24h demand (ratio 0.8 in [0.7, 1.0])
    const tasks = [createTask('t1', 24)];
    expect(getWorkloadMood(tasks, capacity, baseNow)).toBe('busy');
  });

  it('returns "busy" at boundary 0.7 exactly', () => {
    // 30h capacity * 0.7 = 21h demand
    const tasks = [createTask('t1', 21)];
    expect(getWorkloadMood(tasks, capacity, baseNow)).toBe('busy');
  });

  it('returns "busy" at boundary 1.0 exactly', () => {
    // 30h capacity * 1.0 = 30h demand
    const tasks = [createTask('t1', 30)];
    expect(getWorkloadMood(tasks, capacity, baseNow)).toBe('busy');
  });

  it('returns "overloaded" when demand / capacity is above 1.0', () => {
    // 30h capacity * 1.15 = 34.5h demand (ratio > 1.0)
    const tasks = [createTask('t1', 35)];
    expect(getWorkloadMood(tasks, capacity, baseNow)).toBe('overloaded');
  });

  it('ignores completed and dropped tasks', () => {
    const tasks: Task[] = [
      createTask('t1', 10),
      { ...createTask('t2', 30), completed: true },
      { ...createTask('t3', 30), dropped: true },
    ];
    // Only 10h active / 30h capacity = 0.33 => calm
    expect(getWorkloadMood(tasks, capacity, baseNow)).toBe('calm');
  });
});
