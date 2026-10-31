import { describe, it, expect, beforeEach } from 'vitest';
import { Task, StopwatchSession } from '../../types';
import {
  getCategoryCalibrations,
  resetCalibration,
  clearCalibrationExclusions,
  getCalibrationExclusions,
  CALIBRATION_EXCLUSIONS_KEY,
} from '../calibration';
import { calculateDailyLoads, DEFAULT_CAPACITY_SETTINGS } from '../capacity';

function createLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

describe('Phase 6: Wire Calibration into Planning & Forecast Demand', () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: Storage }).localStorage = createLocalStorageMock() as unknown as Storage;
    clearCalibrationExclusions();
  });

  const baseDate = new Date('2026-10-31T09:00:00Z');

  // Create 3 completed labs where estimated was 2h and actual was 3h each (ratio = 1.5)
  const completedLabTasks: Task[] = [
    {
      id: 'lab-1',
      title: 'Lab 1',
      course: 'CS 101',
      dueDateTime: new Date('2026-10-20T17:00:00Z').toISOString(),
      estimatedHours: 2,
      priority: 'medium',
      category: 'lab',
      completed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'lab-2',
      title: 'Lab 2',
      course: 'CS 101',
      dueDateTime: new Date('2026-10-22T17:00:00Z').toISOString(),
      estimatedHours: 2,
      priority: 'medium',
      category: 'lab',
      completed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'lab-3',
      title: 'Lab 3',
      course: 'CS 101',
      dueDateTime: new Date('2026-10-25T17:00:00Z').toISOString(),
      estimatedHours: 2,
      priority: 'medium',
      category: 'lab',
      completed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const labSessions: StopwatchSession[] = [
    {
      id: 's-1',
      taskId: 'lab-1',
      durationMs: 3 * 3600 * 1000, // 3h
      durationFormatted: '03:00:00',
      createdAt: new Date().toISOString(),
    },
    {
      id: 's-2',
      taskId: 'lab-2',
      durationMs: 3 * 3600 * 1000, // 3h
      durationFormatted: '03:00:00',
      createdAt: new Date().toISOString(),
    },
    {
      id: 's-3',
      taskId: 'lab-3',
      durationMs: 3 * 3600 * 1000, // 3h
      durationFormatted: '03:00:00',
      createdAt: new Date().toISOString(),
    },
  ];

  it('adjusts forecast demand when category has >= 3 completed samples with calibration ratio', () => {
    const calibrations = getCategoryCalibrations(completedLabTasks, labSessions);
    expect(calibrations.lab).not.toBeNull();
    expect(calibrations.lab?.sampleCount).toBe(3);
    expect(calibrations.lab?.ratio).toBe(1.5);

    // Upcoming lab due today, 4h estimate
    const upcomingTask: Task = {
      id: 'upcoming-lab',
      title: 'Operating Systems Lab 4',
      course: 'CS 350',
      dueDateTime: new Date('2026-10-31T18:00:00Z').toISOString(),
      estimatedHours: 4,
      priority: 'high',
      category: 'lab',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Uncalibrated demand: 4h
    const uncalibratedLoads = calculateDailyLoads([upcomingTask], DEFAULT_CAPACITY_SETTINGS, baseDate, 1);
    expect(uncalibratedLoads[0].demandHours).toBe(4);

    // Calibrated demand: 4h * 1.5 = 6.0h
    const calibratedLoads = calculateDailyLoads(
      [upcomingTask],
      DEFAULT_CAPACITY_SETTINGS,
      baseDate,
      1,
      calibrations
    );
    expect(calibratedLoads[0].demandHours).toBe(6.0);
  });

  it('maintains strict neutrality when category has < 3 samples', () => {
    // Only 2 completed assignments
    const completedAssignments: Task[] = completedLabTasks.slice(0, 2).map((t) => ({
      ...t,
      category: 'assignment',
    }));

    const calibrations = getCategoryCalibrations(completedAssignments, labSessions.slice(0, 2));
    expect(calibrations.assignment).toBeNull();

    const upcomingAssignment: Task = {
      id: 'upcoming-assignment',
      title: 'Problem Set 3',
      course: 'MATH 200',
      dueDateTime: new Date('2026-10-31T18:00:00Z').toISOString(),
      estimatedHours: 3,
      priority: 'high',
      category: 'assignment',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const loads = calculateDailyLoads(
      [upcomingAssignment],
      DEFAULT_CAPACITY_SETTINGS,
      baseDate,
      1,
      calibrations
    );
    // Neutral estimate: exactly 3h
    expect(loads[0].demandHours).toBe(3);
  });

  it('resets calibration and excludes category, restoring uncalibrated demand', () => {
    // Before reset: lab is calibrated at 1.5
    let calibrations = getCategoryCalibrations(completedLabTasks, labSessions);
    expect(calibrations.lab).not.toBeNull();

    // Reset calibration for labs
    resetCalibration('lab');
    expect(getCalibrationExclusions()).toContain('lab');
    expect(localStorage.getItem(CALIBRATION_EXCLUSIONS_KEY)).toContain('lab');

    // After reset: lab is excluded
    calibrations = getCategoryCalibrations(completedLabTasks, labSessions);
    expect(calibrations.lab).toBeNull();

    const upcomingTask: Task = {
      id: 'upcoming-lab',
      title: 'Operating Systems Lab 4',
      course: 'CS 350',
      dueDateTime: new Date('2026-10-31T18:00:00Z').toISOString(),
      estimatedHours: 4,
      priority: 'high',
      category: 'lab',
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const loads = calculateDailyLoads(
      [upcomingTask],
      DEFAULT_CAPACITY_SETTINGS,
      baseDate,
      1,
      calibrations
    );
    // Restored to uncalibrated estimate 4h
    expect(loads[0].demandHours).toBe(4);

    // Clear exclusions restores learning
    clearCalibrationExclusions();
    calibrations = getCategoryCalibrations(completedLabTasks, labSessions);
    expect(calibrations.lab?.ratio).toBe(1.5);
  });
});
