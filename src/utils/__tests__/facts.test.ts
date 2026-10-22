import { describe, it, expect } from 'vitest';
import { buildAppFacts } from '../facts';
import { Task, CapacitySettings } from '../../types';

describe('buildAppFacts', () => {
  const baseNow = new Date('2026-10-22T14:00:00Z');

  const defaultCapacity: CapacitySettings = {
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

  const sampleTasks: Task[] = [
    {
      id: 'task-1',
      title: 'Operating Systems Lab 2',
      course: 'CS 350',
      dueDateTime: new Date(baseNow.getTime() + 6 * 3600 * 1000).toISOString(),
      estimatedHours: 4,
      priority: 'urgent',
      category: 'project',
      completed: false,
      createdAt: baseNow.toISOString(),
      updatedAt: baseNow.toISOString(),
    },
    {
      id: 'task-2',
      title: 'Microeconomics Problem Set 3',
      course: 'ECON 201',
      dueDateTime: new Date(baseNow.getTime() + 24 * 3600 * 1000).toISOString(),
      estimatedHours: 2,
      priority: 'medium',
      category: 'assignment',
      completed: false,
      createdAt: baseNow.toISOString(),
      updatedAt: baseNow.toISOString(),
    },
  ];

  it('builds structured facts with top task, today load, and 48h deadlines', () => {
    const facts = buildAppFacts(sampleTasks, defaultCapacity, baseNow);

    expect(facts.topTask).not.toBeNull();
    expect(facts.topTask?.title).toBe('Operating Systems Lab 2');
    expect(facts.topTask?.course).toBe('CS 350');
    expect(facts.totalActiveCount).toBe(2);
    expect(facts.totalActiveHours).toBe(6);
    expect(facts.tasksDue48h.length).toBe(2);
    expect(facts.catchUpCount).toBe(0);
    expect(facts.weekday).toBe('thursday');
    expect(facts.today.capacityHours).toBe(4);
  });

  it('handles empty task list gracefully', () => {
    const facts = buildAppFacts([], defaultCapacity, baseNow);

    expect(facts.topTask).toBeNull();
    expect(facts.totalActiveCount).toBe(0);
    expect(facts.totalActiveHours).toBe(0);
    expect(facts.tasksDue48h).toEqual([]);
    expect(facts.catchUpCount).toBe(0);
    expect(facts.today.isOnTrack).toBe(true);
  });
});
