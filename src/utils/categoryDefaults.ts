import { TaskCategory } from '../types';

export const CATEGORY_DEFAULTS_KEY = 'deadline_rescue_category_defaults';

export const DEFAULT_CATEGORY_HOURS: Record<TaskCategory, number> = {
  quiz: 0.75,
  assignment: 2.0,
  lab: 3.0,
  project: 4.5,
  exam: 4.0,
  reading: 1.0,
  other: 2.0,
};

/**
 * Returns user-configured or system default prep time in hours per category.
 */
export function getCategoryDefaults(): Record<TaskCategory, number> {
  if (typeof localStorage === 'undefined') {
    return { ...DEFAULT_CATEGORY_HOURS };
  }
  try {
    const raw = localStorage.getItem(CATEGORY_DEFAULTS_KEY);
    if (!raw) return { ...DEFAULT_CATEGORY_HOURS };
    const parsed = JSON.parse(raw);
    return {
      quiz: typeof parsed.quiz === 'number' && parsed.quiz > 0 ? parsed.quiz : DEFAULT_CATEGORY_HOURS.quiz,
      assignment: typeof parsed.assignment === 'number' && parsed.assignment > 0 ? parsed.assignment : DEFAULT_CATEGORY_HOURS.assignment,
      lab: typeof parsed.lab === 'number' && parsed.lab > 0 ? parsed.lab : DEFAULT_CATEGORY_HOURS.lab,
      project: typeof parsed.project === 'number' && parsed.project > 0 ? parsed.project : DEFAULT_CATEGORY_HOURS.project,
      exam: typeof parsed.exam === 'number' && parsed.exam > 0 ? parsed.exam : DEFAULT_CATEGORY_HOURS.exam,
      reading: typeof parsed.reading === 'number' && parsed.reading > 0 ? parsed.reading : DEFAULT_CATEGORY_HOURS.reading,
      other: typeof parsed.other === 'number' && parsed.other > 0 ? parsed.other : DEFAULT_CATEGORY_HOURS.other,
    };
  } catch {
    return { ...DEFAULT_CATEGORY_HOURS };
  }
}

/**
 * Persists updated category prep times.
 */
export function saveCategoryDefaults(defaults: Partial<Record<TaskCategory, number>>): Record<TaskCategory, number> {
  const current = getCategoryDefaults();
  const updated: Record<TaskCategory, number> = {
    ...current,
    ...defaults,
  };
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(CATEGORY_DEFAULTS_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save category defaults to localStorage:', e);
    }
  }
  return updated;
}

/**
 * Resets category prep times to defaults and returns them.
 */
export function resetCategoryDefaults(): Record<TaskCategory, number> {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(CATEGORY_DEFAULTS_KEY);
    } catch (e) {
      console.warn('Failed to reset category defaults in localStorage:', e);
    }
  }
  return { ...DEFAULT_CATEGORY_HOURS };
}
