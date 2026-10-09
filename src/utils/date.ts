import { UrgencyInfo, UrgencyLevel } from '../types';

/**
 * Calculates detailed urgency information based on due date and estimated hours.
 */
export function getUrgencyInfo(dueDateTimeStr: string, estimatedHours: number = 1): UrgencyInfo {
  const now = new Date();
  const dueDate = new Date(dueDateTimeStr);
  const diffMs = dueDate.getTime() - now.getTime();
  const hoursRemaining = diffMs / (1000 * 60 * 60);
  const isOverdue = hoursRemaining < 0;
  const bufferHours = hoursRemaining - estimatedHours;
  const hasTimeDeficit = !isOverdue && bufferHours < 0;

  let level: UrgencyLevel;
  let label: string;
  let badgeClass: string;
  let borderClass: string;

  if (isOverdue) {
    level = 'overdue';
    label = 'OVERDUE';
    badgeClass = 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    borderClass = 'border-rose-500/40 shadow-rose-950/20';
  } else if (hoursRemaining <= 12 || hasTimeDeficit) {
    level = 'critical';
    label = hasTimeDeficit ? 'TIME DEFICIT' : 'CRITICAL (<12H)';
    badgeClass = 'bg-red-500/15 text-red-300 border-red-500/30 animate-pulse-subtle';
    borderClass = 'border-red-500/40 shadow-red-950/20';
  } else if (hoursRemaining <= 24) {
    level = 'urgent';
    label = 'DUE TODAY (<24H)';
    badgeClass = 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    borderClass = 'border-amber-500/40 shadow-amber-950/20';
  } else if (hoursRemaining <= 72) {
    level = 'upcoming';
    label = 'UPCOMING (<3 DAYS)';
    badgeClass = 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    borderClass = 'border-blue-500/30 shadow-blue-950/10';
  } else {
    level = 'relaxed';
    label = 'ON RADAR';
    badgeClass = 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    borderClass = 'border-zinc-800 shadow-transparent';
  }

  return {
    level,
    label,
    badgeClass,
    borderClass,
    hoursRemaining,
    relativeTime: formatRelativeTime(hoursRemaining),
    formattedDate: formatReadableDate(dueDate),
    isOverdue,
    bufferHours,
    hasTimeDeficit
  };
}

/**
 * Formats a readable relative time string (e.g. "in 3h 15m", "overdue by 45m")
 */
export function formatRelativeTime(hoursRemaining: number): string {
  const isPast = hoursRemaining < 0;
  const absHours = Math.abs(hoursRemaining);
  const totalMinutes = Math.round(absHours * 60);

  if (totalMinutes < 60) {
    const minText = `${totalMinutes} min${totalMinutes === 1 ? '' : 's'}`;
    return isPast ? `Overdue by ${minText}` : `Due in ${minText}`;
  }

  const hours = Math.floor(absHours);
  const minutes = Math.round((absHours - hours) * 60);

  if (hours < 24) {
    const timeText = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    return isPast ? `Overdue by ${timeText}` : `Due in ${timeText}`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const dayText = remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days} day${days === 1 ? '' : 's'}`;

  return isPast ? `Overdue by ${dayText}` : `Due in ${dayText}`;
}

/**
 * Formats a date into a clean, human-readable format
 */
export function formatReadableDate(date: Date): string {
  const now = new Date();
  const isCurrentYear = date.getFullYear() === now.getFullYear();

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(isCurrentYear ? {} : { year: 'numeric' }),
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };

  return date.toLocaleDateString(undefined, options);
}

/**
 * Returns formatted string for datetime-local input (YYYY-MM-DDTHH:mm)
 */
export function toDateTimeLocalString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

