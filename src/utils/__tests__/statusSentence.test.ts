import { describe, it, expect } from 'vitest';
import { getStatusSentence } from '../statusSentence';
import { Task, CapacitySettings } from '../../types';

describe('Status Sentence Generator', () => {
  const baseTimestamp = new Date(2026, 9, 20, 10, 0, 0); // Tuesday Oct 20, 2026

  const defaultCapacity: CapacitySettings = {
    dailyWorkHours: {
      sun: 4,
      mon: 4,
      tue: 4,
      wed: 4,
      thu: 4,
      fri: 4,
      sat: 4,
    },
    blockedSlots: [],
  };

  it('reports all caught up when no incomplete tasks exist', () => {
    const res = getStatusSentence([], defaultCapacity, baseTimestamp);
    expect(res.text).toContain('caught up');
    expect(res.tone).toBe('good');
  });

  it('prioritizes overdue task notice with recovery action link', () => {
    const tasks: Task[] = [
      {
        id: 't-overdue',
        title: 'Past Essay',
        course: 'ENG 101',
        dueDateTime: new Date(2026, 9, 19, 10, 0, 0).toISOString(),
        estimatedHours: 2,
        priority: 'high',
        category: 'assignment',
        completed: false,
        createdAt: '2026-10-15T00:00:00Z',
        updatedAt: '2026-10-15T00:00:00Z',
      },
    ];

    const res = getStatusSentence(tasks, defaultCapacity, baseTimestamp);
    expect(res.text).toContain('1 past-due assignment');
    expect(res.actionLabel).toBe('See recovery steps');
    expect(res.actionType).toBe('reset');
    expect(res.tone).toBe('attention');
  });

  it('reports hours short today when demand exceeds capacity', () => {
    const tasks: Task[] = [
      {
        id: 't-today',
        title: 'Hefty Lab',
        course: 'CS 350',
        dueDateTime: new Date(2026, 9, 20, 23, 59, 0).toISOString(), // Due today
        estimatedHours: 7, // 7h vs 4h daily capacity = 3h deficit
        priority: 'urgent',
        category: 'lab',
        completed: false,
        createdAt: '2026-10-15T00:00:00Z',
        updatedAt: '2026-10-15T00:00:00Z',
      },
    ];

    const res = getStatusSentence(tasks, defaultCapacity, baseTimestamp);
    expect(res.text).toContain('short today');
    expect(res.actionLabel).toBe('See what to drop');
    expect(res.actionType).toBe('plan');
    expect(res.tone).toBe('attention');
  });

  it('reports on track when workload is balanced within capacity', () => {
    const tasks: Task[] = [
      {
        id: 't-balanced',
        title: 'Short Assignment',
        course: 'MATH 101',
        dueDateTime: new Date(2026, 9, 20, 23, 59, 0).toISOString(),
        estimatedHours: 2, // 2h vs 4h capacity = secure
        priority: 'medium',
        category: 'assignment',
        completed: false,
        createdAt: '2026-10-15T00:00:00Z',
        updatedAt: '2026-10-15T00:00:00Z',
      },
    ];

    const res = getStatusSentence(tasks, defaultCapacity, baseTimestamp);
    expect(res.text).toContain('on track');
    expect(res.tone).toBe('good');
  });
});
