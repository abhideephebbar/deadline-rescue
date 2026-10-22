import { Task, Recommendation, Priority, CapacitySettings } from '../types';
import { getUrgencyInfo, formatRelativeTime } from './date';

export const PRIORITY_WEIGHTS: Record<Priority, number> = {
  urgent: 3.5,
  high: 2.5,
  medium: 1.6,
  low: 1.0,
};

/**
 * Minimum effective time horizon (1.0 hour) to prevent division by zero for imminent deadlines.
 */
export const MIN_HORIZON_HOURS = 1.0;

/**
 * Calculates continuous risk factor for a task:
 *   risk = remainingEffort / availableHours
 *
 * For upcoming deadlines (hoursRemaining >= MIN_HORIZON_HOURS):
 *   risk = remainingEffort / hoursRemaining
 *
 * For imminent (0 < hoursRemaining < MIN_HORIZON_HOURS) and overdue (hoursRemaining <= 0):
 *   risk = 1 + (remainingEffort - hoursRemaining) / MIN_HORIZON_HOURS
 *
 * Mathematical Invariants:
 * 1. Non-deficit tasks (remainingEffort < hoursRemaining) ALWAYS produce risk < 1.0.
 * 2. Deficit tasks (remainingEffort >= hoursRemaining > 0) ALWAYS produce risk >= 1.0.
 * 3. Overdue tasks (hoursRemaining <= 0) ALWAYS produce risk >= 1.0 + remainingEffort / MIN_HORIZON_HOURS.
 * 4. With all other fields equal:
 *    - A closer deadline (smaller hoursRemaining) never lowers score.
 *    - Higher priority never lowers score.
 *    - Larger remaining effort never lowers score.
 *    - Smaller buffer (hoursRemaining - remainingEffort) never lowers score.
 * 5. A task in time deficit NEVER ranks below a non-deficit task of equal or lower priority:
 *    Score(Deficit) >= P_deficit * 1000 >= P_nondeficit * 1000 > Score(NonDeficit).
 */
export function calculateRisk(remainingEffort: number, hoursRemaining: number): number {
  const effort = Math.max(remainingEffort, 0.001);
  if (hoursRemaining >= MIN_HORIZON_HOURS) {
    return effort / hoursRemaining;
  }
  return 1 + (effort - hoursRemaining) / MIN_HORIZON_HOURS;
}

/**
 * Calculates a rescue urgency score for an incomplete task.
 * Higher score = higher recommended priority to work on right now.
 * Accepts an optional reference timestamp `now` for testing and deterministic calculation.
 */
