import { describe, it, expect } from 'vitest';
import {
  classifyOfflineQuery,
  groundIntent,
  processAskQuery,
  AskContextSnapshot,
} from '../askService';
import { Task, CapacitySettings } from '../../types';

describe('Grounded Ask Assistant', () => {
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
      id: 'task-lab-1',
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
      id: 'task-pset-2',
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
    {
      id: 'task-reading-3',
      title: 'Philosophy Optional Reading',
      course: 'PHIL 101',
      dueDateTime: new Date(baseNow.getTime() + 72 * 3600 * 1000).toISOString(),
      estimatedHours: 1.5,
      priority: 'low',
      category: 'reading',
      completed: false,
      createdAt: baseNow.toISOString(),
      updatedAt: baseNow.toISOString(),
    },
  ];

  const context: AskContextSnapshot = {
    tasks: sampleTasks,
    capacitySettings: defaultCapacity,
    now: baseNow,
    remainingEffortMap: {},
  };

  describe('Offline Rule-based Intent Classifier', () => {
    it('classifies capacity reduction queries', () => {
      const res = classifyOfflineQuery('I only have 2 hours tonight', context);
      expect(res.intent).toBe('set_today_capacity');
      expect(res.parameters.hours).toBe(2);
    });

    it('classifies ranking explanation queries', () => {
      const res = classifyOfflineQuery('Why is this my top task?', context);
      expect(res.intent).toBe('explain_ranking');
    });

    it('classifies skipping/dropping queries', () => {
      const res = classifyOfflineQuery('What if I skip the reading?', context);
      expect(res.intent).toBe('what_if_skip');
    });

    it('classifies moving/delaying queries', () => {
      const res = classifyOfflineQuery('What if I delay this task?', context);
      expect(res.intent).toBe('what_if_move');
    });

    it('classifies task addition queries', () => {
      const res = classifyOfflineQuery('Add Math 220 homework due tomorrow at 5pm', context);
      expect(res.intent).toBe('add_task');
      expect(res.parameters.course).toBe('MATH 220');
    });

    it('politely flags off-topic essay writing queries', () => {
      const res = classifyOfflineQuery('Write an essay about the Roman Empire', context);
      expect(res.intent).toBe('other');
      expect(res.parameters.isOffTopic).toBe(true);
    });
  });

  describe('Grounded Business Logic Execution', () => {
    it('grounds explain_ranking in real task scores and remaining effort', () => {
      const answer = groundIntent(
        'explain_ranking',
        {},
        '',
        context,
        'rule-based'
      );

      expect(answer.reply).toContain('Operating Systems Lab 2');
      expect(answer.reply).toContain('4h of effort');
      expect(answer.reasoning).toBeTruthy();
    });

    it('grounds set_today_capacity and produces confirmation card', () => {
      const answer = groundIntent(
        'set_today_capacity',
        { hours: 2.5 },
        '',
        context,
        'rule-based'
      );

      expect(answer.reply).toContain('2.5h');
      expect(answer.confirmation).toBeDefined();
      expect(answer.confirmation?.type).toBe('set_capacity');
      expect(answer.confirmation?.payload.hours).toBe(2.5);
    });

    it('grounds what_if_skip and computes exact hours saved', () => {
      const answer = groundIntent(
        'what_if_skip',
        {},
        '',
        context,
        'rule-based'
      );

      // Low priority task is Philosophy Reading (1.5h)
      expect(answer.reply).toContain('Philosophy Optional Reading');
      expect(answer.reply).toContain('1.5 hours');
      expect(answer.confirmation?.type).toBe('drop_task');
      expect(answer.confirmation?.payload.taskId).toBe('task-reading-3');
    });

    it('grounds what_if_move and runs consequence simulation', () => {
      const answer = groundIntent(
        'what_if_move',
        { days: 2 },
        '',
        context,
        'rule-based'
      );

      expect(answer.reply).toBeTruthy();
      expect(answer.confirmation?.type).toBe('reschedule_task');
      expect(answer.confirmation?.payload.taskId).toBe('task-lab-1');
    });

    it('grounds add_task with validated sanitized payload', () => {
      const answer = groundIntent(
        'add_task',
        {
          title: 'Physics Lab Report',
          course: 'PHYS 150',
          estimatedHours: 3,
          priority: 'high',
          category: 'lab',
        },
        '',
        context,
        'rule-based'
      );

      expect(answer.confirmation?.type).toBe('add_task');
      expect(answer.confirmation?.payload.title).toBe('Physics Lab Report');
      expect(answer.confirmation?.payload.course).toBe('PHYS 150');
      expect(answer.confirmation?.payload.estimatedHours).toBe(3);
    });

    it('returns polite redirection for off-topic queries', () => {
      const answer = groundIntent(
        'other',
        { isOffTopic: true },
        '',
        context,
        'rule-based'
      );

      expect(answer.reply).toContain('focused on helping you triage your deadlines');
      expect(answer.confirmation).toBeUndefined();
    });
  });

  describe('processAskQuery fallback behavior', () => {
    it('returns grounded offline answer when fetch fails or is mocked', async () => {
      const answer = await processAskQuery('Why is this my top task?', context);
      expect(answer.reply).toContain('Operating Systems Lab 2');
      expect(answer.source).toBe('rule-based');
    });
  });
});
