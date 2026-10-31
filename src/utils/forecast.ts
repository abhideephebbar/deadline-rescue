import { Task, CapacitySettings, DailyLoadMetric, TaskCategory } from '../types';
import { calculateDailyLoads } from './capacity';
import { CategoryCalibration } from './calibration';

export interface DelaySimulationResult {
  simulatedLoads: DailyLoadMetric[];
  consequenceSentence: string;
  sourceDayIndex: number;
  targetDayIndex: number;
  sourceDayLabel: string;
  targetDayLabel: string;
  sourceStatusBefore: string;
  sourceStatusAfter: string;
  targetStatusBefore: string;
  targetStatusAfter: string;
  missesDeadline: boolean;
}

/**
 * Simulates moving a task's work to a later day (1 to 6 days later).
 * Computes the updated 7-day daily load and generates a single crisp sentence
 * stating the exact academic consequence.
 */
export function simulateTaskDelay(
  task: Task,
  delayDays: number,
  allTasks: Task[],
  settings: CapacitySettings,
  startDate: Date = new Date(),
  calibrations?: Record<TaskCategory, CategoryCalibration | null> | null
): DelaySimulationResult {
  const originalLoads = calculateDailyLoads(allTasks, settings, startDate, 7, calibrations);

  // Determine which day the task is originally scheduled for
  const taskDueDate = new Date(task.dueDateTime);
  const startDay = new Date(startDate);
  startDay.setHours(0, 0, 0, 0);

  // Find source day index (0 to 6, or -1 if overdue/beyond 7 days)
  let sourceDayIndex = originalLoads.findIndex((load) => load.taskIds.includes(task.id));
  if (sourceDayIndex === -1) {
    // Default to day 0 (today) if not found in 7-day window
    sourceDayIndex = 0;
  }

  const targetDayIndex = Math.min(6, sourceDayIndex + delayDays);

  const sourceLoadBefore = originalLoads[sourceDayIndex];
  const targetLoadBefore = originalLoads[targetDayIndex];

  // Create simulated tasks array
  const targetDate = new Date(startDate);
  targetDate.setDate(targetDate.getDate() + targetDayIndex);
  targetDate.setHours(23, 59, 0, 0);

  const simulatedTasks = allTasks.map((t) => {
    if (t.id === task.id) {
      return {
        ...t,
        dueDateTime: targetDate.toISOString(),
      };
    }
    return t;
  });

  const simulatedLoads = calculateDailyLoads(simulatedTasks, settings, startDate, 7, calibrations);
  const sourceLoadAfter = simulatedLoads[sourceDayIndex];
  const targetLoadAfter = simulatedLoads[targetDayIndex];

  const missesDeadline = targetDate.getTime() > taskDueDate.getTime();

  let consequenceSentence = '';

  const effortStr = `${task.estimatedHours}h`;
  const srcLabel = sourceLoadBefore.dayLabel;
  const dstLabel = targetLoadBefore.dayLabel;

  if (missesDeadline) {
    consequenceSentence = `Delaying ${task.title} to ${dstLabel} frees ${effortStr} on ${srcLabel}, but misses your scheduled deadline and incurs late submission risk.`;
  } else if (sourceLoadBefore.status === 'overloaded' && targetLoadAfter.status === 'overloaded') {
    consequenceSentence = `Delaying ${task.title} to ${dstLabel} relieves ${srcLabel} down to ${sourceLoadAfter.demandHours}h (${sourceLoadAfter.status}), but overloads ${dstLabel} to ${targetLoadAfter.demandHours}h (capacity: ${targetLoadAfter.capacityHours}h).`;
  } else if (sourceLoadBefore.status === 'overloaded' && targetLoadAfter.status !== 'overloaded') {
    consequenceSentence = `Delaying ${task.title} to ${dstLabel} successfully resolves ${srcLabel}'s overload down to ${sourceLoadAfter.demandHours}h while keeping ${dstLabel} manageable at ${targetLoadAfter.demandHours}h (${targetLoadAfter.status}).`;
  } else if (targetLoadAfter.status === 'overloaded') {
    consequenceSentence = `Moving ${effortStr} to ${dstLabel} pushes that day into overload at ${targetLoadAfter.demandHours}h (exceeding ${targetLoadAfter.capacityHours}h capacity).`;
  } else {
    consequenceSentence = `Delaying ${task.title} to ${dstLabel} shifts ${effortStr} smoothly, keeping both ${srcLabel} (${sourceLoadAfter.demandHours}h) and ${dstLabel} (${targetLoadAfter.demandHours}h) within capacity.`;
  }

  return {
    simulatedLoads,
    consequenceSentence,
    sourceDayIndex,
    targetDayIndex,
    sourceDayLabel: srcLabel,
    targetDayLabel: dstLabel,
    sourceStatusBefore: sourceLoadBefore.status,
    sourceStatusAfter: sourceLoadAfter.status,
    targetStatusBefore: targetLoadBefore.status,
    targetStatusAfter: targetLoadAfter.status,
    missesDeadline,
  };
}
