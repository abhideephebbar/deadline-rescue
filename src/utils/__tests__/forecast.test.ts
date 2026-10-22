import { describe, it, expect } from 'vitest';
import { simulateTaskDelay } from '../forecast';
import { DEFAULT_CAPACITY_SETTINGS } from '../capacity';
import { Task } from '../../types';

describe('7-Day Workload Forecast & Delay Simulator', () => {
  // Use local Date constructor (year, monthIndex, day, hour) to ensure 100% timezone-independent test execution
  const baseDate = new Date(2026, 9, 26, 8, 0, 0); // Monday Oct 26, 2026 8:00 AM local

  const createMockTasks = (): Task[] => [
    {
      id: 'task-heavy-mon',
      title: 'Operating Systems Kernel Lab',
      course: 'CS 350',
      // Originally due Thursday Oct 29, but work allocated to Monday
      dueDateTime: new Date(2026, 9, 26, 14, 0, 0).toISOString(),
      estimatedHours: 5,
      priority: 'urgent',
      category: 'lab',
      completed: false,
      createdAt: baseDate.toISOString(),
      updatedAt: baseDate.toISOString(),
    },
    {
      id: 'task-light-mon',
      title: 'Short Reading Quiz',
      course: 'HIST 101',
      dueDateTime: new Date(2026, 9, 26, 20, 0, 0).toISOString(), // Due Monday evening
      estimatedHours: 1,
      priority: 'low',
      category: 'reading',
      completed: false,
      createdAt: baseDate.toISOString(),
      updatedAt: baseDate.toISOString(),
    },
    {
      id: 'task-tue',
      title: 'Calculus Problem Set',
      course: 'MATH 220',
      dueDateTime: new Date(2026, 9, 27, 20, 0, 0).toISOString(), // Due Tuesday evening
      estimatedHours: 2,
      priority: 'high',
      category: 'assignment',
      completed: false,
      createdAt: baseDate.toISOString(),
      updatedAt: baseDate.toISOString(),
    },
  ];

  it('correctly shifts demand from source day to target day', () => {
    const tasks = createMockTasks();
    const taskToDelay = tasks[0]; // 5h lab on Monday

    const result = simulateTaskDelay(taskToDelay, 1, tasks, DEFAULT_CAPACITY_SETTINGS, baseDate);

    // Monday originally had 5h + 1h = 6h (overloaded with 4h capacity)
    // After moving 5h to Tuesday, Monday has 1h
    const mondayLoad = result.simulatedLoads[0];
    expect(mondayLoad.demandHours).toBe(1);
    expect(mondayLoad.status).toBe('clear');

    // Tuesday originally had 2h (capacity 4h). Now has 2h + 5h = 7h (overloaded!)
    const tuesdayLoad = result.simulatedLoads[1];
    expect(tuesdayLoad.demandHours).toBe(7);
    expect(tuesdayLoad.status).toBe('overloaded');
  });

  it('generates a one-sentence consequence explaining the shift and overload', () => {
    // Task with deadline later in week (Thursday) delayed to Tuesday
    const tasks = createMockTasks();
    tasks[0].dueDateTime = new Date(2026, 9, 29, 23, 59, 0).toISOString();
    // But force it into Monday's day
    const taskToDelay = {
      ...tasks[0],
      dueDateTime: new Date(2026, 9, 26, 12, 0, 0).toISOString(),
    };
    tasks[0] = taskToDelay;

    // Simulate delaying it to Tuesday (before original Thursday deadline)
    const result = simulateTaskDelay(
      { ...taskToDelay, dueDateTime: new Date(2026, 9, 29, 23, 59, 0).toISOString() },
      1,
      tasks,
      DEFAULT_CAPACITY_SETTINGS,
      baseDate
    );

    expect(typeof result.consequenceSentence).toBe('string');
    expect(result.consequenceSentence.length).toBeGreaterThan(20);
    expect(result.consequenceSentence).toContain('relieves');
    expect(result.consequenceSentence).toContain('overloads');
  });

  it('warns in the consequence sentence when delay pushes past original deadline', () => {
    const tasks = createMockTasks();
    const taskToDelay = tasks[1]; // Due Monday evening

    // Simulating delay by 4 days to Friday
    const result = simulateTaskDelay(taskToDelay, 4, tasks, DEFAULT_CAPACITY_SETTINGS, baseDate);

    expect(result.missesDeadline).toBe(true);
    expect(result.consequenceSentence).toContain('misses your scheduled deadline');
  });
});
