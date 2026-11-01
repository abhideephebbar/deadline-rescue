import { AppFacts } from './facts';
import { WeatherData } from './weather';

export const NAME_STORAGE_KEY = 'deadline_rescue_name';
export const NAME_SKIPPED_KEY = 'deadline_rescue_name_skipped';
export const LAST_SHOWN_ID_KEY = 'deadline_rescue_greeting_last_id';
export const FIRST_VISIT_STORAGE_KEY = 'deadline_rescue_first_visit_seen';

export type GreetingActionType =
  | 'paste'
  | 'add'
  | 'tour'
  | 'start_top'
  | 'plan_week'
  | 'swamped';

export interface GreetingActionChip {
  id: string;
  label: string;
  action: GreetingActionType;
  taskId?: string;
}

export type TimeBucket =
  | 'late_night'
  | 'early_morning'
  | 'morning'
  | 'afternoon'
  | 'evening'
  | 'night';

export type GreetingIconType =
  | 'sun'
  | 'moon'
  | 'sunrise'
  | 'sunset'
  | 'cloud'
  | 'cloud-rain'
  | 'cloud-lightning'
  | 'snowflake'
  | 'cloud-fog';

export interface HeadlineDef {
  id: string;
  format: (name?: string) => string;
}

export interface PickGreetingOptions {
  now?: Date;
  name?: string | null;
  weather?: WeatherData | null;
  facts: AppFacts;
  lastShownId?: string | null;
  seed?: number;
}

export interface GreetingResult {
  id: string;
  headline: string;
  subline: string;
  icon: GreetingIconType;
  chips: GreetingActionChip[];
  category: 'time' | 'weather' | 'day';
}

/**
 * Sanitizes a user-provided name: strips HTML, control characters, trims, and truncates to 24 chars.
 */
export function sanitizeGreetingName(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  const noHtml = raw.replace(/<[^>]*>/g, '');
  const noControl = noHtml.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  return noControl.trim().slice(0, 24);
}

function getStorage(storage?: Storage): Storage | undefined {
  if (storage) return storage;
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (typeof localStorage !== 'undefined') return localStorage;
  return undefined;
}

/**
 * Reads the stored name from localStorage.
 */
export function getStoredName(storage?: Storage): string | null {
  try {
    const s = getStorage(storage);
    if (!s) return null;
    const val = s.getItem(NAME_STORAGE_KEY);
    return val ? sanitizeGreetingName(val) : null;
  } catch {
    return null;
  }
}

/**
 * Stores the user's name in localStorage.
 */
