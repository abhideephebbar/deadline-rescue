import { Task, CapacitySettings, UrgencyInfo } from '../types';
import { getUrgencyInfo } from './date';
import { calculateTaskScore } from './ranking';
import { calculateDailyLoads } from './capacity';

export type TriageCategory = 'do_fully' | 'do_minimum' | 'safe_to_defer';

export interface TriagedTaskItem {
  task: Task;
  category: TriageCategory;
  oneLineReason: string;
  recommendedHours: number;
  originalEffort: number;
  urgency: UrgencyInfo;
}

export interface TriagePlan {
  isOverCapacity: boolean;
  totalDemandHours: number;
  totalCapacityHours: number;
  deficitHours: number;
  optimizedDemandHours: number;
  hoursSaved: number;
  doFully: TriagedTaskItem[];
  doMinimum: TriagedTaskItem[];
  safeToDefer: TriagedTaskItem[];
  disclaimer: string;
}

export const TRIAGE_DISCLAIMER =
  "These suggestions are calculated strictly from your own priority labels, deadlines, and workload estimates—not automated academic predictions. Adjust decisions based on your course syllabus and instructor expectations.";

/**
 * Evaluates whether remaining effort exceeds available capacity, and produces
 * a realistic, guilt-free triage plan splitting tasks into:
 * 1. Do fully (high impact, critical grade weight)
 * 2. Do the minimum (aim for 75% credit with 50% effort)
 * 3. Safe to defer or skip (low priority or distant deadlines)
 */
export function generateTriagePlan(
  tasks: Task[],
  capacitySettings: CapacitySettings,
  now: Date = new Date(),
  remainingEffortMap?: Record<string, number>
): TriagePlan {
  const incompleteTasks = tasks.filter((t) => !t.completed);

  // Compute 7-day total demand and capacity
  const weeklyLoads = calculateDailyLoads(incompleteTasks, capacitySettings, now, 7);
  const totalCapacityHours = weeklyLoads.reduce((sum, d) => sum + d.capacityHours, 0);

  const totalDemandHours = Math.round(
    incompleteTasks.reduce((sum, t) => {
      const effort = remainingEffortMap && remainingEffortMap[t.id] !== undefined
        ? remainingEffortMap[t.id]
        : t.estimatedHours;
      return sum + effort;
    }, 0) * 10
  ) / 10;

  const isOverCapacity = totalDemandHours > totalCapacityHours || weeklyLoads.some((l) => l.status === 'overloaded');
  const deficitHours = Math.max(0, Math.round((totalDemandHours - totalCapacityHours) * 10) / 10);

  // Sort incomplete tasks by rescue priority descending
  const sortedTasks = [...incompleteTasks].sort((a, b) => {
    const effortA = remainingEffortMap ? remainingEffortMap[a.id] : undefined;
    const effortB = remainingEffortMap ? remainingEffortMap[b.id] : undefined;
    return calculateTaskScore(b, now, effortB, capacitySettings).score - calculateTaskScore(a, now, effortA, capacitySettings).score;
  });

  const doFully: TriagedTaskItem[] = [];
  const doMinimum: TriagedTaskItem[] = [];
  const safeToDefer: TriagedTaskItem[] = [];

  for (const task of sortedTasks) {
    const effort = remainingEffortMap && remainingEffortMap[task.id] !== undefined
      ? remainingEffortMap[task.id]
      : task.estimatedHours;
    const urgency = getUrgencyInfo(task.dueDateTime, effort, now, capacitySettings);

    // Rule 1: High/Urgent priority, exams, or imminent overdue -> Do Fully
    if (task.priority === 'urgent' || (task.priority === 'high' && urgency.hoursRemaining <= 48) || task.category === 'exam') {
      doFully.push({
        task,
        category: 'do_fully',
        oneLineReason:
          task.category === 'exam'
            ? 'High-stakes exam: full preparation is essential to protect your course grade.'
            : task.priority === 'urgent'
            ? 'Urgent priority commitment: cutting corners here will severely jeopardize course outcomes.'
            : 'Imminent high-priority deadline: complete fully to maximize grading rubric points.',
        recommendedHours: effort,
        originalEffort: effort,
        urgency,
      });
    }
    // Rule 2: Low priority or distant deadline (>72h away) -> Safe to Defer
    else if (task.priority === 'low' || (urgency.hoursRemaining > 72 && isOverCapacity)) {
      safeToDefer.push({
        task,
        category: 'safe_to_defer',
        oneLineReason:
          task.priority === 'low'
            ? 'Low grade weight: safe to pause or submit late with minor penalty to preserve today\'s sanity.'
            : `Due in ${urgency.relativeTime}: postponing work on this frees ${effort}h to rescue imminent deadlines.`,
        recommendedHours: 0,
        originalEffort: effort,
        urgency,
      });
    }
    // Rule 3: Medium priority or high-effort tasks -> Do the Minimum (MVP partial credit)
    else {
      const minHours = Math.max(0.5, Math.round(effort * 0.5 * 2) / 2);
      doMinimum.push({
        task,
        category: 'do_minimum',
        oneLineReason: `Aim for 75% partial credit: solve core questions and skip optional bonuses in ~${minHours}h.`,
        recommendedHours: minHours,
        originalEffort: effort,
        urgency,
      });
    }
  }

  // Calculate optimized hours under triage plan
  const optimizedDemandHours = Math.round(
    (doFully.reduce((s, i) => s + i.recommendedHours, 0) +
      doMinimum.reduce((s, i) => s + i.recommendedHours, 0) +
      safeToDefer.reduce((s, i) => s + i.recommendedHours, 0)) * 10
  ) / 10;

  const hoursSaved = Math.max(0, Math.round((totalDemandHours - optimizedDemandHours) * 10) / 10);

  return {
    isOverCapacity,
    totalDemandHours,
    totalCapacityHours,
    deficitHours,
    optimizedDemandHours,
    hoursSaved,
    doFully,
    doMinimum,
    safeToDefer,
    disclaimer: TRIAGE_DISCLAIMER,
  };
}
