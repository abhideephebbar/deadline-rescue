import { describe, it, expect } from 'vitest';
import {
  roundCoordinate,
  isWeatherCacheValid,
  mapWmoCodeToCategory,
  getStoredWeatherOptIn,
  setStoredWeatherOptIn,
  getStoredCoordinates,
  setStoredCoordinates,
  getCachedWeather,
  setCachedWeather,
  clearStoredWeather,
  fetchCurrentWeather,
  WEATHER_CACHE_DURATION_MS,
  WeatherData,
} from '../weather';

function createMockStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    length: 0,
  };
}

describe('weather.ts - Pure functions & Open-Meteo integration', () => {
  describe('roundCoordinate', () => {
    it('rounds coordinates to exactly 1 decimal place', () => {
      expect(roundCoordinate(52.5201)).toBe(52.5);
      expect(roundCoordinate(13.4195)).toBe(13.4);
      expect(roundCoordinate(-37.8136)).toBe(-37.8);
      expect(roundCoordinate(0)).toBe(0);
      expect(roundCoordinate(12.04)).toBe(12);
      expect(roundCoordinate(12.06)).toBe(12.1);
    });

    it('handles NaN or invalid inputs safely', () => {
      expect(roundCoordinate(NaN)).toBe(0);
      expect(roundCoordinate(undefined as unknown as number)).toBe(0);
    });
  });

  describe('mapWmoCodeToCategory', () => {
    it('maps code 0 to clear, clear_hot, or clear_cool based on temperature', () => {
      expect(mapWmoCodeToCategory(0, 22)).toBe('clear');
      expect(mapWmoCodeToCategory(0, 32)).toBe('clear_hot');
      expect(mapWmoCodeToCategory(0, 38)).toBe('clear_hot');
      expect(mapWmoCodeToCategory(0, 15)).toBe('clear_cool');
      expect(mapWmoCodeToCategory(0, 5)).toBe('clear_cool');
      expect(mapWmoCodeToCategory(0)).toBe('clear');
    });

    it('maps codes 1-3 to cloudy', () => {
      expect(mapWmoCodeToCategory(1)).toBe('cloudy');
      expect(mapWmoCodeToCategory(2)).toBe('cloudy');
      expect(mapWmoCodeToCategory(3)).toBe('cloudy');
    });

    it('maps codes 45 and 48 to fog', () => {
      expect(mapWmoCodeToCategory(45)).toBe('fog');
      expect(mapWmoCodeToCategory(48)).toBe('fog');
    });

    it('maps drizzle (51-57) to rain_drizzle', () => {
      for (let code = 51; code <= 57; code++) {
        expect(mapWmoCodeToCategory(code)).toBe('rain_drizzle');
      }
    });

    it('maps rain (61-67) to rain_drizzle', () => {
      for (let code = 61; code <= 67; code++) {
        expect(mapWmoCodeToCategory(code)).toBe('rain_drizzle');
      }
    });

    it('maps snow (71-77) to snow', () => {
      for (let code = 71; code <= 77; code++) {
        expect(mapWmoCodeToCategory(code)).toBe('snow');
      }
    });

    it('maps showers (80-82) to rain_drizzle', () => {
      for (let code = 80; code <= 82; code++) {
        expect(mapWmoCodeToCategory(code)).toBe('rain_drizzle');
      }
    });

    it('maps snow showers (85-86) to snow', () => {
      expect(mapWmoCodeToCategory(85)).toBe('snow');
      expect(mapWmoCodeToCategory(86)).toBe('snow');
    });

    it('maps thunderstorms (95-99) to thunderstorm', () => {
      for (let code = 95; code <= 99; code++) {
        expect(mapWmoCodeToCategory(code)).toBe('thunderstorm');
      }
    });
  });

  describe('isWeatherCacheValid', () => {
    const now = 1700000000000;

    it('returns true when cache is fresh (< 45 minutes)', () => {
      expect(isWeatherCacheValid(now, now)).toBe(true);
      expect(isWeatherCacheValid(now - 10 * 60 * 1000, now)).toBe(true);
      expect(isWeatherCacheValid(now - 44 * 60 * 1000, now)).toBe(true);
    });

    it('returns false when cache has expired (>= 45 minutes)', () => {
      expect(isWeatherCacheValid(now - WEATHER_CACHE_DURATION_MS, now)).toBe(false);
      expect(isWeatherCacheValid(now - 46 * 60 * 1000, now)).toBe(false);
      expect(isWeatherCacheValid(now - 24 * 3600 * 1000, now)).toBe(false);
    });

    it('returns false on future or invalid timestamps', () => {
      expect(isWeatherCacheValid(now + 10000, now)).toBe(false);
      expect(isWeatherCacheValid(NaN, now)).toBe(false);
    });
  });

  describe('Storage helpers & resilience', () => {
    it('manages weather opt-in correctly', () => {
      const storage = createMockStorage();
      expect(getStoredWeatherOptIn(storage)).toBe('unset');

      setStoredWeatherOptIn('on', storage);
      expect(getStoredWeatherOptIn(storage)).toBe('on');

      setStoredWeatherOptIn('off', storage);
      expect(getStoredWeatherOptIn(storage)).toBe('off');
    });

    it('manages stored coordinates with rounding', () => {
      const storage = createMockStorage();
      expect(getStoredCoordinates(storage)).toBeNull();

      setStoredCoordinates(37.774929, -122.419416, storage);
      const coords = getStoredCoordinates(storage);
      expect(coords).toEqual({ lat: 37.8, lon: -122.4 });
    });

    it('caches and retrieves weather data when fresh', () => {
      const storage = createMockStorage();
      const now = 1700000000000;

      const data: WeatherData = {
        temperatureC: 18,
        weatherCode: 2,
        isDay: true,
        category: 'cloudy',
        cachedAt: now,
      };

      setCachedWeather(data, storage);
      expect(getCachedWeather(storage, now + 10 * 60 * 1000)).toEqual(data);
      expect(getCachedWeather(storage, now + 50 * 60 * 1000)).toBeNull();
    });

    it('clears all weather keys on clearStoredWeather', () => {
      const storage = createMockStorage();
      setStoredWeatherOptIn('on', storage);
      setStoredCoordinates(40.71, -74.01, storage);
      setCachedWeather(
        {
          temperatureC: 20,
          weatherCode: 0,
          isDay: true,
          category: 'clear',
          cachedAt: Date.now(),
        },
        storage
      );

      clearStoredWeather(storage);
      expect(getStoredWeatherOptIn(storage)).toBe('unset');
      expect(getStoredCoordinates(storage)).toBeNull();
      expect(getCachedWeather(storage)).toBeNull();
    });

    it('handles throwing storage gracefully without crashing', () => {
      const brokenStorage: Storage = {
        getItem: () => {
          throw new Error('QuotaExceeded');
        },
        setItem: () => {
          throw new Error('SecurityError');
        },
        removeItem: () => {
          throw new Error('AccessDenied');
        },
        clear: () => {},
        key: () => null,
        length: 0,
      };

      expect(() => getStoredWeatherOptIn(brokenStorage)).not.toThrow();
      expect(getStoredWeatherOptIn(brokenStorage)).toBe('unset');
      expect(() => setStoredWeatherOptIn('on', brokenStorage)).not.toThrow();
      expect(() => getStoredCoordinates(brokenStorage)).not.toThrow();
      expect(getStoredCoordinates(brokenStorage)).toBeNull();
      expect(() => setStoredCoordinates(10, 20, brokenStorage)).not.toThrow();
      expect(() => getCachedWeather(brokenStorage)).not.toThrow();
      expect(getCachedWeather(brokenStorage)).toBeNull();
      expect(() => clearStoredWeather(brokenStorage)).not.toThrow();
    });
  });

  describe('fetchCurrentWeather (mocked, no network)', () => {
    it('returns formatted WeatherData on successful Open-Meteo response', async () => {
      const mockFetch: typeof fetch = async (input) => {
        expect(String(input)).toContain('api.open-meteo.com/v1/forecast');
        expect(String(input)).toContain('latitude=52.5&longitude=13.4');
        return {
          ok: true,
          json: async () => ({
            current: {
              temperature_2m: 14.2,
              weather_code: 61,
              is_day: 1,
            },
          }),
        } as Response;
      };

      const result = await fetchCurrentWeather(52.52, 13.41, mockFetch);
      expect(result).not.toBeNull();
      expect(result?.temperatureC).toBe(14);
      expect(result?.weatherCode).toBe(61);
      expect(result?.isDay).toBe(true);
      expect(result?.category).toBe('rain_drizzle');
    });

    it('returns null silently on non-200 responses', async () => {
      const mockFetch: typeof fetch = async () =>
        ({
          ok: false,
          status: 500,
        }) as Response;

      const result = await fetchCurrentWeather(52.52, 13.41, mockFetch);
      expect(result).toBeNull();
    });

    it('returns null silently on fetch failure or aborted request', async () => {
      const mockFetch: typeof fetch = async () => {
        throw new Error('Network timeout');
      };

      const result = await fetchCurrentWeather(52.52, 13.41, mockFetch);
      expect(result).toBeNull();
    });
  });
});
