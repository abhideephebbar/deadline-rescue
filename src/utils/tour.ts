import { Task } from '../types';

export const TOUR_SEEN_KEY = 'deadline_rescue_tour_seen_v1';

export interface TourStep {
  id: string;
  targetId: string;
  title: string;
  description: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'add-task',
    targetId: 'tour-add-task',
    title: 'Add or paste deadlines',
    description: 'Quickly enter an assignment or paste raw text from your syllabus or course announcements.',
  },
  {
    id: 'now-card',
    targetId: 'now-card',
    title: 'Your single next focus',
    description: 'We calculate time deficits and study capacity to give you ONE clear answer to "what should I do now?". You can start the focus timer right on the card.',
  },
  {
    id: 'forecast',
    targetId: 'tour-forecast',
    title: '7-day workload forecast',
    description: 'See which days are clear, filling up, or overloaded. Tap any day to test "What if I move this?" and simulate consequences.',
  },
  {
    id: 'ask-button',
    targetId: 'tour-ask-button',
    title: 'Ask in plain language',
    description: 'Tell us what is going on—like "I only have 2 hours tonight"—and get grounded suggestions based on your real schedule.',
  },
  {
    id: 'menu-button',
    targetId: 'tour-menu-button',
    title: 'Tools & study capacity',
    description: 'Customize your daily focus hours, reset an overwhelmed week, import coursework, or restart this tour anytime.',
  },
];

/**
 * Checks if the user has already completed or dismissed the product tour.
 */
export function isTourSeen(): boolean {
  try {
    return localStorage.getItem(TOUR_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Marks the product tour as seen in localStorage.
 */
export function markTourSeen(): void {
  try {
    localStorage.setItem(TOUR_SEEN_KEY, 'true');
  } catch {
    // localStorage unavailable
  }
}

/**
 * Resets the tour seen state (useful for tests and manual replay).
 */
export function resetTourSeen(): void {
  try {
    localStorage.removeItem(TOUR_SEEN_KEY);
  } catch {
    // localStorage unavailable
  }
}

/**
 * Generates an in-memory sample dataset used strictly during Tour Mode.
 * Must NEVER be written to localStorage.
 */
export function generateTourDemoTasks(): Task[] {
  const now = Date.now();
  const hours = (h: number) => new Date(now + h * 3600 * 1000).toISOString();

  return [
    {
      id: 'tour-task-1',
      title: 'Operating Systems: Kernel Concurrency Lab',
      course: 'CS 350',
      dueDateTime: hours(5),
      estimatedHours: 3.5,
      priority: 'urgent',
      category: 'project',
      notes: 'Implement reader-writer locks and verify thread safety.',
      completed: false,
      createdAt: hours(-24),
      updatedAt: hours(-24),
    },
    {
      id: 'tour-task-2',
      title: 'Microeconomics: Problem Set 4',
      course: 'ECON 201',
      dueDateTime: hours(24),
      estimatedHours: 2.0,
      priority: 'high',
      category: 'assignment',
      notes: 'Nash equilibrium proofs and supply elasticity.',
      completed: false,
      createdAt: hours(-12),
      updatedAt: hours(-12),
    },
    {
      id: 'tour-task-3',
      title: 'Genetics: Pre-Lab Protocol Quiz',
      course: 'BIO 112',
      dueDateTime: hours(48),
      estimatedHours: 0.75,
      priority: 'medium',
      category: 'quiz',
      notes: 'Canvas quiz on gel electrophoresis.',
      completed: false,
      createdAt: hours(-6),
      updatedAt: hours(-6),
    },
  ];
}
