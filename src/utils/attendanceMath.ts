import { SubjectAttendance } from '../types';

export const ATTENDANCE_STORAGE_KEY = 'deadline_rescue_attendance';

export interface AttendanceStats {
  currentPct: number | null; // e.g. 74
  formattedPct: string; // "74%" or "—"
  canMiss: number;
  needToAttend: number;
  isBelowThreshold: boolean;
  unrecoverable: boolean;
  maxPossiblePct?: number;
  status: 'safe' | 'warning' | 'danger' | 'unrecoverable';
  summaryText: string;
  honestNotice?: string;
}

/**
 * Validates and clamps attendance record ensuring 0 <= attended <= held.
 */
export function clampAttendance(
  held: number,
  attended: number,
  classesLeft?: number
): { held: number; attended: number; classesLeft?: number } {
  const safeHeld = Math.max(0, Math.floor(Number(held) || 0));
  const safeAttended = Math.max(0, Math.min(safeHeld, Math.floor(Number(attended) || 0)));
  const safeLeft =
    typeof classesLeft === 'number' && !isNaN(classesLeft)
      ? Math.max(0, Math.floor(classesLeft))
      : undefined;

  return {
    held: safeHeld,
    attended: safeAttended,
    classesLeft: safeLeft,
  };
}

/**
 * Pure function that calculates attendance safety, skip headroom, and recovery goals.
 * Percentages are ALWAYS rounded down to avoid inflating safety.
 */
export function calculateAttendanceStats(subject: SubjectAttendance): AttendanceStats {
  const { held, attended, classesLeft } = clampAttendance(
    subject.classesHeld,
    subject.classesAttended,
    subject.classesLeft
  );
  const thresholdPct = Number(subject.thresholdPct) || 75;
  const threshold = thresholdPct / 100;

  if (held === 0) {
    return {
      currentPct: null,
      formattedPct: '—',
      canMiss: 0,
      needToAttend: 0,
      isBelowThreshold: false,
      unrecoverable: false,
      status: 'safe',
      summaryText: 'safe for now',
    };
  }

  // Round down conservative calculation: 74.6% -> 74%
  const currentPct = Math.floor((attended / held) * 100);
  const formattedPct = `${currentPct}%`;

  // Check if structurally unrecoverable given remaining classes
  if (typeof classesLeft === 'number' && classesLeft >= 0) {
    const totalHeldEnd = held + classesLeft;
    if (totalHeldEnd > 0) {
      const maxAttended = attended + classesLeft;
      const maxPossiblePct = Math.floor((maxAttended / totalHeldEnd) * 100);
      if (maxPossiblePct < thresholdPct) {
        const needToAttend = Math.max(0, Math.ceil((threshold * held - attended) / (1 - threshold)));
        return {
          currentPct,
          formattedPct,
          canMiss: 0,
          needToAttend,
          isBelowThreshold: true,
          unrecoverable: true,
          maxPossiblePct,
          status: 'unrecoverable',
          summaryText: `max ${maxPossiblePct}%`,
          honestNotice: `Even attending every remaining class lands you at ${maxPossiblePct}%. Worth talking to your faculty early — before it becomes an exam-bar problem.`,
        };
      }
    }
  }

  if (currentPct < thresholdPct) {
    const needToAttend = Math.max(0, Math.ceil((threshold * held - attended) / (1 - threshold)));
    return {
      currentPct,
      formattedPct,
      canMiss: 0,
      needToAttend,
      isBelowThreshold: true,
      unrecoverable: false,
      status: 'danger',
      summaryText: needToAttend > 0 ? `attend next ${needToAttend} to be safe` : 'attend next class',
    };
  }

  // Current attendance is at or above threshold
  const canMiss = Math.max(0, Math.floor(attended / threshold - held));
  return {
    currentPct,
    formattedPct,
    canMiss,
    needToAttend: 0,
    isBelowThreshold: false,
    unrecoverable: false,
    status: canMiss === 0 ? 'warning' : 'safe',
    summaryText: canMiss > 0 ? `can skip ${canMiss}` : 'safe for now',
  };
}

/**
 * Sorts subjects by risk: below threshold / unrecoverable first, then fewest can-miss.
 */
export function sortSubjectsByRisk(subjects: SubjectAttendance[]): SubjectAttendance[] {
  return [...subjects].sort((a, b) => {
    const statsA = calculateAttendanceStats(a);
    const statsB = calculateAttendanceStats(b);

    if (statsA.isBelowThreshold && !statsB.isBelowThreshold) return -1;
    if (!statsA.isBelowThreshold && statsB.isBelowThreshold) return 1;

    if (statsA.isBelowThreshold && statsB.isBelowThreshold) {
      if (statsA.unrecoverable && !statsB.unrecoverable) return -1;
      if (!statsA.unrecoverable && statsB.unrecoverable) return 1;
      return statsB.needToAttend - statsA.needToAttend;
    }

    if (statsA.canMiss !== statsB.canMiss) {
      return statsA.canMiss - statsB.canMiss;
    }

    return (statsA.currentPct ?? 0) - (statsB.currentPct ?? 0);
  });
}

/**
 * Reads attendance records from localStorage.
 */
export function getStoredAttendance(): SubjectAttendance[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => {
      const { held, attended, classesLeft } = clampAttendance(
        item.classesHeld,
        item.classesAttended,
        item.classesLeft
      );
      return {
        id: item.id || `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: typeof item.name === 'string' ? item.name : 'Subject',
        code: typeof item.code === 'string' ? item.code : undefined,
        thresholdPct: typeof item.thresholdPct === 'number' ? item.thresholdPct : 75,
        classesHeld: held,
        classesAttended: attended,
        classesLeft,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Persists attendance records to localStorage.
 */
export function saveStoredAttendance(subjects: SubjectAttendance[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(subjects));
  } catch (e) {
    console.warn('Failed to save attendance records:', e);
  }
}

/**
 * Wipes attendance records.
 */
export function clearStoredAttendance(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(ATTENDANCE_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear attendance records:', e);
  }
}
