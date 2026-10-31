export const WIND_DOWN_KEY = 'deadline_rescue_wind_down';
export const LATE_NIGHT_PROMPT_DATE_KEY = 'deadline_rescue_late_night_prompt_date';

export const DEFAULT_WIND_DOWN_TIME = '23:30';

/**
 * Valid wind-down options in 30-minute steps between 21:00 and 02:00.
 */
export const WIND_DOWN_OPTIONS = [
  { value: '21:00', label: '9:00 PM' },
  { value: '21:30', label: '9:30 PM' },
  { value: '22:00', label: '10:00 PM' },
  { value: '22:30', label: '10:30 PM' },
  { value: '23:00', label: '11:00 PM' },
  { value: '23:30', label: '11:30 PM (Recommended)' },
  { value: '00:00', label: '12:00 AM (Midnight)' },
  { value: '00:30', label: '12:30 AM' },
  { value: '01:00', label: '1:00 AM' },
  { value: '01:30', label: '1:30 AM' },
  { value: '02:00', label: '2:00 AM' },
];

/**
 * Returns the configured wind-down time (e.g. '23:30').
 */
export function getWindDownTime(): string {
  if (typeof localStorage === 'undefined') return DEFAULT_WIND_DOWN_TIME;
  try {
    const val = localStorage.getItem(WIND_DOWN_KEY);
    return val || DEFAULT_WIND_DOWN_TIME;
  } catch {
    return DEFAULT_WIND_DOWN_TIME;
  }
}

/**
 * Persists the user's preferred wind-down time.
 */
export function setWindDownTime(timeStr: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(WIND_DOWN_KEY, timeStr);
  } catch (e) {
    console.warn('Failed to save wind-down time:', e);
  }
}

/**
 * Checks whether the given date/time is between windDownTime and 05:00 AM.
 */
export function isLateNight(
  now: Date = new Date(),
  windDownTimeStr: string = getWindDownTime()
): boolean {
  const parts = windDownTimeStr.split(':');
  const windH = parseInt(parts[0], 10);
  const windM = parseInt(parts[1], 10);

  const currentH = now.getHours();
  const currentM = now.getMinutes();

  const currentMinutes = currentH * 60 + currentM;
  const windDownMinutes = windH * 60 + (isNaN(windM) ? 0 : windM);
  const morningCutoffMinutes = 5 * 60; // 05:00 AM

  if (windH >= 12) {
    // Evening start (e.g. 21:00 - 23:59)
    // Late night if >= wind-down OR < 05:00 morning
    return currentMinutes >= windDownMinutes || currentMinutes < morningCutoffMinutes;
  } else {
    // Post-midnight start (e.g. 01:00)
    // Late night if >= wind-down AND < 05:00 morning
    return currentMinutes >= windDownMinutes && currentMinutes < morningCutoffMinutes;
  }
}

/**
 * Generates an ISO calendar night key for the active late-night cycle.
 * For hours between 00:00 and 05:00, attributes the night to the preceding calendar day.
 */
export function getCalendarNightKey(now: Date = new Date()): string {
  const d = new Date(now);
  if (d.getHours() < 5) {
    d.setDate(d.getDate() - 1);
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Checks whether the late-night honesty prompt was already triggered tonight.
 */
export function hasShownLateNightPromptTonight(now: Date = new Date()): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const storedKey = localStorage.getItem(LATE_NIGHT_PROMPT_DATE_KEY);
    return storedKey === getCalendarNightKey(now);
  } catch {
    return false;
  }
}

/**
 * Marks the late-night prompt as triggered for tonight's session.
 */
export function markLateNightPromptShown(now: Date = new Date()): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LATE_NIGHT_PROMPT_DATE_KEY, getCalendarNightKey(now));
  } catch (e) {
    console.warn('Failed to mark late-night prompt shown:', e);
  }
}

/**
 * Clears the late-night prompt date state.
 */
export function clearLateNightPromptDate(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(LATE_NIGHT_PROMPT_DATE_KEY);
  } catch {
    // ignore
  }
}
