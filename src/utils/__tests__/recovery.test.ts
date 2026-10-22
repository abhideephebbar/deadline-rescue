import { describe, it, expect } from 'vitest';
import {
  getOverdueTasks,
  generateWeekResetPlan,
  applyWeekReset,
  generateInstructorEmail,
} from '../recovery';
import { Task, CapacitySettings } from '../../types';

describe('Recovery & Week Reset Utility', () => {
  const baseTimestamp = new Date(2026, 9, 20, 10, 0, 0); // Oct 20, 2026 10:00 AM

  const defaultCapacity: CapacitySettings = {
    dailyWorkHours: {
      sun: 5,
      mon: 4,
      tue: 4,
      wed: 4,
      thu: 4,
      fri: 4,
      sat: 5,
    },
    blockedSlots: [],
  };

  const sampleTasks: Task[] = [
    {
      id: 'task-overdue-1',
      title: 'Operating Systems Lab 2',
      course: 'CS 350',
      dueDateTime: new Date(2026, 9, 19, 23, 59, 0).toISOString(), // Yesterday (Overdue)
      estimatedHours: 3,
      priority: 'urgent',
      category: 'project',
      completed: false,
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    },
    {
      id: 'task-overdue-2',
      title: 'Microeconomics Essay Draft',
      course: 'ECON 201',
      dueDateTime: new Date(2026, 9, 20, 8, 0, 0).toISOString(), // 2 hours ago (Overdue)
      estimatedHours: 2,
      priority: 'high',
      category: 'assignment',
      completed: false,
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    },
    {
      id: 'task-upcoming',
      title: 'Genetics Quiz',
      course: 'BIO 112',
      dueDateTime: new Date(2026, 9, 22, 14, 0, 0).toISOString(), // In 2 days
      estimatedHours: 1,
      priority: 'medium',
      category: 'quiz',
      completed: false,
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    },
    {
      id: 'task-already-completed',
      title: 'Linear Algebra Homework',
      course: 'MATH 220',
      dueDateTime: new Date(2026, 9, 19, 12, 0, 0).toISOString(),
      estimatedHours: 2,
      priority: 'low',
      category: 'assignment',
      completed: true,
      createdAt: '2026-10-15T00:00:00Z',
      updatedAt: '2026-10-15T00:00:00Z',
    },
  ];

  it('correctly filters overdue uncompleted tasks', () => {
    const overdue = getOverdueTasks(sampleTasks, baseTimestamp);
    expect(overdue.length).toBe(2);
    expect(overdue.map((t) => t.id)).toEqual(['task-overdue-1', 'task-overdue-2']);
  });

  it('generates a rescheduling reset plan moving overdue tasks forward', () => {
    const plan = generateWeekResetPlan(sampleTasks, defaultCapacity, baseTimestamp, 'reschedule');
    expect(plan.overdueCount).toBe(2);
    expect(plan.totalOverdueHours).toBe(5);
    expect(plan.changes.length).toBe(2);

    plan.changes.forEach((change) => {
      expect(change.action).toBe('rescheduled');
      expect(change.proposedDueDateTime).toBeDefined();
      // Must be scheduled in the future relative to baseTimestamp
      const proposedTime = new Date(change.proposedDueDateTime!).getTime();
      expect(proposedTime).toBeGreaterThan(baseTimestamp.getTime());
    });
  });

  it('applies rescheduling cleanly to task list', () => {
    const plan = generateWeekResetPlan(sampleTasks, defaultCapacity, baseTimestamp, 'reschedule');
    const updated = applyWeekReset(sampleTasks, plan, baseTimestamp);

    const task1 = updated.find((t) => t.id === 'task-overdue-1')!;
    const task2 = updated.find((t) => t.id === 'task-overdue-2')!;
    const upcoming = updated.find((t) => t.id === 'task-upcoming')!;

    expect(new Date(task1.dueDateTime).getTime()).toBeGreaterThan(baseTimestamp.getTime());
    expect(new Date(task2.dueDateTime).getTime()).toBeGreaterThan(baseTimestamp.getTime());
    expect(task1.notes).toContain('Rescheduled during Clean Slate Reset');
    expect(upcoming.dueDateTime).toBe(sampleTasks[2].dueDateTime); // Untouched
  });

  it('applies drop/forgive strategy marking tasks completed and archiving them', () => {
    const plan = generateWeekResetPlan(sampleTasks, defaultCapacity, baseTimestamp, 'drop');
    const updated = applyWeekReset(sampleTasks, plan, baseTimestamp);

    const task1 = updated.find((t) => t.id === 'task-overdue-1')!;
    expect(task1.completed).toBe(true);
    expect(task1.notes).toContain('Archived during Clean Slate Reset');
  });

  it('applies partial submission strategy', () => {
    const plan = generateWeekResetPlan(sampleTasks, defaultCapacity, baseTimestamp, 'submit_partial');
    const updated = applyWeekReset(sampleTasks, plan, baseTimestamp);

    const task1 = updated.find((t) => t.id === 'task-overdue-1')!;
    expect(task1.completed).toBe(true);
    expect(task1.notes).toContain('Submitted partial work during Clean Slate Reset');
  });

  it('handles empty overdue tasks gracefully', () => {
    const noOverdueTasks = sampleTasks.filter((t) => t.id === 'task-upcoming');
    const plan = generateWeekResetPlan(noOverdueTasks, defaultCapacity, baseTimestamp, 'reschedule');

    expect(plan.overdueCount).toBe(0);
    expect(plan.changes.length).toBe(0);
    expect(plan.previewSummary).toContain('No overdue tasks');
  });

  it('generates polite, supportive instructor email templates', () => {
    const email = generateInstructorEmail(sampleTasks[0], 'extension', 'Alex');
    expect(email.subject).toContain('[CS 350]');
    expect(email.subject).toContain('Extension Request');
    expect(email.body).toContain('Operating Systems Lab 2');
    expect(email.body).toContain('Alex');
    expect(email.body).not.toContain('penalty');
    expect(email.body).not.toContain('failure');
  });
});
