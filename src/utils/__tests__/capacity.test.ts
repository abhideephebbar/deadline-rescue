import { describe, it, expect } from 'vitest';
import {
  getAvailableWorkingHours,
  calculateDailyLoads,
  isHourBlocked,
  getUnblockedHoursInDay,
  DEFAULT_CAPACITY_SETTINGS,
} from '../capacity';
import { Task } from '../../types';

describe('Capacity Model & Working Hours Buffer', () => {
  const baseDate = new Date('2026-10-26T08:00:00Z'); // Monday 8:00 AM UTC

  describe('isHourBlocked and getUnblockedHoursInDay', () => {
    it('detects sleep hours wrapping across midnight (23:00 to 07:00)', () => {
      expect(isHourBlocked(23, 'mon', DEFAULT_CAPACITY_SETTINGS)).toBe(true);
      expect(isHourBlocked(2, 'mon', DEFAULT_CAPACITY_SETTINGS)).toBe(true);
      expect(isHourBlocked(6, 'mon', DEFAULT_CAPACITY_SETTINGS)).toBe(true);
      expect(isHourBlocked(7, 'mon', DEFAULT_CAPACITY_SETTINGS)).toBe(false);
      expect(isHourBlocked(8, 'mon', DEFAULT_CAPACITY_SETTINGS)).toBe(false);
    });

    it('detects weekday class hours (09:00 to 15:00 on weekdays, free on weekends)', () => {
      expect(isHourBlocked(10, 'mon', DEFAULT_CAPACITY_SETTINGS)).toBe(true);
      expect(isHourBlocked(14, 'mon', DEFAULT_CAPACITY_SETTINGS)).toBe(true);
      expect(isHourBlocked(15, 'mon', DEFAULT_CAPACITY_SETTINGS)).toBe(false);
      // Saturday is not in class days
      expect(isHourBlocked(10, 'sat', DEFAULT_CAPACITY_SETTINGS)).toBe(false);
    });

    it('computes correct unblocked hours per day', () => {
      // Monday: blocked sleep (8h) + classes (6h) = 14h blocked -> 10h unblocked
      const monUnblocked = getUnblockedHoursInDay('mon', DEFAULT_CAPACITY_SETTINGS);
      expect(monUnblocked).toBe(10);

      // Saturday: only sleep (8h) blocked -> 16h unblocked
      const satUnblocked = getUnblockedHoursInDay('sat', DEFAULT_CAPACITY_SETTINGS);
      expect(satUnblocked).toBe(16);
    });
  });

  describe('getAvailableWorkingHours', () => {
    it('returns 0 when deadline has already passed or is now', () => {
      const pastDeadline = new Date(baseDate.getTime() - 3600 * 1000);
      expect(getAvailableWorkingHours(baseDate, pastDeadline, DEFAULT_CAPACITY_SETTINGS)).toBe(0);
      expect(getAvailableWorkingHours(baseDate, baseDate, DEFAULT_CAPACITY_SETTINGS)).toBe(0);
    });

    it('caps available hours per day to configured dailyWorkHours', () => {
      // Monday 00:00 to Monday 23:59 (entire day)
      const start = new Date(baseDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      const hours = getAvailableWorkingHours(start, end, DEFAULT_CAPACITY_SETTINGS);
      // Monday default is 4h max
      expect(hours).toBeLessThanOrEqual(DEFAULT_CAPACITY_SETTINGS.dailyWorkHours.mon);
      expect(hours).toBeCloseTo(DEFAULT_CAPACITY_SETTINGS.dailyWorkHours.mon, 0.5);
    });

    it('accumulates across multiple days without exceeding daily capacities', () => {
      // Monday 00:00 to Wednesday 23:59 (3 full days: Mon 4h + Tue 4h + Wed 4h = 12h)
      const start = new Date(baseDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 3);

      const hours = getAvailableWorkingHours(start, end, DEFAULT_CAPACITY_SETTINGS);
      expect(hours).toBeCloseTo(12, 1);
    });
  });

  describe('calculateDailyLoads', () => {
    it('computes demand vs capacity per day accurately', () => {
      const mockTasks: Task[] = [
        {
          id: 't1',
          title: 'Lab 1',
          course: 'CS 101',
          dueDateTime: new Date(baseDate.getTime() + 4 * 3600 * 1000).toISOString(), // due today
          estimatedHours: 3,
          priority: 'high',
          category: 'lab',
          completed: false,
          createdAt: baseDate.toISOString(),
          updatedAt: baseDate.toISOString(),
        },
        {
          id: 't2',
          title: 'Problem Set',
          course: 'MATH 201',
          dueDateTime: new Date(baseDate.getTime() + 6 * 3600 * 1000).toISOString(), // also due today
          estimatedHours: 2.5,
          priority: 'urgent',
          category: 'assignment',
          completed: false,
          createdAt: baseDate.toISOString(),
          updatedAt: baseDate.toISOString(),
        },
      ];

      const loads = calculateDailyLoads(mockTasks, DEFAULT_CAPACITY_SETTINGS, baseDate, 7);
      expect(loads.length).toBe(7);

      const todayLoad = loads[0];
      // Today has 3h + 2.5h = 5.5h demand
      expect(todayLoad.demandHours).toBe(5.5);
      // Monday capacity is 4.0h
      expect(todayLoad.capacityHours).toBe(4.0);
      // Demand (5.5h) > Capacity (4.0h) -> overloaded
      expect(todayLoad.status).toBe('overloaded');
    });

    it('ignores completed tasks in demand calculations', () => {
      const mockTasks: Task[] = [
        {
          id: 't1',
          title: 'Finished Lab',
          course: 'CS 101',
          dueDateTime: new Date(baseDate.getTime() + 4 * 3600 * 1000).toISOString(),
          estimatedHours: 4,
          priority: 'high',
          category: 'lab',
          completed: true, // completed!
          createdAt: baseDate.toISOString(),
          updatedAt: baseDate.toISOString(),
        },
      ];

      const loads = calculateDailyLoads(mockTasks, DEFAULT_CAPACITY_SETTINGS, baseDate, 7);
      expect(loads[0].demandHours).toBe(0);
      expect(loads[0].status).toBe('clear');
    });
  });
});