export function setStoredName(name: string, storage?: Storage): void {
  try {
    const s = getStorage(storage);
    if (!s) return;
    const clean = sanitizeGreetingName(name);
    if (clean) {
      s.setItem(NAME_STORAGE_KEY, clean);
      s.removeItem(NAME_SKIPPED_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Checks if the user skipped entering their name.
 */
export function isNameSkipped(storage?: Storage): boolean {
  try {
    const s = getStorage(storage);
    if (!s) return false;
    return s.getItem(NAME_SKIPPED_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Sets or clears the name skipped flag.
 */
export function setNameSkipped(skipped: boolean, storage?: Storage): void {
  try {
    const s = getStorage(storage);
    if (!s) return;
    if (skipped) {
      s.setItem(NAME_SKIPPED_KEY, 'true');
    } else {
      s.removeItem(NAME_SKIPPED_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Clears stored name and skipped status.
 */
export function clearStoredName(storage?: Storage): void {
  try {
    const s = getStorage(storage);
    if (!s) return;
    s.removeItem(NAME_STORAGE_KEY);
    s.removeItem(NAME_SKIPPED_KEY);
  } catch {
    // ignore
  }
}

/**
 * Gets the last shown greeting ID.
 */
export function getStoredLastShownId(storage?: Storage): string | null {
  try {
    const s = getStorage(storage);
    if (!s) return null;
    return s.getItem(LAST_SHOWN_ID_KEY);
  } catch {
    return null;
  }
}

/**
 * Persists the last shown greeting ID.
 */
export function setStoredLastShownId(id: string, storage?: Storage): void {
  try {
    const s = getStorage(storage);
    if (!s) return;
    s.setItem(LAST_SHOWN_ID_KEY, id);
  } catch {
    // ignore
  }
}

/**
 * Checks if first visit has occurred.
 */
export function isFirstVisit(storage?: Storage): boolean {
  try {
    const s = getStorage(storage);
    if (!s) return false;
    return s.getItem(FIRST_VISIT_STORAGE_KEY) !== 'true';
  } catch {
    return false;
  }
}

/**
 * Marks that the first visit has occurred.
 */
export function markFirstVisitSeen(storage?: Storage): void {
  try {
    const s = getStorage(storage);
    if (!s) return;
    s.setItem(FIRST_VISIT_STORAGE_KEY, 'true');
  } catch {
    // ignore
  }
}

/**
 * Pure Mulberry32 PRNG returning deterministic numbers in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Maps hour (0-23) to one of the 6 time buckets:
 * 00-04: late_night
 * 05-08: early_morning
 * 09-11: morning
 * 12-16: afternoon
 * 17-20: evening
 * 21-23: night
 */
export function getTimeBucket(hour: number): TimeBucket {
  if (hour >= 0 && hour <= 4) return 'late_night';
  if (hour >= 5 && hour <= 8) return 'early_morning';
  if (hour >= 9 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 16) return 'afternoon';
  if (hour >= 17 && hour <= 20) return 'evening';
  return 'night';
}

function makeHeadline(
  id: string,
  withName: (name: string) => string,
  withoutName: string
): HeadlineDef {
  return {
    id,
    format: (name?: string) => {
      const clean = name?.trim();
      return clean ? withName(clean) : withoutName;
    },
  };
}

export const TIME_HEADLINES: Record<TimeBucket, HeadlineDef[]> = {
  late_night: [
    makeHeadline('late_night_1', (n) => `Late one, ${n}. Let's keep it light.`, "Late one. Let's keep it light."),
    makeHeadline('late_night_2', (n) => `Quiet hours, ${n}.`, 'Quiet hours.'),
    makeHeadline('late_night_3', (n) => `Still up, ${n}?`, 'Still up?'),
    makeHeadline('late_night_4', (n) => `Night owl mode, ${n}.`, 'Night owl mode.'),
    makeHeadline('late_night_5', (n) => `Easy does it tonight, ${n}.`, 'Easy does it tonight.'),
    makeHeadline('late_night_6', (n) => `Winding down, ${n}.`, 'Winding down.'),
    makeHeadline('late_night_7', (n) => `Late check-in, ${n}. Keep it gentle.`, 'Late check-in. Keep it gentle.'),
  ],
  early_morning: [
    makeHeadline('early_morning_1', (n) => `Early start, ${n}.`, 'Early start.'),
    makeHeadline('early_morning_2', (n) => `Up before the rush, ${n}.`, 'Up before the rush.'),
    makeHeadline('early_morning_3', (n) => `Fresh morning air, ${n}.`, 'Fresh morning air.'),
    makeHeadline('early_morning_4', (n) => `Quiet morning, ${n}.`, 'Quiet morning.'),
    makeHeadline('early_morning_5', (n) => `First light, ${n}. One step at a time.`, 'First light. One step at a time.'),
    makeHeadline('early_morning_6', (n) => `Bright and early, ${n}.`, 'Bright and early.'),
    makeHeadline('early_morning_7', (n) => `Morning calm, ${n}.`, 'Morning calm.'),
  ],
  morning: [
    makeHeadline('morning_1', (n) => `Good morning, ${n}.`, 'Good morning.'),
    makeHeadline('morning_2', (n) => `Back at it, ${n}.`, 'Back at it.'),
    makeHeadline('morning_3', (n) => `Fresh start today, ${n}.`, 'Fresh start today.'),
    makeHeadline('morning_4', (n) => `Ready when you are, ${n}.`, 'Ready when you are.'),
    makeHeadline('morning_5', (n) => `Welcome back, ${n}.`, 'Welcome back.'),
    makeHeadline('morning_6', (n) => `Good to see you, ${n}.`, 'Good to see you.'),
    makeHeadline('morning_7', (n) => `New day ahead, ${n}.`, 'New day ahead.'),
  ],
  afternoon: [
    makeHeadline('afternoon_1', (n) => `Good afternoon, ${n}.`, 'Good afternoon.'),
    makeHeadline('afternoon_2', (n) => `Midday check-in, ${n}.`, 'Midday check-in.'),
    makeHeadline('afternoon_3', (n) => `Keeping the momentum, ${n}.`, 'Keeping the momentum.'),
    makeHeadline('afternoon_4', (n) => `Afternoon focus, ${n}.`, 'Afternoon focus.'),
    makeHeadline('afternoon_5', (n) => `Stepping back in, ${n}.`, 'Stepping back in.'),
    makeHeadline('afternoon_6', (n) => `Halfway through the day, ${n}.`, 'Halfway through the day.'),
    makeHeadline('afternoon_7', (n) => `One task at a time, ${n}.`, 'One task at a time.'),
  ],
  evening: [
    makeHeadline('evening_1', (n) => `Good evening, ${n}.`, 'Good evening.'),
    makeHeadline('evening_2', (n) => `Evening, ${n}.`, 'Evening.'),
    makeHeadline('evening_3', (n) => `Winding down the day, ${n}.`, 'Winding down the day.'),
    makeHeadline('evening_4', (n) => `Time to wrap things up, ${n}.`, 'Time to wrap things up.'),
    makeHeadline('evening_5', (n) => `Almost done for today, ${n}.`, 'Almost done for today.'),
    makeHeadline('evening_6', (n) => `Sunset hours, ${n}.`, 'Sunset hours.'),
    makeHeadline('evening_7', (n) => `Settling in for the evening, ${n}.`, 'Settling in for the evening.'),
  ],
  night: [
    makeHeadline('night_1', (n) => `Good night, ${n}.`, 'Good night.'),
    makeHeadline('night_2', (n) => `Late evening, ${n}.`, 'Late evening.'),
    makeHeadline('night_3', (n) => `Wrapping up tonight, ${n}.`, 'Wrapping up tonight.'),
    makeHeadline('night_4', (n) => `Night hours, ${n}. Keep it brief.`, 'Night hours. Keep it brief.'),
    makeHeadline('night_5', (n) => `Almost bedtime, ${n}.`, 'Almost bedtime.'),
    makeHeadline('night_6', (n) => `Quiet night ahead, ${n}.`, 'Quiet night ahead.'),
    makeHeadline('night_7', (n) => `Time to wind down soon, ${n}.`, 'Time to wind down soon.'),
  ],
};

export const DAY_HEADLINES = {
  monday: [
    makeHeadline('day_monday_1', (n) => `Fresh week, ${n}.`, 'Fresh week.'),
    makeHeadline('day_monday_2', (n) => `New week, fresh start, ${n}.`, 'New week, fresh start.'),
  ],
  friday: [
    makeHeadline('day_friday_1', (n) => `Almost the weekend, ${n}.`, 'Almost the weekend.'),
    makeHeadline('day_friday_2', (n) => `Friday check-in, ${n}.`, 'Friday check-in.'),
  ],
  sunday_evening: [
    makeHeadline(
      'day_sunday_eve_1',
      (n) => `Sunday evening. Let's set up the week, ${n}.`,
      "Sunday evening. Let's set up the week."
    ),
    makeHeadline(
      'day_sunday_eve_2',
      (n) => `Getting ready for the week, ${n}.`,
      'Getting ready for the week.'
    ),
  ],
};

export const WEATHER_HEADLINES: Record<string, HeadlineDef[]> = {
  rain_drizzle: [
    makeHeadline(
      'weather_rain_1',
      (n) => `Rainy out there. Good day to get ahead, ${n}.`,
      'Rainy out there. Good day to get ahead.'
    ),
    makeHeadline('weather_rain_2', (n) => `Cozy rain outside, ${n}.`, 'Cozy rain outside.'),
    makeHeadline('weather_rain_3', (n) => `Rainy day focus, ${n}.`, 'Rainy day focus.'),
  ],
  thunderstorm: [
    makeHeadline(
      'weather_thunder_1',
      (n) => `Stormy out there, ${n}. Safe and sound inside.`,
      'Stormy out there. Safe and sound inside.'
    ),
    makeHeadline(
      'weather_thunder_2',
      (n) => `Thunder outside, focus inside, ${n}.`,
      'Thunder outside, focus inside.'
    ),
    makeHeadline('weather_thunder_3', (n) => `Hunker down weather, ${n}.`, 'Hunker down weather.'),
  ],
  snow: [
    makeHeadline(
      'weather_snow_1',
      (n) => `Snowy day, ${n}. Perfect time to stay in.`,
      'Snowy day. Perfect time to stay in.'
    ),
    makeHeadline('weather_snow_2', (n) => `Cold and quiet outside, ${n}.`, 'Cold and quiet outside.'),
    makeHeadline(
      'weather_snow_3',
      (n) => `Snow falling, ${n}. Cozy study session.`,
      'Snow falling. Cozy study session.'
    ),
  ],
  fog: [
    makeHeadline('weather_fog_1', (n) => `Misty morning out there, ${n}.`, 'Misty morning out there.'),
    makeHeadline('weather_fog_2', (n) => `Foggy day, ${n}. Clear mind inside.`, 'Foggy day. Clear mind inside.'),
    makeHeadline('weather_fog_3', (n) => `Quiet fog outside, ${n}.`, 'Quiet fog outside.'),
  ],
  clear_hot: [
    makeHeadline('weather_hot_1', (n) => `Warm one today, ${n}. Stay hydrated.`, 'Warm one today. Stay hydrated.'),
    makeHeadline('weather_hot_2', (n) => `Sunny and hot outside, ${n}.`, 'Sunny and hot outside.'),
    makeHeadline('weather_hot_3', (n) => `Summer heat, ${n}. Take it easy.`, 'Summer heat. Take it easy.'),
  ],
  clear_cool: [
    makeHeadline('weather_cool_1', (n) => `Crisp, clear air today, ${n}.`, 'Crisp, clear air today.'),
    makeHeadline('weather_cool_2', (n) => `Chilly and bright, ${n}.`, 'Chilly and bright.'),
    makeHeadline('weather_cool_3', (n) => `Brisk day outside, ${n}.`, 'Brisk day outside.'),
  ],
  cloudy: [
    makeHeadline(
      'weather_cloudy_1',
      (n) => `Overcast skies, ${n}. Good day for steady work.`,
      'Overcast skies. Good day for steady work.'
    ),
    makeHeadline('weather_cloudy_2', (n) => `Cool and gray outside, ${n}.`, 'Cool and gray outside.'),
    makeHeadline('weather_cloudy_3', (n) => `Cloudy afternoon, ${n}. Easy does it.`, 'Cloudy afternoon. Easy does it.'),
  ],
  clear: [
    makeHeadline('weather_clear_1', (n) => `Clear skies today, ${n}.`, 'Clear skies today.'),
    makeHeadline('weather_clear_2', (n) => `Bright and clear, ${n}.`, 'Bright and clear.'),
    makeHeadline('weather_clear_3', (n) => `Blue skies ahead, ${n}.`, 'Blue skies ahead.'),
  ],
};

/**
 * Resolves the appropriate Lucide icon name for the greeting.
 */
export function getGreetingIcon(
  timeBucket: TimeBucket,
  weather?: WeatherData | null
): GreetingIconType {
  if (weather) {
    switch (weather.category) {
      case 'thunderstorm':
        return 'cloud-lightning';
      case 'snow':
        return 'snowflake';
      case 'rain_drizzle':
        return 'cloud-rain';
      case 'fog':
        return 'cloud-fog';
      case 'cloudy':
        return 'cloud';
      case 'clear':
      case 'clear_hot':
      case 'clear_cool':
        return weather.isDay ? 'sun' : 'moon';
    }
  }

  switch (timeBucket) {
    case 'early_morning':
      return 'sunrise';
    case 'morning':
    case 'afternoon':
      return 'sun';
    case 'evening':
      return 'sunset';
    case 'night':
    case 'late_night':
      return 'moon';
  }
}

/**
 * Builds the supportive, non-judgmental subline from AppFacts.
 */
export function buildGreetingSubline(facts: AppFacts): string {
  if (facts.totalActiveCount === 0) {
    return "You're all caught up. Paste upcoming deadlines or add a task to plan ahead.";
  }
  if (facts.catchUpCount > 0) {
    return `You have ${facts.catchUpCount} older item${
      facts.catchUpCount === 1 ? '' : 's'
    } that need attention, and ${facts.topTask?.title || 'your top task'} is up next.`;
  }
  // Forecast-aware: today clear + tomorrow heavy
  if (facts.today.demandHours === 0 && facts.tomorrow && facts.tomorrow.isHeavy) {
    return `Today's clear — but tomorrow is heavy (${facts.tomorrow.demandHours}h of work, ${facts.tomorrow.capacityHours}h of capacity). Want to start one thing early?`;
  }
  if (facts.topTask) {
    return `${facts.topTask.title} is due ${facts.topTask.dueRelative.toLowerCase()}. You have ~${
      facts.today.demandHours
    }h planned against ${facts.today.capacityHours}h capacity today.`;
  }
  return `You have ${facts.totalActiveCount} assignments planned (~${facts.totalActiveHours}h total effort).`;
}

/**
 * Returns action chips (max 3) tailored to whether the user is new or returning.
 */
export function buildGreetingChips(facts: AppFacts, isNewUser: boolean): GreetingActionChip[] {
  if (isNewUser || facts.totalActiveCount === 0) {
    return [
      { id: 'paste', label: 'Paste my deadlines', action: 'paste' },
      { id: 'add', label: 'Add a task', action: 'add' },
      { id: 'tour', label: 'Show me around', action: 'tour' },
    ];
  }

  const chips: GreetingActionChip[] = [];
  if (facts.topTask) {
    chips.push({
      id: 'start_top',
      label: `Start ${facts.topTask.title}`,
      action: 'start_top',
      taskId: facts.topTask.id,
    });
  }
  chips.push({ id: 'plan_week', label: 'Plan my week', action: 'plan_week' });
  chips.push({ id: 'swamped', label: "I'm swamped", action: 'swamped' });

  return chips.slice(0, 3);
}

/**
 * Re-roll rule: choose a new greeting on page load (lastHiddenAt === null)
 * or when the user returns after 30 or more minutes away.
 */
export function shouldReroll(lastHiddenAt: number | null, now: number): boolean {
  if (lastHiddenAt === null) return true;
  return now - lastHiddenAt >= 30 * 60 * 1000;
}

/**
 * Pure greeting engine: selects a headline, subline, icon, and chips.
 * Deterministic with seed; never repeats lastShownId.
 */
export function pickGreeting({
  now = new Date(),
  name,
  weather,
  facts,
  lastShownId,
  seed,
}: PickGreetingOptions): GreetingResult {
  const seedValue =
    typeof seed === 'number'
      ? seed
      : ((now.getTime() ^ (lastShownId ? lastShownId.length : 0)) >>> 0) || 12345;
  const rng = mulberry32(seedValue);

  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sun, 1 = Mon, 5 = Fri
  const timeBucket = getTimeBucket(hour);

  let candidateCategory: 'time' | 'weather' | 'day' = 'time';
  let candidates: HeadlineDef[] = [];

  // Weather overlay: if weather exists, use it about half the time (roll < 0.5)
  if (weather) {
    const weatherRoll = rng();
    if (weatherRoll < 0.5) {
      const weatherList = WEATHER_HEADLINES[weather.category] || WEATHER_HEADLINES.clear;
      if (weatherList && weatherList.length > 0) {
        candidates = weatherList;
        candidateCategory = 'weather';
      }
    }
  }

  // If not chosen by weather overlay, pick from time + day overlays
  if (candidates.length === 0) {
    const dayCandidates: HeadlineDef[] = [];
    if (day === 1) {
      dayCandidates.push(...DAY_HEADLINES.monday);
    } else if (day === 5) {
      dayCandidates.push(...DAY_HEADLINES.friday);
    } else if (day === 0 && hour >= 17) {
      dayCandidates.push(...DAY_HEADLINES.sunday_evening);
    }

    const timeCandidates = TIME_HEADLINES[timeBucket];

    // Day overlay can be selected when applicable
    if (dayCandidates.length > 0 && rng() < 0.35) {
      candidates = dayCandidates;
      candidateCategory = 'day';
    } else {
      candidates = timeCandidates;
      candidateCategory = 'time';
    }
  }

  // Never return lastShownId if there is another choice available
  let pool = candidates;
  if (lastShownId && pool.length > 1) {
    const filtered = pool.filter((c) => c.id !== lastShownId);
    if (filtered.length > 0) {
      pool = filtered;
    }
  }

  const chosenIndex = Math.floor(rng() * pool.length);
  const chosen = pool[chosenIndex];

  const cleanName = name ? sanitizeGreetingName(name) : undefined;
  const headline = chosen.format(cleanName);
  const subline = buildGreetingSubline(facts);
  const icon = getGreetingIcon(timeBucket, weather);
  const chips = buildGreetingChips(facts, isFirstVisit());

  return {
    id: chosen.id,
    headline,
    subline,
    icon,
    chips,
    category: candidateCategory,
  };
}
