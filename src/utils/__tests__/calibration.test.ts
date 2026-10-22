import { describe, it, expect } from 'vitest';
import {
  getCategoryCalibrations,
  getCalibratedEstimateSuggestion,
} from '../calibration';
import { Task, StopwatchSession } from '../../types';

describe('Estimate Calibration Engine', () => {
  const createCompletedTask = (id: string, category: Task['category'], estimated: number): Task => ({
    id,
    title: `Task ${id}`,
    course: 'CS 101',
    dueDateTime: new Date().toISOString(),
    estimatedHours: estimated,
    priority: 'medium',
    category,
    completed: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const createSession = (id: string, taskId: string, hours: number): StopwatchSession => ({
    id,
    taskId,
    durationMs: hours * 3600 * 1000,
    durationFormatted: `${hours}:00:00`,
    createdAt: new Date().toISOString(),
  });

  it('returns null for category with fewer than 3 samples', () => {
    // Only 2 completed lab tasks
    const tasks: Task[] = [
      createCompletedTask('lab-1', 'lab', 2),
      createCompletedTask('lab-2', 'lab', 3),
    ];
    const sessions: StopwatchSession[] = [
      createSession('s-1', 'lab-1', 2.8),
      createSession('s-2', 'lab-2', 4.2),
    ];

    const calibrations = getCategoryCalibrations(tasks, sessions);
    expect(calibrations.lab).toBeNull();

    const suggestion = getCalibratedEstimateSuggestion('lab', 2.5, calibrations);
    expect(suggestion).toBeNull();
  });

  it('computes calibration ratio when at least 3 completed samples exist', () => {
    // 3 completed lab tasks with logged time:
    // Lab 1: est 2.0h, actual 2.8h (1.4x)
    // Lab 2: est 3.0h, actual 4.2h (1.4x)
    // Lab 3: est 2.5h, actual 3.5h (1.4x)
    // Total est = 7.5h, Total actual = 10.5h -> ratio = 1.4
    const tasks: Task[] = [
      createCompletedTask('lab-1', 'lab', 2),
      createCompletedTask('lab-2', 'lab', 3),
      createCompletedTask('lab-3', 'lab', 2.5),
    ];
    const sessions: StopwatchSession[] = [
      createSession('s-1', 'lab-1', 2.8),
      createSession('s-2', 'lab-2', 4.2),
      createSession('s-3', 'lab-3', 3.5),
    ];

    const calibrations = getCategoryCalibrations(tasks, sessions);
    expect(calibrations.lab).not.toBeNull();
    expect(calibrations.lab?.sampleCount).toBe(3);
    expect(calibrations.lab?.ratio).toBeCloseTo(1.4, 1);

    // Test suggestion for a new 2.5h estimate:
    // 2.5 * 1.4 = 3.5h
    const suggestion = getCalibratedEstimateSuggestion('lab', 2.5, calibrations);
    expect(suggestion).not.toBeNull();
    expect(suggestion?.suggestedHours).toBe(3.5);
    expect(suggestion?.ratio).toBeCloseTo(1.4, 1);
    expect(suggestion?.reason).toContain('Labs usually take about 1.4x');
  });

  it('ignores incomplete tasks in calibration calculation', () => {
    const tasks: Task[] = [
      createCompletedTask('lab-1', 'lab', 2),
      createCompletedTask('lab-2', 'lab', 2),
      { ...createCompletedTask('lab-3', 'lab', 2), completed: false }, // not completed!
    ];
    const sessions: StopwatchSession[] = [
      createSession('s-1', 'lab-1', 3),
      createSession('s-2', 'lab-2', 3),
      createSession('s-3', 'lab-3', 3),
    ];

    const calibrations = getCategoryCalibrations(tasks, sessions);
    // Only 2 completed samples, so ratio must be null
    expect(calibrations.lab).toBeNull();
  });

  it('does not suggest adjustment when user estimate is already accurate (ratio close to 1.0)', () => {
    const tasks: Task[] = [
      createCompletedTask('quiz-1', 'quiz', 1),
      createCompletedTask('quiz-2', 'quiz', 1),
      createCompletedTask('quiz-3', 'quiz', 1),
    ];
    const sessions: StopwatchSession[] = [
      createSession('s-1', 'quiz-1', 1.0),
      createSession('s-2', 'quiz-2', 1.05),
      createSession('s-3', 'quiz-3', 0.98),
    ];

    const calibrations = getCategoryCalibrations(tasks, sessions);
    expect(calibrations.quiz?.ratio).toBeCloseTo(1.0, 1);

    const suggestion = getCalibratedEstimateSuggestion('quiz', 1.0, calibrations);
    expect(suggestion).toBeNull();
  });
});