export function calculateTaskScore(
  task: Task,
  now: Date = new Date(),
  remainingEffortOverride?: number,
  capacitySettings?: CapacitySettings
): {
  score: number;
  risk: number;
  headline: string;
  explanation: string;
  keyFactors: string[];
  actionAdvice: string;
} {
  const effort = typeof remainingEffortOverride === 'number'
    ? Math.max(0, remainingEffortOverride)
    : Math.max(0, task.estimatedHours);

  const urgency = getUrgencyInfo(task.dueDateTime, effort, now, capacitySettings);
  const priorityWeight = PRIORITY_WEIGHTS[task.priority] || 1.0;
  const hoursRemaining = urgency.hoursRemaining;
  const buffer = urgency.bufferHours;

  const effectiveAvailableHours = urgency.isOverdue
    ? hoursRemaining
    : Math.max(0, urgency.availableWorkingHours);

  const risk = calculateRisk(effort, effectiveAvailableHours);
  const rawScore = priorityWeight * risk * 1000;
  const score = Math.round(rawScore);

  const factors: string[] = [];
  let headline = '';
  let explanation = '';
  let actionAdvice = '';

  factors.push(`Priority: ${task.priority.toUpperCase()} (${priorityWeight}x weight)`);
  factors.push(`Estimated workload: ${effort}h`);

  // 1. Overdue Handling
  if (urgency.isOverdue) {
    headline = 'Past Due — Recovery Recommended';
    factors.unshift(`Overdue by ${formatRelativeTime(hoursRemaining).replace('Overdue by ', '')}`);
    explanation = `This deadline passed ${formatRelativeTime(hoursRemaining)}. Recovery step: submit what you have completed or email your instructor to request a brief extension and reset expectations.`;
    actionAdvice = `Submit partial work or email your instructor to close this open loop and relieve pressure.`;
  }
  // 2. Time Deficit Check (effort > hours remaining before deadline)
  else if (urgency.hasTimeDeficit) {
    const deficitHours = Math.abs(buffer).toFixed(1);
    headline = 'Time Deficit — Focus Recommended';
    factors.unshift(`Time deficit: ${deficitHours}h shortfall (${effort}h needed vs ${hoursRemaining.toFixed(1)}h left)`);
    explanation = `You have ~${effort} hours of work with ${hoursRemaining.toFixed(1)} hours before the deadline. Getting started now helps you finish or capture maximum partial credit without extra pressure.`;
    actionAdvice = `Clear other distractions and begin work now to capture maximum credit.`;
  }
  // 3. Imminent / Low Buffer
  else if (hoursRemaining <= 12 || buffer <= 3) {
    headline = 'Critical Approaching Deadline';
    factors.unshift(`Due in ${formatRelativeTime(hoursRemaining).replace('Due in ', '')} (Safety buffer: ${buffer.toFixed(1)}h)`);
    explanation = `Due in ${formatRelativeTime(hoursRemaining).replace('Due in ', '')} with ${effort}h workload and a slim ${buffer.toFixed(1)}h buffer. Starting soon avoids rushed submission.`;
    actionAdvice = `Block out ${effort} undisturbed hours today to finish without pressure.`;
  }
  // 4. Quick Win Opportunity
  else if (effort <= 1.0 && hoursRemaining <= 36) {
    headline = 'Quick Win Opportunity';
    factors.unshift(`Quick win: only ${effort}h to complete`);
    explanation = `At only ${effort}h estimated effort, clearing this task quickly delivers an early victory and clears mental bandwidth for heavier projects.`;
    actionAdvice = `Knock this out in one short sitting to maintain momentum.`;
  }
  // 5. High / Urgent Priority
  else if (task.priority === 'urgent' || task.priority === 'high') {
    headline = 'High Priority Academic Target';
    factors.unshift(`Due in ${formatRelativeTime(hoursRemaining).replace('Due in ', '')}`);
    explanation = `Marked as ${task.priority.toUpperCase()} priority for ${task.course || 'coursework'} with ${effort}h estimated workload.`;
    actionAdvice = `Schedule a focused study block today to complete this before minor items.`;
  }
  // 6. Strategic / Default
  else {
    headline = 'Next Strategic Commitment';
    factors.unshift(`Due in ${formatRelativeTime(hoursRemaining).replace('Due in ', '')}`);
    explanation = `Ranked as your highest strategic need balancing ${task.priority} priority, workload (${effort}h), and deadline (${formatRelativeTime(hoursRemaining)}).`;
    actionAdvice = `Review guidelines and outline your first milestone now.`;
  }

  return {
    score,
    risk,
    headline,
    explanation,
    keyFactors: factors,
    actionAdvice,
  };
}

/**
 * Evaluates all incomplete tasks and returns them sorted by recommendation score,
 * highlighting the top recommended task.
 * Accepts an optional reference timestamp `now`.
 */
export function getSmartRecommendations(
  tasks: Task[],
  now: Date = new Date(),
  remainingEffortMap?: Record<string, number>,
  capacitySettings?: CapacitySettings
): {
  topRecommendation: Recommendation | null;
  rankedQueue: Recommendation[];
} {
  const incompleteTasks = tasks.filter((t) => !t.completed);

  if (incompleteTasks.length === 0) {
    return { topRecommendation: null, rankedQueue: [] };
  }

  const recommendations: Recommendation[] = incompleteTasks.map((task) => {
    const remainingEffort = remainingEffortMap ? remainingEffortMap[task.id] : undefined;
    const analysis = calculateTaskScore(task, now, remainingEffort, capacitySettings);
    const effort = typeof remainingEffort === 'number' ? remainingEffort : task.estimatedHours;
    const urgency = getUrgencyInfo(task.dueDateTime, effort, now, capacitySettings);

    return {
      task,
      score: analysis.score,
      urgency,
      headline: analysis.headline,
      explanation: analysis.explanation,
      keyFactors: analysis.keyFactors,
      actionAdvice: analysis.actionAdvice,
    };
  });

  // Sort descending by score with deterministic tie-breakers
  recommendations.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Tie-breaker 1: Closer deadline first
    const dueA = new Date(a.task.dueDateTime).getTime();
    const dueB = new Date(b.task.dueDateTime).getTime();
    if (dueA !== dueB) return dueA - dueB;

    // Tie-breaker 2: Priority weight descending
    const prioA = PRIORITY_WEIGHTS[a.task.priority] || 0;
    const prioB = PRIORITY_WEIGHTS[b.task.priority] || 0;
    if (prioA !== prioB) return prioB - prioA;

    // Tie-breaker 3: Older task first (FIFO)
    return new Date(a.task.createdAt).getTime() - new Date(b.task.createdAt).getTime();
  });

  return {
    topRecommendation: recommendations[0] || null,
    rankedQueue: recommendations,
  };
}
