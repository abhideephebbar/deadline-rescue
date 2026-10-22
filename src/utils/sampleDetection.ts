import { Task } from '../types';

export const KNOWN_SAMPLE_TITLES = [
  'Operating Systems: Kernel Concurrency Lab',
  'Intermediate Microeconomics: Problem Set 4',
  'Molecular Genetics: Pre-Lab Protocol Quiz',
  'Modern Philosophy: First Draft of Term Essay',
  'Linear Algebra: WebAssign Homework 6',
  'Intro to Psychology: Chapters 4 & 5 Discussion Post',
];

export const SAMPLE_BANNER_DISMISSED_KEY = 'deadline_rescue_sample_banner_dismissed';

/**
 * Checks if a task set consists of the default sample tasks.
 * Matches if every task has a title in KNOWN_SAMPLE_TITLES or starts with 'task-sample-'.
 */
export function isSampleTaskSet(tasks: Task[]): boolean {
  if (!tasks || tasks.length === 0) return false;

  const matches = tasks.filter((t) => {
    const isSampleId = typeof t.id === 'string' && t.id.startsWith('task-sample-');
    const isSampleTitle = KNOWN_SAMPLE_TITLES.includes(t.title);
    return isSampleId || isSampleTitle;
  });

  // Must match all tasks in the list, and contain at least 3 matching sample tasks
  return matches.length === tasks.length && matches.length >= 3;
}

/**
 * Checks if the user has already dismissed the sample task detection banner.
 */
export function isSampleBannerDismissed(): boolean {
  try {
    return localStorage.getItem(SAMPLE_BANNER_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Marks the sample task detection banner as dismissed in localStorage.
 */
export function dismissSampleBanner(): void {
  try {
    localStorage.setItem(SAMPLE_BANNER_DISMISSED_KEY, 'true');
  } catch {
    // localStorage unavailable
  }
}

