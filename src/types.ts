export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskCategory = 'assignment' | 'exam' | 'project' | 'reading' | 'quiz' | 'lab' | 'other';

export type UrgencyLevel = 'overdue' | 'critical' | 'urgent' | 'upcoming' | 'relaxed';

export interface Task {
  id: string;
  title: string;
  course: string;
  dueDateTime: string; // ISO string
  estimatedHours: number;
  priority: Priority;
  category: TaskCategory;
  notes?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UrgencyInfo {
  level: UrgencyLevel;
  label: string;
  badgeClass: string;
  borderClass: string;
  hoursRemaining: number;
  availableWorkingHours: number;
  relativeTime: string;
  formattedDate: string;
  isOverdue: boolean;
  bufferHours: number; // availableWorkingHours - estimatedHours (or wall-clock buffer)
  hasTimeDeficit: boolean;
}

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface BlockedTimeSlot {
  id: string;
  label: string;
  startHour: number; // 0 - 23
  endHour: number; // 0 - 24
  days: DayOfWeek[];
}

export interface CapacitySettings {
  dailyWorkHours: Record<DayOfWeek, number>;
  blockedSlots: BlockedTimeSlot[];
}

export interface DailyLoadMetric {
  dateStr: string; // YYYY-MM-DD
  dayLabel: string; // e.g., "Mon 24"
  dayOfWeek: DayOfWeek;
  capacityHours: number;
  demandHours: number;
  remainingCapacity: number;
  status: 'clear' | 'filling' | 'overloaded';
  taskIds: string[];
}

export interface Recommendation {
  task: Task;
  score: number;
  urgency: UrgencyInfo;
  headline: string;
  explanation: string;
  keyFactors: string[];
  actionAdvice: string;
}

export type TaskFilter = 'all' | 'active' | 'completed' | 'overdue' | 'due-today';
export type TaskSort = 'smart' | 'deadline' | 'priority' | 'effort-asc' | 'effort-desc';

export type StopwatchState = 'idle' | 'running' | 'paused' | 'stopped';

export interface StopwatchSession {
  id: string;
  durationMs: number;
  durationFormatted: string; // HH:MM:SS
  taskId?: string;
  taskTitle?: string;
  taskCourse?: string;
  createdAt: string; // ISO string
}

export interface StoredStopwatchState {
  status: StopwatchState;
  accumulatedMs: number;
  segmentStartTimestamp: number | null;
  selectedTaskId?: string;
  isSaved: boolean;
  updatedAt: number;
}

