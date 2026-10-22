import { Task } from '../types';

export const CURRENT_STORAGE_VERSION = 2;
export const STORAGE_VERSION_KEY = 'deadline_rescue_schema_version';
export const TASKS_STORAGE_KEY = 'deadline_rescue_tasks_v2';
export const LEGACY_TASKS_KEY = 'deadline_rescue_tasks_v1';
export const SESSIONS_STORAGE_KEY = 'deadline_rescue_stopwatch_sessions_v1';

/**
 * Migrates localStorage data safely to the current schema version without data loss.
 * Preserves legacy user tasks and sessions.
 */
export function migrateStorage(): void {
  try {
    const versionStr = localStorage.getItem(STORAGE_VERSION_KEY);
    const version = versionStr ? parseInt(versionStr, 10) : 1;

    if (version < 2) {
      // Migrate v1 tasks to v2
      const legacyData = localStorage.getItem(LEGACY_TASKS_KEY);
      if (legacyData) {
        try {
          const parsed = JSON.parse(legacyData);
          if (Array.isArray(parsed)) {
            const sanitizedTasks: Task[] = parsed.map((t: any) => ({
              id: t.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              title: typeof t.title === 'string' ? t.title : 'Untitled Task',
              course: typeof t.course === 'string' ? t.course : 'GENERAL',
              dueDateTime: t.dueDateTime || new Date().toISOString(),
              estimatedHours: typeof t.estimatedHours === 'number' && t.estimatedHours >= 0 ? t.estimatedHours : 1,
              priority: ['urgent', 'high', 'medium', 'low'].includes(t.priority) ? t.priority : 'medium',
              category: ['assignment', 'exam', 'reading', 'project', 'quiz', 'lab', 'other'].includes(t.category)
                ? t.category
                : 'assignment',
              notes: typeof t.notes === 'string' ? t.notes : '',
              completed: Boolean(t.completed),
              completedAt: t.completedAt,
              createdAt: t.createdAt || new Date().toISOString(),
              updatedAt: t.updatedAt || new Date().toISOString(),
            }));
            localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(sanitizedTasks));
          }
        } catch (e) {
          console.warn('Could not migrate legacy tasks, preserving raw data:', e);
        }
      }
      localStorage.setItem(STORAGE_VERSION_KEY, String(CURRENT_STORAGE_VERSION));
    }
  } catch (err) {
    // localStorage might be unavailable (e.g. private mode or sandbox)
    console.warn('Storage migration skipped or unavailable:', err);
  }
}
