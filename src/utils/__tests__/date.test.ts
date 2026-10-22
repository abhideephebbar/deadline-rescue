import { describe, it, expect } from 'vitest';
import {
  getUrgencyInfo,
  formatRelativeTime,
  formatReadableDate,
  formatStopwatchTime,
  formatDurationFriendly,
  toDateTimeLocalString,
} from '../date';

describe('Date & Urgency Utilities', () => {
  const referenceNow = new Date('2026-10-22T12:00:00Z');

  describe('getUrgencyInfo', () => {
    it('correctly flags overdue tasks when deadline is in the past', () => {
      const pastDate = new Date(referenceNow.getTime() - 2 * 3600 * 1000).toISOString(); // 2 hours ago
      const info = getUrgencyInfo(pastDate, 1, referenceNow);

      expect(info.isOverdue).toBe(true);
      expect(info.level).toBe('overdue');
      expect(info.label).toBe('OVERDUE');
      expect(info.hoursRemaining).toBeCloseTo(-2, 2);
    });

    it('correctly flags time deficit tasks when buffer is negative but not overdue', () => {
      // Due in 3 hours, but takes 5 hours of effort -> 2h deficit
      const dueDate = new Date(referenceNow.getTime() + 3 * 3600 * 1000).toISOString();
      const info = getUrgencyInfo(dueDate, 5, referenceNow);

      expect(info.isOverdue).toBe(false);
      expect(info.hasTimeDeficit).toBe(true);
      expect(info.level).toBe('critical');
      expect(info.label).toBe('TIME DEFICIT');
      expect(info.bufferHours).toBeCloseTo(-2, 2);
    });

    it('identifies critical tasks due within 12 hours with positive buffer', () => {
      // Due in 8 hours, 2h effort -> buffer 6h
      const dueDate = new Date(referenceNow.getTime() + 8 * 3600 * 1000).toISOString();
      const info = getUrgencyInfo(dueDate, 2, referenceNow);

      expect(info.isOverdue).toBe(false);
      expect(info.hasTimeDeficit).toBe(false);
      expect(info.level).toBe('critical');
      expect(info.label).toBe('CRITICAL (<12H)');
    });

    it('identifies urgent tasks due within 24 hours', () => {
      // Due in 18 hours, 2h effort
      const dueDate = new Date(referenceNow.getTime() + 18 * 3600 * 1000).toISOString();
      const info = getUrgencyInfo(dueDate, 2, referenceNow);

      expect(info.level).toBe('urgent');
      expect(info.label).toBe('DUE TODAY (<24H)');
    });

    it('identifies upcoming tasks due within 72 hours (3 days)', () => {
      // Due in 48 hours
      const dueDate = new Date(referenceNow.getTime() + 48 * 3600 * 1000).toISOString();
      const info = getUrgencyInfo(dueDate, 2, referenceNow);

      expect(info.level).toBe('upcoming');
      expect(info.label).toBe('UPCOMING (<3 DAYS)');
    });

    it('identifies relaxed tasks due in more than 72 hours', () => {
      // Due in 120 hours (5 days)
      const dueDate = new Date(referenceNow.getTime() + 120 * 3600 * 1000).toISOString();
      const info = getUrgencyInfo(dueDate, 2, referenceNow);

      expect(info.level).toBe('relaxed');
      expect(info.label).toBe('ON RADAR');
    });
  });

  describe('formatRelativeTime', () => {
    it('formats upcoming minutes', () => {
      expect(formatRelativeTime(0.5)).toBe('Due in 30 mins');
      expect(formatRelativeTime(1 / 60)).toBe('Due in 1 min');
    });

    it('formats upcoming hours and minutes', () => {
      expect(formatRelativeTime(3.5)).toBe('Due in 3h 30m');
      expect(formatRelativeTime(4.0)).toBe('Due in 4h');
    });

    it('formats upcoming days and hours', () => {
      expect(formatRelativeTime(26.0)).toBe('Due in 1d 2h');
      expect(formatRelativeTime(48.0)).toBe('Due in 2 days');
    });

    it('formats overdue intervals correctly', () => {
      expect(formatRelativeTime(-0.75)).toBe('Overdue by 45 mins');
      expect(formatRelativeTime(-2.5)).toBe('Overdue by 2h 30m');
      expect(formatRelativeTime(-25.0)).toBe('Overdue by 1d 1h');
    });
  });

  describe('formatReadableDate', () => {
    it('formats readable date with weekday and month', () => {
      const d = new Date(2026, 9, 22, 14, 30);
      const str = formatReadableDate(d, referenceNow);
      expect(str).toContain('Oct 22');
    });
  });

  describe('formatStopwatchTime & formatDurationFriendly', () => {
    it('formats milliseconds into strict HH:MM:SS format', () => {
      expect(formatStopwatchTime(0)).toBe('00:00:00');
      expect(formatStopwatchTime(5000)).toBe('00:00:05');
      expect(formatStopwatchTime(65000)).toBe('00:01:05');
      expect(formatStopwatchTime(3665000)).toBe('01:01:05');
    });

    it('formats friendly durations', () => {
      expect(formatDurationFriendly(5000)).toBe('5s');
      expect(formatDurationFriendly(75000)).toBe('1m 15s');
      expect(formatDurationFriendly(3725000)).toBe('1h 2m 5s');
    });
  });

  describe('toDateTimeLocalString', () => {
    it('formats date to local ISO format without timezone offset', () => {
      const d = new Date(2026, 9, 22, 14, 30); // Month index 9 = October
      const str = toDateTimeLocalString(d);
      expect(str).toBe('2026-10-22T14:30');
    });
  });
});
