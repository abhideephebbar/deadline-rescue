export const STARTER_STATS_KEY = 'deadline_rescue_starter_stats';

export interface StarterStatEntry {
  timestamp: number;
}

/**
 * Increments and persists a completed 5-minute starter session.
 */
export function recordCompletedStarterStart(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const existing = getStarterStatsEntries();
    const updated = [...existing, { timestamp: Date.now() }];
    localStorage.setItem(STARTER_STATS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to record starter start:', e);
  }
}

/**
 * Returns raw timestamp entries for completed starter sessions.
 */
export function getStarterStatsEntries(): StarterStatEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STARTER_STATS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => typeof item.timestamp === 'number');
  } catch {
    return [];
  }
}

/**
 * Calculates completed 5-minute starts in the last 7 days.
 */
export function getStarterStartsThisWeek(now: Date = new Date()): number {
  const entries = getStarterStatsEntries();
  const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  return entries.filter((e) => e.timestamp >= sevenDaysAgo).length;
}

/**
 * Wipes starter stats history.
 */
export function clearStarterStats(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STARTER_STATS_KEY);
  } catch {
    // ignore
  }
}
