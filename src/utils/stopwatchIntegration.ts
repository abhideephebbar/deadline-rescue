import { Task, StopwatchSession } from '../types';

/**
 * Calculates total logged hours for a specific task across all saved stopwatch sessions.
 */
export function getTaskLoggedHours(taskId: string, sessions: StopwatchSession[]): number {
  if (!taskId || !Array.isArray(sessions)) return 0;
  const taskSessions = sessions.filter((s) => s.taskId === taskId);
  const totalMs = taskSessions.reduce((sum, s) => sum + s.durationMs, 0);
  return Math.round((totalMs / (1000 * 60 * 60)) * 100) / 100;
}

/**
 * Calculates real remaining effort for a task:
 * remainingEffort = max(minEffort, estimatedHours - loggedHours)
 *
 * For incomplete tasks, maintains a minimum 0.25h (15 min) remaining effort floor
 * so an active task that exceeded its estimate does not become 0 effort in ranking.
 */
export function getTaskRemainingEffort(task: Task, sessions: StopwatchSession[]): number {
  const loggedHours = getTaskLoggedHours(task.id, sessions);
  if (task.completed) {
    return 0;
  }
  const diff = task.estimatedHours - loggedHours;
  if (diff <= 0) {
    // If already spent all estimated hours but task is still incomplete,
    // assume a minimum wrap-up effort of 0.25h (15 minutes).
    return 0.25;
  }
  return Math.round(diff * 10) / 10;
}

/**
 * Builds a lookup map of taskId -> real remaining effort for all tasks.
 */
export function getRemainingEffortMap(tasks: Task[], sessions: StopwatchSession[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const task of tasks) {
    map[task.id] = getTaskRemainingEffort(task, sessions);
  }
  return map;
}

