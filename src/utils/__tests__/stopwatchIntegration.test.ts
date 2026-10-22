import { describe, it, expect } from 'vitest';
import {
  getTaskLoggedHours,
  getTaskRemainingEffort,
  getRemainingEffortMap,
} from '../stopwatchIntegration';
import { Task, StopwatchSession } from '../../types';

describe('Stopwatch Integration & Real Remaining Effort', () => {
  const sampleTask: Task = {
    id: 'task-101',
    title: 'Operating Systems Lab',
    course: 'CS 350',
    dueDateTime: new Date('2026-10-30T18:00:00Z').toISOString(),
    estimatedHours: 4,
    priority: 'high',
    category: 'lab',
    completed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const sampleSessions: StopwatchSession[] = [
    {
      id: 'session-1',
      taskId: 'task-101',
      durationMs: 3600 * 1000, // 1 hour
      durationFormatted: '01:00:00',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'session-2',
      taskId: 'task-101',
      durationMs: 1800 * 1000, // 0.5 hours (30 min)
      durationFormatted: '00:30:00',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'session-other',
      taskId: 'task-999',
      durationMs: 7200 * 1000, // 2 hours
      durationFormatted: '02:00:00',
      createdAt: new Date().toISOString(),
    },
  ];

  it('correctly aggregates logged hours for a specific task', () => {
    const logged = getTaskLoggedHours('task-101', sampleSessions);
    expect(logged).toBe(1.5);
  });

  it('returns 0 when task has no logged sessions', () => {
    const logged = getTaskLoggedHours('task-nonexistent', sampleSessions);
    expect(logged).toBe(0);
  });

  it('subtracts logged hours from estimated hours to calculate remaining effort', () => {
    // 4h estimated - 1.5h logged = 2.5h remaining
    const remaining = getTaskRemainingEffort(sampleTask, sampleSessions);
    expect(remaining).toBe(2.5);
  });

  it('maintains a minimum 0.25h floor when logged time exceeds estimate on incomplete task', () => {
    const longSessions: StopwatchSession[] = [
      {
        id: 'session-long',
        taskId: 'task-101',
        durationMs: 5 * 3600 * 1000, // 5 hours logged on 4h task
        durationFormatted: '05:00:00',
        createdAt: new Date().toISOString(),
      },
    ];

    const remaining = getTaskRemainingEffort(sampleTask, longSessions);
    expect(remaining).toBe(0.25);
  });

  it('returns 0 remaining effort for completed tasks', () => {
    const completedTask: Task = { ...sampleTask, completed: true };
    const remaining = getTaskRemainingEffort(completedTask, sampleSessions);
    expect(remaining).toBe(0);
  });

  it('generates a complete remaining effort lookup map for tasks', () => {
    const task2: Task = {
      ...sampleTask,
      id: 'task-2',
      estimatedHours: 2,
    };

    const map = getRemainingEffortMap([sampleTask, task2], sampleSessions);
    expect(map['task-101']).toBe(2.5);
    expect(map['task-2']).toBe(2.0);
  });
});
