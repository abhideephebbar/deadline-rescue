import { Task, CapacitySettings } from '../types';
import { calculateDailyLoads } from './capacity';
import { getOverdueTasks } from './recovery';

export interface StatusSentenceInfo {
  text: string;
  actionLabel?: string;
  actionType?: 'plan' | 'reset';
  tone: 'good' | 'attention' | 'neutral';
}

/**
 * Computes a single plain, supportive status sentence to replace cluttered metric cards.
 * Guided by product principles: supportive, actionable, zero jargon.
 */
export function getStatusSentence(
  tasks: Task[],
  capacitySettings: CapacitySettings,
  now: Date = new Date()
): StatusSentenceInfo {
  const incomplete = tasks.filter((t) => !t.completed);

  if (incomplete.length === 0) {
    return {
      text: "You're all caught up. No active deadlines right now.",
      tone: 'good',
    };
  }

  // 1. Overdue tasks check
  const overdue = getOverdueTasks(incomplete, now);
  if (overdue.length > 0) {
    const count = overdue.length;
    return {
      text: count === 1 ? 'You have 1 past-due assignment.' : `You have ${count} past-due assignments.`,
      actionLabel: 'See recovery steps',
      actionType: 'reset',
      tone: 'attention',
    };
  }

  // 2. Today's capacity check
  const dailyLoads = calculateDailyLoads(tasks, capacitySettings, now, 7);
  const todayLoad = dailyLoads[0];

  if (todayLoad && todayLoad.status === 'overloaded') {
    const deficit = Math.max(0.5, Math.round((todayLoad.demandHours - todayLoad.capacityHours) * 2) / 2);
    return {
      text: `You're about ${deficit} ${deficit === 1 ? 'hour' : 'hours'} short today.`,
      actionLabel: 'See what to drop',
      actionType: 'plan',
      tone: 'attention',
    };
  }

  // 3. Upcoming week overloaded check
  const overloadedUpcoming = dailyLoads.slice(1).find((d) => d.status === 'overloaded');
  if (overloadedUpcoming) {
    return {
      text: `${overloadedUpcoming.dayLabel} looks heavy based on your study hours.`,
      actionLabel: 'Plan ahead',
      actionType: 'plan',
      tone: 'attention',
    };
  }

  // 4. On track
  const totalHours = Math.round(incomplete.reduce((acc, t) => acc + (t.estimatedHours || 1), 0));
  return {
    text: `You're on track this week (${totalHours}h planned).`,
    tone: 'good',
  };
}
