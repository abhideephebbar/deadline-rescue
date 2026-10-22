import { Task, TaskCategory, StopwatchSession } from '../types';
import { getTaskLoggedHours } from './stopwatchIntegration';

export const MIN_CALIBRATION_SAMPLES = 3;

export interface CategoryCalibration {
  category: TaskCategory;
  sampleCount: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  ratio: number; // e.g. 1.4 means actual time was 1.4x estimated time
}

export interface CalibrationSuggestion {
  suggestedHours: number;
  ratio: number;
  sampleCount: number;
  categoryLabel: string;
  reason: string;
}

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  assignment: 'Assignments',
  exam: 'Exams',
  project: 'Projects',
  reading: 'Readings',
  quiz: 'Quizzes',
  lab: 'Labs',
  other: 'Coursework',
};

/**
 * Computes calibration metrics for completed tasks that have tracked stopwatch time.
 * Requires at least MIN_CALIBRATION_SAMPLES (3) completed tasks per category.
 */
export function getCategoryCalibrations(
  tasks: Task[],
  sessions: StopwatchSession[]
): Record<TaskCategory, CategoryCalibration | null> {
  const result: Record<TaskCategory, CategoryCalibration | null> = {
    assignment: null,
    exam: null,
    project: null,
    reading: null,
    quiz: null,
    lab: null,
    other: null,
  };

  const completedTasks = tasks.filter((t) => t.completed && t.estimatedHours > 0);

  // Group by category
  const categorySamples: Record<TaskCategory, { estimated: number; actual: number }[]> = {
    assignment: [],
    exam: [],
    project: [],
    reading: [],
    quiz: [],
    lab: [],
    other: [],
  };

  for (const task of completedTasks) {
    const loggedHours = getTaskLoggedHours(task.id, sessions);
    if (loggedHours > 0) {
      const cat = task.category || 'assignment';
      if (categorySamples[cat]) {
        categorySamples[cat].push({
          estimated: task.estimatedHours,
          actual: loggedHours,
        });
      }
    }
  }

  // Calculate ratio for categories with >= MIN_CALIBRATION_SAMPLES
  (Object.keys(categorySamples) as TaskCategory[]).forEach((cat) => {
    const samples = categorySamples[cat];
    if (samples && samples.length >= MIN_CALIBRATION_SAMPLES) {
      const totalEstimated = samples.reduce((sum, s) => sum + s.estimated, 0);
      const totalActual = samples.reduce((sum, s) => sum + s.actual, 0);

      if (totalEstimated > 0) {
        const rawRatio = totalActual / totalEstimated;
        const ratio = Math.round(rawRatio * 10) / 10;

        result[cat] = {
          category: cat,
          sampleCount: samples.length,
          totalEstimatedHours: Math.round(totalEstimated * 10) / 10,
          totalActualHours: Math.round(totalActual * 10) / 10,
          ratio,
        };
      }
    }
  });

  return result;
}

/**
 * Evaluates whether an estimate should have a calibration suggestion.
 * Only suggests if ratio differs meaningfully from 1.0 (ratio <= 0.85 or ratio >= 1.15).
 */
export function getCalibratedEstimateSuggestion(
  category: TaskCategory,
  userEstimate: number,
  calibrations: Record<TaskCategory, CategoryCalibration | null>
): CalibrationSuggestion | null {
  if (!userEstimate || userEstimate <= 0) return null;

  const cal = calibrations[category];
  if (!cal || cal.sampleCount < MIN_CALIBRATION_SAMPLES) {
    return null;
  }

  // Only suggest adjustment if ratio differs by more than 15% from 1.0
  if (cal.ratio >= 0.88 && cal.ratio <= 1.12) {
    return null;
  }

  const suggestedRaw = userEstimate * cal.ratio;
  const suggestedHours = Math.round(suggestedRaw * 2) / 2; // round to nearest 0.5h
  if (suggestedHours === userEstimate) {
    return null;
  }

  const catLabel = CATEGORY_LABELS[category] || 'Coursework';
  const reason = `${catLabel} usually take about ${cal.ratio}x your estimate (based on ${cal.sampleCount} completed ${catLabel.toLowerCase()}).`;

  return {
    suggestedHours,
    ratio: cal.ratio,
    sampleCount: cal.sampleCount,
    categoryLabel: catLabel,
    reason,
  };
}
