import { Task, CapacitySettings } from '../types';
import { calculateDailyLoads } from './capacity';

export type WorkloadMood = 'calm' | 'busy' | 'overloaded';

/**
 * Calculates workload mood based on the ratio of 7-day demand to 7-day capacity:
 * - below 0.7 (< 70% capacity): "calm"
 * - 0.7 to 1.0 (70% - 100% capacity): "busy"
 * - above 1.0 (> 100% capacity / deficit): "overloaded"
 */
export function getWorkloadMood(
  tasks: Task[],
  capacitySettings: CapacitySettings,
  now: Date = new Date()
): WorkloadMood {
  const incomplete = tasks.filter((t) => !t.completed && !t.dropped);
  if (incomplete.length === 0) {
    return 'calm';
  }

  const dailyLoads = calculateDailyLoads(incomplete, capacitySettings, now, 7);
  const totalDemand = dailyLoads.reduce((sum, d) => sum + d.demandHours, 0);
  const totalCapacity = dailyLoads.reduce((sum, d) => sum + d.capacityHours, 0);

  if (totalCapacity <= 0) {
    return totalDemand > 0 ? 'overloaded' : 'calm';
  }

  const ratio = totalDemand / totalCapacity;

  if (ratio < 0.7) {
    return 'calm';
  }
  if (ratio <= 1.0) {
    return 'busy';
  }
  return 'overloaded';
}

