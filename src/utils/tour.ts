import { Task } from '../types';

export const TOUR_SEEN_KEY = 'deadline_rescue_tour_seen_v1';

export interface TourStep {
  id: string;
  tab: 'today' | 'week' | 'tasks';
  targetId: string | null;
  title: string;
  description: string;
  icon: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    tab: 'today',
    targetId: null,
    title: 'Welcome to Deadline Rescue',
    description: 'A calm, local-first cockpit to keep you on top of assignments, attendance, and study hours.',
    icon: 'sparkles',
  },
  {
    id: 'add-task',
    tab: 'today',
    targetId: 'tour-add-task',
    title: 'Add or paste coursework',
    description: 'Type a task or paste a raw syllabus / announcement. We automatically parse courses, dates, and estimates.',
    icon: 'plus',
  },
  {
    id: 'greeting',
    tab: 'today',
    targetId: 'tour-greeting',
    title: 'Context-aware greeting',
    description: 'Headlines, weather, and quick-action chips that reflect your actual workload and time of day.',
    icon: 'sun',
  },
  {
    id: 'hero',
    tab: 'today',
    targetId: 'tour-hero',
    title: 'Single next focus',
    description: 'Algorithmically ranked top tasks so you never wonder what to do next. Built-in stopwatch to track actual effort.',
    icon: 'flame',
  },
  {
    id: 'attendance',
    tab: 'today',
    targetId: 'tour-attendance',
    title: 'Attendance Guard',
    description: 'Track class attendance, calculate skip headroom, and get alerts before dropping below target percentage.',
    icon: 'graduation-cap',
  },
  {
    id: 'rails',
    tab: 'today',
    targetId: 'tour-rails',
    title: 'Keep going & due soon',
    description: 'Horizontal rails organizing what you worked on recently and what is due in the next 48 hours.',
    icon: 'layers',
  },
  {
    id: 'forecast',
    tab: 'week',
    targetId: 'tour-forecast',
    title: '7-day workload forecast',
    description: 'Compare daily assignment demands against your real focus capacity. Simulate rescheduling with one click.',
    icon: 'calendar',
  },
  {
    id: 'tasks',
    tab: 'tasks',
    targetId: 'tour-tasks',
    title: 'Coursework catalog',
    description: 'View all assignments grouped by course with search, urgency tags, status filters, and bulk actions.',
    icon: 'check-square',
  },
  {
    id: 'ask',
    tab: 'today',
    targetId: 'tour-ask-button',
    title: 'AI study assistant',
    description: 'Ask questions in plain English—like "I only have 2 hours tonight"—for grounded timetable advice.',
    icon: 'message-square',
  },
  {
    id: 'menu',
    tab: 'today',
    targetId: 'tour-menu-button',
    title: 'Tools & preferences',
    description: 'Fine-tune daily study capacity, reset an overloaded week, tweak effects, or restart this tour anytime.',
    icon: 'settings',
  },
  {
    id: 'outro',
    tab: 'today',
    targetId: null,
    title: 'You are all set',
    description: 'Everything stays private in your browser. Add your first deadline whenever you are ready.',
    icon: 'check-circle',
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

