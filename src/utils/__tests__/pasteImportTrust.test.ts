import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseTasksWithFallback } from '../importService';
import { parseCourseworkText, extractCourseCode } from '../importParser';
import { getCategoryDefaults, saveCategoryDefaults, resetCategoryDefaults, DEFAULT_CATEGORY_HOURS } from '../categoryDefaults';
import { calculateDailyLoads } from '../capacity';
import { CapacitySettings, Task } from '../../types';

const WHATSAPP_FIXTURE =
  'hey guys prof said DBMS assignment 3 is due 28th oct 11:59pm submit on portal, also DS lab record full check on friday. CT-2 math is on 30th chapters 3-5. someone said quiz next monday too not sure which subject';

const createLocalStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
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
};

describe('Phase 3: Paste-Import Trust', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.localStorage = createLocalStorageMock() as any;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('code-free input yields zero fabricated codes and preserves exact courses when parsed with Gemini API', async () => {
    const mockApiResponse = {
      tasks: [
        {
          title: 'Assignment 3',
          course: 'DBMS',
          dueDateTime: '2026-10-28T23:59:00.000Z',
          estimatedHours: 2.0,
          priority: 'medium',
          category: 'assignment',
          notes: 'submit on portal',
          uncertain: false,
        },
        {
          title: 'Lab Record Full Check',
          course: 'DS',
          dueDateTime: '2026-10-30T23:59:00.000Z',
          estimatedHours: 3.5,
          priority: 'high',
          category: 'lab',
          notes: 'full check',
          uncertain: false,
        },
        {
          title: 'CT-2 Math',
          course: 'MATH',
          dueDateTime: '2026-10-30T23:59:00.000Z',
          estimatedHours: 4.5,
          priority: 'urgent',
          category: 'exam',
          notes: 'chapters 3-5',
          uncertain: false,
        },
        {
          title: 'Quiz',
          course: 'GENERAL',
          dueDateTime: '2026-11-02T23:59:00.000Z',
          estimatedHours: 0.75,
          priority: 'medium',
          category: 'quiz',
          notes: 'not sure which subject',
          uncertain: true,
        },
      ],
      source: 'gemini',
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    } as any);

    const result = await parseTasksWithFallback(WHATSAPP_FIXTURE, new Date('2026-10-26T10:00:00Z'));

    expect(result.tasks.length).toBe(4);

    // Verify zero fabricated codes (no CS 302, CS 201)
    const courses = result.tasks.map((t) => t.course);
    expect(courses).not.toContain('CS 302');
    expect(courses).not.toContain('CS 201');
    expect(courses).toContain('DBMS');
    expect(courses).toContain('DS');
    expect(courses).toContain('MATH');
    expect(courses).toContain('GENERAL');

    // Verify scope notes captured
    const notesJoined = result.tasks.map((t) => t.notes).join(' ');
    expect(notesJoined).toContain('submit on portal');
    expect(notesJoined).toContain('chapters 3-5');

    // Verify uncertainty flag
    const hedgedTask = result.tasks.find((t) => t.title.toLowerCase().includes('quiz'));
    expect(hedgedTask).toBeDefined();
    expect(hedgedTask?.uncertain).toBe(true);

    const dbmsTask = result.tasks.find((t) => t.course === 'DBMS');
    expect(dbmsTask?.uncertain).toBe(false);
  });

  it('offline rule-based parser handles WhatsApp fixture without fabricating codes', () => {
    const parsed = parseCourseworkText(WHATSAPP_FIXTURE, new Date('2026-10-26T10:00:00Z'));

    expect(parsed.length).toBeGreaterThanOrEqual(3);

    const courses = parsed.map((t) => t.course);
    expect(courses).not.toContain('CS 302');
    expect(courses).not.toContain('CS 201');

    // Should detect DBMS or DS
    expect(courses.some((c) => c === 'DBMS' || c === 'DS')).toBe(true);

    // Hedged item should have uncertain: true
    const uncertainItem = parsed.find((t) => t.uncertain);
    expect(uncertainItem).toBeDefined();
    expect(uncertainItem?.title.toLowerCase() + ' ' + uncertainItem?.notes.toLowerCase()).toMatch(/not sure|someone said/);
  });

  it('extractCourseCode never invents fictitious codes', () => {
    expect(extractCourseCode('DBMS assignment 3').code).toBe('DBMS');
    expect(extractCourseCode('DS lab record').code).toBe('DS');
    expect(extractCourseCode('someone said quiz next monday').code).toBe('GENERAL');
    expect(extractCourseCode('CS 350 lab').code).toBe('CS 350');
  });

  it('honors per-category prep time defaults and allows customizing', () => {
    const defaults = getCategoryDefaults();
    expect(defaults.quiz).toBe(0.75);
    expect(defaults.assignment).toBe(2.0);
    expect(defaults.lab).toBe(3.0);
    expect(defaults.exam).toBe(4.0);
    expect(defaults.reading).toBe(1.0);

    saveCategoryDefaults({ quiz: 1.5, lab: 4.0 });
    const updated = getCategoryDefaults();
    expect(updated.quiz).toBe(1.5);
    expect(updated.lab).toBe(4.0);
    expect(updated.assignment).toBe(2.0); // unchanged

    resetCategoryDefaults();
    const reset = getCategoryDefaults();
    expect(reset.quiz).toBe(DEFAULT_CATEGORY_HOURS.quiz);
    expect(reset.lab).toBe(DEFAULT_CATEGORY_HOURS.lab);
  });

  it('calculates post-import capacity correctly and identifies overloaded day', () => {
    const capacitySettings: CapacitySettings = {
      dailyWorkHours: { mon: 4, tue: 4, wed: 4, thu: 4, fri: 4, sat: 4, sun: 4 },
      blockedSlots: [],
    };

    // Use local time constructor so it stays on Friday in any timezone
    const now = new Date(2026, 9, 26, 10, 0, 0); // Monday Oct 26
    const wednesdayDue = new Date(2026, 9, 28, 23, 59, 0); // Wednesday Oct 28
    const fridayDue = new Date(2026, 9, 30, 23, 59, 0); // Friday Oct 30

    const importedTasks: Task[] = [
      {
        id: '1',
        title: 'Huge Friday Lab',
        course: 'DS',
        dueDateTime: fridayDue.toISOString(), // Friday
        estimatedHours: 8,
        priority: 'urgent',
        category: 'lab',
        completed: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: '2',
        title: 'Wednesday Quiz',
        course: 'DBMS',
        dueDateTime: wednesdayDue.toISOString(), // Wednesday
        estimatedHours: 2,
        priority: 'medium',
        category: 'quiz',
        completed: false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    ];

    const loads = calculateDailyLoads(importedTasks, capacitySettings, now, 7);
    const totalDemand = Math.round(loads.reduce((s, d) => s + d.demandHours, 0) * 10) / 10;
    const totalCapacity = Math.round(loads.reduce((s, d) => s + d.capacityHours, 0) * 10) / 10;

    expect(totalDemand).toBe(10);
    expect(totalCapacity).toBe(28);

    const overloaded = loads.find((d) => d.status === 'overloaded');
    expect(overloaded).toBeDefined();
    expect(overloaded?.dayOfWeek).toBe('fri');
    expect(overloaded?.demandHours).toBe(8);
    expect(overloaded?.capacityHours).toBe(4);
  });
});
