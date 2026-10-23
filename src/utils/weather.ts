/**
 * Pure functions and storage helpers for Open-Meteo weather integration.
 * Opt-in only, 1-decimal rounded coordinates, 45-minute local cache.
 */

export const WEATHER_OPT_IN_KEY = 'deadline_rescue_weather_opt_in';
export const WEATHER_COORDS_KEY = 'deadline_rescue_weather_coords';
export const WEATHER_CACHE_KEY = 'deadline_rescue_weather_cache';

export const WEATHER_CACHE_DURATION_MS = 45 * 60 * 1000; // 45 minutes

export type WeatherCategory =
  | 'clear'
  | 'clear_hot'
  | 'clear_cool'
  | 'cloudy'
  | 'fog'
  | 'rain_drizzle'
  | 'snow'
  | 'thunderstorm';

export interface WeatherData {
  temperatureC: number;
  weatherCode: number;
  isDay: boolean;
  category: WeatherCategory;
  cachedAt: number;
}

/**
 * Rounds a coordinate to 1 decimal place (~11km privacy fuzzing).
 */
export function roundCoordinate(coord: number): number {
  if (typeof coord !== 'number' || isNaN(coord)) return 0;
  return Math.round(coord * 10) / 10;
}

/**
 * Checks if a cached weather timestamp is still fresh (< 45 minutes).
 */
export function isWeatherCacheValid(cachedAt: number, nowMs: number = Date.now()): boolean {
  if (typeof cachedAt !== 'number' || isNaN(cachedAt)) return false;
  return nowMs - cachedAt < WEATHER_CACHE_DURATION_MS && nowMs >= cachedAt;
}

/**
 * Maps WMO weather code and temperature to high-level weather category.
 * WMO Code Ranges:
 * 0: Clear sky
 * 1-3: Partly cloudy, overcast
 * 45, 48: Fog
 * 51-57: Drizzle
 * 61-67: Rain
 * 71-77: Snow
 * 80-82: Showers
 * 85-86: Snow showers
 * 95-99: Thunderstorm
 */
export function mapWmoCodeToCategory(code: number, tempC?: number): WeatherCategory {
  if (code === 0) {
    if (typeof tempC === 'number') {
      if (tempC >= 32) return 'clear_hot';
      if (tempC <= 15) return 'clear_cool';
    }
    return 'clear';
  }

  if (code >= 1 && code <= 3) {
    return 'cloudy';
  }

  if (code === 45 || code === 48) {
    return 'fog';
  }

  if (
    (code >= 51 && code <= 57) ||
    (code >= 61 && code <= 67) ||
    (code >= 80 && code <= 82)
  ) {
    return 'rain_drizzle';
  }

  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return 'snow';
  }

  if (code >= 95 && code <= 99) {
    return 'thunderstorm';
  }

  return 'cloudy';
}

/**
 * Reads stored weather opt-in choice ('on' | 'off' | 'unset').
 */
export function getStoredWeatherOptIn(storage?: Storage): 'on' | 'off' | 'unset' {
  try {
    const s = storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!s) return 'unset';
    const val = s.getItem(WEATHER_OPT_IN_KEY);
    if (val === 'on' || val === 'off') return val;
    return 'unset';
  } catch {
    return 'unset';
  }
}

/**
 * Saves stored weather opt-in choice.
 */
export function setStoredWeatherOptIn(value: 'on' | 'off', storage?: Storage): void {
  try {
    const s = storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!s) return;
    s.setItem(WEATHER_OPT_IN_KEY, value);
  } catch {
    // ignore
  }
}

/**
 * Gets stored coordinates rounded to 1 decimal place.
 */
export function getStoredCoordinates(
  storage?: Storage
): { lat: number; lon: number } | null {
  try {
    const s = storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!s) return null;
    const raw = s.getItem(WEATHER_COORDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lat === 'number' && typeof parsed?.lon === 'number') {
      return {
        lat: roundCoordinate(parsed.lat),
        lon: roundCoordinate(parsed.lon),
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Sets stored coordinates rounded to 1 decimal place.
 */
export function setStoredCoordinates(lat: number, lon: number, storage?: Storage): void {
  try {
    const s = storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!s) return;
    const payload = {
      lat: roundCoordinate(lat),
      lon: roundCoordinate(lon),
      updatedAt: Date.now(),
    };
    s.setItem(WEATHER_COORDS_KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

/**
 * Reads cached weather data if still valid (< 45 min).
 */
export function getCachedWeather(
  storage?: Storage,
  nowMs: number = Date.now()
): WeatherData | null {
  try {
    const s = storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!s) return null;
    const raw = s.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as WeatherData;
    if (data && typeof data.cachedAt === 'number' && isWeatherCacheValid(data.cachedAt, nowMs)) {
      return data;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Saves weather data to localStorage cache.
 */
export function setCachedWeather(data: WeatherData, storage?: Storage): void {
  try {
    const s = storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!s) return;
    s.setItem(WEATHER_CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/**
 * Clears stored weather opt-in, coordinates, and cached weather data.
 */
export function clearStoredWeather(storage?: Storage): void {
  try {
    const s = storage || (typeof window !== 'undefined' ? window.localStorage : undefined);
    if (!s) return;
    s.removeItem(WEATHER_OPT_IN_KEY);
    s.removeItem(WEATHER_COORDS_KEY);
    s.removeItem(WEATHER_CACHE_KEY);
  } catch {
    // ignore
  }
}

/**
 * Fetches current weather from Open-Meteo with a 3-second timeout.
 * Returns null silently on any network or parsing failure.
 */
export async function fetchCurrentWeather(
  lat: number,
  lon: number,
  fetchFn: typeof fetch = globalThis.fetch
): Promise<WeatherData | null> {
  const roundedLat = roundCoordinate(lat);
  const roundedLon = roundCoordinate(lon);

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${roundedLat}&longitude=${roundedLon}&current=temperature_2m,weather_code,is_day&timezone=auto`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetchFn(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    const current = json?.current;
    if (!current) return null;

    const tempC = typeof current.temperature_2m === 'number' ? Math.round(current.temperature_2m) : 20;
    const code = typeof current.weather_code === 'number' ? current.weather_code : 0;
    const isDay = current.is_day === 1;
    const category = mapWmoCodeToCategory(code, tempC);

    return {
      temperatureC: tempC,
      weatherCode: code,
      isDay,
      category,
      cachedAt: Date.now(),
    };
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}
