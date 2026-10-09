export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type TaskCategory = 'assignment' | 'exam' | 'project' | 'reading' | 'quiz' | 'other';

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
  relativeTime: string;
  formattedDate: string;
  isOverdue: boolean;
  bufferHours: number; // hoursRemaining - estimatedHours
  hasTimeDeficit: boolean;
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

