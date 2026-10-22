import { describe, it, expect } from 'vitest';
import { calculateRisk, calculateTaskScore, getSmartRecommendations, MIN_HORIZON_HOURS } from '../ranking';
import { Task } from '../../types';

describe('Ranking and Scoring Engine', () => {
  const baseTimestamp = new Date('2026-10-22T12:00:00Z');

  const createSampleTask = (overrides: Partial<Task> = {}): Task => ({
    id: 'test-task-1',
    title: 'Test Assignment',
    course: 'CS 101',
    dueDateTime: new Date(baseTimestamp.getTime() + 10 * 3600 * 1000).toISOString(), // due in 10h
    estimatedHours: 2,
    priority: 'medium',
    category: 'assignment',
    completed: false,
    createdAt: baseTimestamp.toISOString(),
    updatedAt: baseTimestamp.toISOString(),
    ...overrides,
  });

  describe('calculateRisk continuous formula', () => {
    it('guarantees non-deficit tasks have risk < 1.0', () => {
      // 2h effort, 10h remaining -> buffer = 8h
      const risk1 = calculateRisk(2, 10);
      expect(risk1).toBe(0.2);
      expect(risk1).toBeLessThan(1.0);

      // 0.3h effort, 0.8h remaining (< MIN_HORIZON_HOURS)
      const risk2 = calculateRisk(0.3, 0.8);
      expect(risk2).toBeLessThan(1.0);
    });

    it('guarantees deficit tasks have risk >= 1.0', () => {
      // 5h effort, 2h remaining -> deficit of 3h
      const risk1 = calculateRisk(5, 2);
      expect(risk1).toBe(2.5);
      expect(risk1).toBeGreaterThanOrEqual(1.0);

      // 2h effort, 0.5h remaining
      const risk2 = calculateRisk(2, 0.5);
      expect(risk2).toBe(2.5);
      expect(risk2).toBeGreaterThanOrEqual(1.0);

      // Exact boundary: effort == remaining
      const risk3 = calculateRisk(2, 2);
      expect(risk3).toBe(1.0);
    });

    it('is strictly continuous at hoursRemaining = MIN_HORIZON_HOURS', () => {
      const effort = 3;
      const atHorizon = calculateRisk(effort, MIN_HORIZON_HOURS);
      const justAbove = calculateRisk(effort, MIN_HORIZON_HOURS + 0.0001);
      const justBelow = calculateRisk(effort, MIN_HORIZON_HOURS - 0.0001);

      expect(Math.abs(justAbove - atHorizon)).toBeLessThan(0.01);
      expect(Math.abs(justBelow - atHorizon)).toBeLessThan(0.01);
    });

    it('handles overdue tasks continuously and caps overdue risk at 1.5x deadline risk', () => {
      const effort = 2;
      // Due right now (hoursRemaining = 0)
      const riskDueNow = calculateRisk(effort, 0);
      expect(riskDueNow).toBe(3.0);

      // Overdue by 1 hour (hoursRemaining = -1)
      const riskOverdue1 = calculateRisk(effort, -1);
      expect(riskOverdue1).toBe(4.0);

      // Overdue by 2 hours (hoursRemaining = -2) -> capped at 1.5 * 3.0 = 4.5
      const riskOverdue2 = calculateRisk(effort, -2);
      expect(riskOverdue2).toBe(4.5);

      // Overdue by 10 hours -> still capped at 4.5
      const riskOverdue10 = calculateRisk(effort, -10);
      expect(riskOverdue10).toBe(4.5);

      expect(riskOverdue2).toBeGreaterThanOrEqual(riskOverdue1);
      expect(riskOverdue1).toBeGreaterThan(riskDueNow);
    });
  });

  describe('Phase 0 Invariants', () => {
    it('invariant: a closer deadline never lowers score', () => {
      const taskDueIn8h = createSampleTask({
        dueDateTime: new Date(baseTimestamp.getTime() + 8 * 3600 * 1000).toISOString(),
      });
      const taskDueIn4h = createSampleTask({
        dueDateTime: new Date(baseTimestamp.getTime() + 4 * 3600 * 1000).toISOString(),
      });

      const score8h = calculateTaskScore(taskDueIn8h, baseTimestamp).score;
      const score4h = calculateTaskScore(taskDueIn4h, baseTimestamp).score;

      expect(score4h).toBeGreaterThan(score8h);
    });

    it('invariant: higher priority never lowers score', () => {
      const priorities: Array<Task['priority']> = ['low', 'medium', 'high', 'urgent'];
      const scores = priorities.map((p) => {
        const task = createSampleTask({ priority: p });
        return calculateTaskScore(task, baseTimestamp).score;
      });

      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i - 1]);
      }
    });

    it('invariant: larger remaining effort never lowers score', () => {
      const taskSmallEffort = createSampleTask({ estimatedHours: 1 });
      const taskLargeEffort = createSampleTask({ estimatedHours: 4 });

      const scoreSmall = calculateTaskScore(taskSmallEffort, baseTimestamp).score;
      const scoreLarge = calculateTaskScore(taskLargeEffort, baseTimestamp).score;

      expect(scoreLarge).toBeGreaterThan(scoreSmall);
    });

    it('invariant: smaller buffer never lowers score', () => {
      // Buffer = 2h (due in 5h, effort 3h)
      const taskTightBuffer = createSampleTask({
        dueDateTime: new Date(baseTimestamp.getTime() + 5 * 3600 * 1000).toISOString(),
        estimatedHours: 3,
      });
      // Buffer = 7h (due in 10h, effort 3h)
      const taskComfortableBuffer = createSampleTask({
        dueDateTime: new Date(baseTimestamp.getTime() + 10 * 3600 * 1000).toISOString(),
        estimatedHours: 3,
      });

      const scoreTight = calculateTaskScore(taskTightBuffer, baseTimestamp).score;
      const scoreComfortable = calculateTaskScore(taskComfortableBuffer, baseTimestamp).score;

      expect(scoreTight).toBeGreaterThan(scoreComfortable);
    });

    it('invariant: a task in time deficit never ranks below a non-deficit task of equal or lower priority', () => {
      // Task A is in deficit: due in 2h, needs 4h of effort -> deficit of 2h
      const deficitTasks: Task[] = [
        createSampleTask({
          id: 'def-urgent',
          priority: 'urgent',
          dueDateTime: new Date(baseTimestamp.getTime() + 2 * 3600 * 1000).toISOString(),
          estimatedHours: 4,
        }),
        createSampleTask({
          id: 'def-high',
          priority: 'high',
          dueDateTime: new Date(baseTimestamp.getTime() + 2 * 3600 * 1000).toISOString(),
          estimatedHours: 4,
        }),
        createSampleTask({
          id: 'def-medium',
          priority: 'medium',
          dueDateTime: new Date(baseTimestamp.getTime() + 2 * 3600 * 1000).toISOString(),
          estimatedHours: 4,
        }),
        createSampleTask({
          id: 'def-low',
          priority: 'low',
          dueDateTime: new Date(baseTimestamp.getTime() + 2 * 3600 * 1000).toISOString(),
          estimatedHours: 4,
        }),
      ];

      // Non-deficit tasks with comfortable buffers
      const nonDeficitTasks: Task[] = [
        createSampleTask({
          id: 'non-urgent',
          priority: 'urgent',
          dueDateTime: new Date(baseTimestamp.getTime() + 48 * 3600 * 1000).toISOString(),
          estimatedHours: 2,
        }),
        createSampleTask({
          id: 'non-high',
          priority: 'high',
          dueDateTime: new Date(baseTimestamp.getTime() + 24 * 3600 * 1000).toISOString(),
          estimatedHours: 2,
        }),
        createSampleTask({
          id: 'non-medium',
          priority: 'medium',
          dueDateTime: new Date(baseTimestamp.getTime() + 12 * 3600 * 1000).toISOString(),
          estimatedHours: 1,
        }),
        createSampleTask({
          id: 'non-low',
          priority: 'low',
          dueDateTime: new Date(baseTimestamp.getTime() + 8 * 3600 * 1000).toISOString(),
          estimatedHours: 1,
        }),
      ];

      const prioRank = { urgent: 4, high: 3, medium: 2, low: 1 };

      for (const defTask of deficitTasks) {
        const defScore = calculateTaskScore(defTask, baseTimestamp).score;
        for (const nonDefTask of nonDeficitTasks) {
          // If defTask priority >= nonDefTask priority:
          if (prioRank[defTask.priority] >= prioRank[nonDefTask.priority]) {
            const nonDefScore = calculateTaskScore(nonDefTask, baseTimestamp).score;
            expect(defScore).toBeGreaterThan(nonDefScore);
          }
        }
      }
    });
  });

  describe('Edge cases', () => {
    it('handles zero effort gracefully without throwing or division by zero', () => {
      const taskZero = createSampleTask({ estimatedHours: 0 });
      const analysis = calculateTaskScore(taskZero, baseTimestamp);

      expect(Number.isFinite(analysis.score)).toBe(true);
      expect(analysis.score).toBeGreaterThanOrEqual(0);
    });

    it('handles task due right now (T = 0)', () => {
      const taskDueNow = createSampleTask({
        dueDateTime: baseTimestamp.toISOString(),
        estimatedHours: 2,
      });
      const analysis = calculateTaskScore(taskDueNow, baseTimestamp);

      expect(analysis.score).toBeGreaterThan(0);
      expect(Number.isFinite(analysis.score)).toBe(true);
    });

    it('handles overdue tasks with proper headline and explanation', () => {
      const overdueTask = createSampleTask({
        dueDateTime: new Date(baseTimestamp.getTime() - 3 * 3600 * 1000).toISOString(),
        estimatedHours: 1.5,
      });
      const analysis = calculateTaskScore(overdueTask, baseTimestamp);

      expect(analysis.headline).toContain('Past Due');
      expect(analysis.keyFactors.some((f) => f.includes('Overdue'))).toBe(true);
    });

    it('handles very distant deadlines without negative or zero score', () => {
      const distantTask = createSampleTask({
        dueDateTime: new Date(baseTimestamp.getTime() + 1000 * 24 * 3600 * 1000).toISOString(),
        estimatedHours: 1,
      });
      const analysis = calculateTaskScore(distantTask, baseTimestamp);

      expect(analysis.score).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(analysis.score)).toBe(true);
    });

    it('deterministic tie-breaking when two tasks have identical scores', () => {
      const task1 = createSampleTask({
        id: 'task-1',
        title: 'Task Alpha',
        dueDateTime: new Date(baseTimestamp.getTime() + 10 * 3600 * 1000).toISOString(),
        createdAt: '2026-10-22T08:00:00Z',
      });
      const task2 = createSampleTask({
        id: 'task-2',
        title: 'Task Beta',
        dueDateTime: new Date(baseTimestamp.getTime() + 10 * 3600 * 1000).toISOString(),
        createdAt: '2026-10-22T09:00:00Z',
      });

      const result = getSmartRecommendations([task1, task2], baseTimestamp);
      expect(result.rankedQueue.length).toBe(2);
      // Older task (created earlier) breaks tie
      expect(result.topRecommendation?.task.id).toBe('task-1');
    });

    it('excludes completed tasks from smart recommendations', () => {
      const task1 = createSampleTask({ id: 'task-completed', completed: true });
      const task2 = createSampleTask({ id: 'task-active', completed: false });

      const result = getSmartRecommendations([task1, task2], baseTimestamp);
      expect(result.rankedQueue.length).toBe(1);
      expect(result.topRecommendation?.task.id).toBe('task-active');
    });

    it('returns null topRecommendation when all tasks are complete', () => {
      const task1 = createSampleTask({ id: 'task-1', completed: true });
      const result = getSmartRecommendations([task1], baseTimestamp);

      expect(result.topRecommendation).toBeNull();
      expect(result.rankedQueue).toEqual([]);
      expect(result.catchUpQueue).toEqual([]);
    });

    it('keeps tasks overdue <= 24h in normal ranking queue', () => {
      const taskOverdue20h = createSampleTask({
        id: 'task-overdue-20h',
        title: 'Recently Overdue Lab',
        dueDateTime: new Date(baseTimestamp.getTime() - 20 * 3600 * 1000).toISOString(),
      });
      const result = getSmartRecommendations([taskOverdue20h], baseTimestamp);

      expect(result.rankedQueue.length).toBe(1);
      expect(result.topRecommendation?.task.id).toBe('task-overdue-20h');
      expect(result.catchUpQueue.length).toBe(0);
    });

    it('moves tasks overdue > 24h into catchUpQueue and out of normal ranking', () => {
      const taskOverdue25h = createSampleTask({
        id: 'task-overdue-25h',
        title: 'Old Missed Assignment',
        dueDateTime: new Date(baseTimestamp.getTime() - 25 * 3600 * 1000).toISOString(),
      });
      const taskDueSoon = createSampleTask({
        id: 'task-due-soon',
        title: 'Project Due Tonight',
        dueDateTime: new Date(baseTimestamp.getTime() + 2 * 3600 * 1000).toISOString(),
        estimatedHours: 4,
      });

      const result = getSmartRecommendations([taskOverdue25h, taskDueSoon], baseTimestamp);

      // The 25h overdue task must NOT displace the task due soon
      expect(result.topRecommendation?.task.id).toBe('task-due-soon');
      expect(result.rankedQueue.length).toBe(1);
      expect(result.rankedQueue[0].task.id).toBe('task-due-soon');

      // The 25h overdue task is safely in the catchUpQueue
      expect(result.catchUpQueue.length).toBe(1);
      expect(result.catchUpQueue[0].id).toBe('task-overdue-25h');
    });

    it('excludes dropped tasks from ranking and catchUpQueue', () => {
      const droppedTask = createSampleTask({
        id: 'task-dropped',
        dropped: true,
      });
      const result = getSmartRecommendations([droppedTask], baseTimestamp);

      expect(result.topRecommendation).toBeNull();
      expect(result.rankedQueue).toEqual([]);
      expect(result.catchUpQueue).toEqual([]);
    });
  });
});
