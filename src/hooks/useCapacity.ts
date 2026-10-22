import { useState, useEffect, useCallback } from 'react';
import { CapacitySettings, DayOfWeek, BlockedTimeSlot } from '../types';
import { DEFAULT_CAPACITY_SETTINGS } from '../utils/capacity';

const STORAGE_KEY_CAPACITY = 'deadline_rescue_capacity_settings_v1';

export function useCapacity() {
  const [settings, setSettings] = useState<CapacitySettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_CAPACITY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed.dailyWorkHours === 'object' && Array.isArray(parsed.blockedSlots)) {
          return {
            dailyWorkHours: {
              ...DEFAULT_CAPACITY_SETTINGS.dailyWorkHours,
              ...parsed.dailyWorkHours,
            },
            blockedSlots: parsed.blockedSlots,
          };
        }
      }
    } catch (e) {
      console.error('Failed to load capacity settings:', e);
    }
    return DEFAULT_CAPACITY_SETTINGS;
  });

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_CAPACITY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save capacity settings:', e);
    }
  }, [settings]);

  const updateDailyHours = useCallback((day: DayOfWeek, hours: number) => {
    const clampedHours = Math.max(0, Math.min(16, Math.round(hours * 10) / 10));
    setSettings((prev) => ({
      ...prev,
      dailyWorkHours: {
        ...prev.dailyWorkHours,
        [day]: clampedHours,
      },
    }));
  }, []);

  const addBlockedSlot = useCallback((slot: Omit<BlockedTimeSlot, 'id'>) => {
    const newSlot: BlockedTimeSlot = {
      ...slot,
      id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    setSettings((prev) => ({
      ...prev,
      blockedSlots: [...prev.blockedSlots, newSlot],
    }));
  }, []);

  const removeBlockedSlot = useCallback((id: string) => {
    setSettings((prev) => ({
      ...prev,
      blockedSlots: prev.blockedSlots.filter((s) => s.id !== id),
    }));
  }, []);

  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_CAPACITY_SETTINGS);
  }, []);

  const totalWeeklyCapacityHours = Object.values(settings.dailyWorkHours).reduce((a, b) => a + b, 0);

  return {
    settings,
    totalWeeklyCapacityHours,
    updateDailyHours,
    addBlockedSlot,
    removeBlockedSlot,
    resetToDefaults,
  };
}
