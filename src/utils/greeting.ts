import { AppFacts } from './facts';

export const FIRST_VISIT_STORAGE_KEY = 'deadline_rescue_first_visit_seen';
export const GREETING_DISMISSED_KEY = 'deadline_rescue_greeting_dismissed_date';

export type GreetingActionType =
  | 'paste'
  | 'add'
  | 'tour'
  | 'start_top'
  | 'plan_week'
  | 'swamped';

export interface GreetingActionChip {
  id: string;
  label: string;
  action: GreetingActionType;
  taskId?: string;
}

export interface WelcomeGreetingData {
  type: 'first_visit' | 'returning' | 'no_tasks';
  greeting: string;
  subtext: string;
  actionChips: GreetingActionChip[];
}

/**
 * Checks if the user is visiting for the first time.
 */
export function isFirstVisit(storage?: Storage): boolean {
  if (!storage) {
    if (typeof window === 'undefined') return false;
    storage = window.localStorage;
  }
  return storage.getItem(FIRST_VISIT_STORAGE_KEY) !== 'true';
}

/**
 * Marks that the first visit has occurred.
 */
export function markFirstVisitSeen(storage?: Storage): void {
  if (!storage) {
    if (typeof window === 'undefined') return;
    storage = window.localStorage;
  }
  storage.setItem(FIRST_VISIT_STORAGE_KEY, 'true');
}

/**
 * Checks if greeting has already been dismissed today.
 */
export function isGreetingDismissedToday(now: Date = new Date(), storage?: Storage): boolean {
  if (!storage) {
    if (typeof window === 'undefined') return false;
    storage = window.localStorage;
  }
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  return storage.getItem(GREETING_DISMISSED_KEY) === todayStr;
}

/**
 * Persists dismissal of the greeting banner for today.
 */
export function dismissGreetingToday(now: Date = new Date(), storage?: Storage): void {
  if (!storage) {
    if (typeof window === 'undefined') return;
    storage = window.localStorage;
  }
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  storage.setItem(GREETING_DISMISSED_KEY, todayStr);
}

/**
 * Generates time-of-day greeting string ("Good morning", "Good afternoon", "Good evening").
 */
export function getTimeOfDayGreeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Computes the welcome greeting card data locally without any API call.
 */
export function getWelcomeGreeting(
  facts: AppFacts,
  now: Date = new Date(),
  storage?: Storage
): WelcomeGreetingData | null {
  if (isGreetingDismissedToday(now, storage)) {
    return null;
  }

  // 1. First visit ever
  if (isFirstVisit(storage)) {
    return {
      type: 'first_visit',
      greeting: 'Welcome to Deadline Rescue',
      subtext:
        'Triage your coursework, protect your study hours, and know exactly what to do next without guilt.',
      actionChips: [
        { id: 'paste', label: 'Paste my deadlines', action: 'paste' },
        { id: 'add', label: 'Add a task', action: 'add' },
        { id: 'tour', label: 'Show me around', action: 'tour' },
      ],
    };
  }

  const timeGreeting = getTimeOfDayGreeting(now);

  // 2. Returning with 0 tasks
  if (facts.totalActiveCount === 0) {
    return {
      type: 'no_tasks',
      greeting: `${timeGreeting}!`,
      subtext:
        "You're all caught up with no active assignments right now. Add a task or paste upcoming deadlines to stay ahead.",
      actionChips: [
        { id: 'add', label: 'Add a task', action: 'add' },
        { id: 'paste', label: 'Paste my deadlines', action: 'paste' },
      ],
    };
  }

  // 3. Returning with active tasks
  let subtext = '';
  if (facts.catchUpCount > 0) {
    subtext = `You have ${facts.catchUpCount} older item${
      facts.catchUpCount === 1 ? '' : 's'
    } that need attention, and ${facts.topTask?.title || 'your next task'} is up next.`;
  } else if (facts.topTask) {
    subtext = `Your top focus is ${facts.topTask.title} (${facts.topTask.dueRelative.toLowerCase()}). You have ~${
      facts.today.demandHours
    }h planned against ${facts.today.capacityHours}h capacity today.`;
  } else {
    subtext = `You have ${facts.totalActiveCount} assignments planned (~${facts.totalActiveHours}h total effort).`;
  }

  const actionChips: GreetingActionChip[] = [];
  if (facts.topTask) {
    actionChips.push({
      id: 'start_top',
      label: `Start ${facts.topTask.title}`,
      action: 'start_top',
      taskId: facts.topTask.id,
    });
  }
  actionChips.push({ id: 'plan_week', label: 'Plan my week', action: 'plan_week' });
  actionChips.push({ id: 'swamped', label: "I'm swamped", action: 'swamped' });

  return {
    type: 'returning',
    greeting: `${timeGreeting}!`,
    subtext,
    actionChips,
  };
}

