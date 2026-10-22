import { CapacitySettings, DayOfWeek, DailyLoadMetric, Task } from '../types';

export const DAY_KEYS: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export const DEFAULT_CAPACITY_SETTINGS: CapacitySettings = {
  dailyWorkHours: {
    mon: 4,
    tue: 4,
    wed: 4,
    thu: 4,
    fri: 4,
    sat: 5,
    sun: 5,
  },
  blockedSlots: [
    {
      id: 'block-sleep',
      label: 'Sleep & Recovery',
      startHour: 23,
      endHour: 7, // 11 PM to 7 AM (crosses midnight)
      days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    },
    {
      id: 'block-classes',
      label: 'Classes & Commute',
      startHour: 9,
      endHour: 15, // 9 AM to 3 PM
      days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    },
  ],
};

/**
 * Maps a Date's day index (0=Sun, 1=Mon, ..., 6=Sat) to DayOfWeek
 */
export function getDayKey(date: Date): DayOfWeek {
  return DAY_KEYS[date.getDay()];
}

/**
 * Checks whether a specific hour on a given day is blocked by configured blocked slots.
 */
export function isHourBlocked(hour: number, dayKey: DayOfWeek, settings: CapacitySettings): boolean {
  for (const slot of settings.blockedSlots) {
    if (!slot.days.includes(dayKey)) continue;

    if (slot.startHour < slot.endHour) {
      if (hour >= slot.startHour && hour < slot.endHour) {
        return true;
      }
    } else {
      // Wraps across midnight (e.g. 23 to 7)
      if (hour >= slot.startHour || hour < slot.endHour) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Calculates how many unblocked hours exist in a 24-hour day for the given day key.
 */
export function getUnblockedHoursInDay(dayKey: DayOfWeek, settings: CapacitySettings): number {
  let unblocked = 0;
  for (let h = 0; h < 24; h++) {
    if (!isHourBlocked(h, dayKey, settings)) {
      unblocked++;
    }
  }
  return Math.max(1, unblocked);
}

/**
 * Calculates available working hours between `start` and `deadline`.
 * Unlike raw wall-clock hours, this counts only the user's focus study capacity,
 * factoring in daily limits and blocked hours (sleep, classes).
 */
export function getAvailableWorkingHours(
  start: Date,
  deadline: Date,
  settings: CapacitySettings = DEFAULT_CAPACITY_SETTINGS
): number {
  const startMs = start.getTime();
  const deadlineMs = deadline.getTime();

  if (deadlineMs <= startMs) {
    return 0;
  }

  let totalAvailableHours = 0;
  const current = new Date(startMs);

  // Advance hour by hour (30-min resolution for boundary precision)
  const stepMs = 30 * 60 * 1000;
  const stepHours = 0.5;

  // Track hours allocated per day to prevent exceeding dailyWorkHours
  const dailyAllocations: Record<string, number> = {};

  while (current.getTime() < deadlineMs) {
    const dayKey = getDayKey(current);
    const dateKey = `${current.getFullYear()}-${current.getMonth()}-${current.getDate()}`;
    const maxDayHours = settings.dailyWorkHours[dayKey] ?? 4;
    const currentDayAllocated = dailyAllocations[dateKey] || 0;

    if (currentDayAllocated < maxDayHours) {
      const hour = current.getHours();
      const blocked = isHourBlocked(hour, dayKey, settings);

      if (!blocked) {
        const unblockedInDay = getUnblockedHoursInDay(dayKey, settings);
        // Density of working hours per unblocked hour
        const density = Math.min(1.0, maxDayHours / unblockedInDay);
        const hoursToAdd = Math.min(stepHours * density, maxDayHours - currentDayAllocated);

        totalAvailableHours += hoursToAdd;
        dailyAllocations[dateKey] = currentDayAllocated + hoursToAdd;
      }
    }

    current.setTime(current.getTime() + stepMs);
  }

  return Math.round(totalAvailableHours * 10) / 10;
}

/**
 * Computes daily demand vs daily capacity for a sequence of days starting from `startDate`.
 */
export function calculateDailyLoads(
  tasks: Task[],
  settings: CapacitySettings = DEFAULT_CAPACITY_SETTINGS,
  startDate: Date = new Date(),
  numDays: number = 7
): DailyLoadMetric[] {
  const metrics: DailyLoadMetric[] = [];
  const incompleteTasks = tasks.filter((t) => !t.completed);

  for (let i = 0; i < numDays; i++) {
    const targetDate = new Date(startDate);
    targetDate.setDate(targetDate.getDate() + i);
    targetDate.setHours(0, 0, 0, 0);

    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const dayKey = getDayKey(targetDate);
    const capacityHours = settings.dailyWorkHours[dayKey] ?? 4;

    const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(
      targetDate.getDate()
    ).padStart(2, '0')}`;

    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : targetDate.toLocaleDateString(undefined, { weekday: 'short', month: 'numeric', day: 'numeric' });

    // Find incomplete tasks due on this day
    const tasksDueThisDay = incompleteTasks.filter((t) => {
      const dueDate = new Date(t.dueDateTime);
      return dueDate >= targetDate && dueDate < nextDate;
    });

    const demandHours = tasksDueThisDay.reduce((sum, t) => sum + t.estimatedHours, 0);
    const remainingCapacity = Math.max(0, Math.round((capacityHours - demandHours) * 10) / 10);

    let status: 'clear' | 'filling' | 'overloaded';
    if (demandHours > capacityHours) {
      status = 'overloaded';
    } else if (demandHours >= capacityHours * 0.75) {
      status = 'filling';
    } else {
      status = 'clear';
    }

    metrics.push({
      dateStr,
      dayLabel,
      dayOfWeek: dayKey,
      capacityHours,
      demandHours: Math.round(demandHours * 10) / 10,
      remainingCapacity,
      status,
      taskIds: tasksDueThisDay.map((t) => t.id),
    });
  }

  return metrics;
}
