import { Task, CapacitySettings } from '../types';
import { getDayKey } from './capacity';

export type WeekResetStrategy = 'reschedule' | 'submit_partial' | 'drop';

export interface TaskResetChange {
  taskId: string;
  taskTitle: string;
  course: string;
  action: 'rescheduled' | 'dropped' | 'marked_submitted';
  previousDueDateTime: string;
  proposedDueDateTime?: string;
  estimatedHours: number;
  summary: string;
}

export interface WeekResetPlan {
  overdueTasks: Task[];
  overdueCount: number;
  totalOverdueHours: number;
  strategy: WeekResetStrategy;
  changes: TaskResetChange[];
  newWeeklyDemandHours: number;
  totalWeeklyCapacityHours: number;
  affirmation: string;
  previewSummary: string;
}

/**
 * Returns all incomplete tasks that have passed their deadline.
 */
export function getOverdueTasks(tasks: Task[], now: Date = new Date()): Task[] {
  const currentMs = now.getTime();
  return tasks.filter((t) => !t.completed && new Date(t.dueDateTime).getTime() < currentMs);
}

/**
 * Generates a non-punitive, supportive week reset recovery plan.
 * Reschedules or clears overdue assignments to give the student an actionable clean slate.
 */
export function generateWeekResetPlan(
  tasks: Task[],
  capacitySettings: CapacitySettings,
  now: Date = new Date(),
  strategy: WeekResetStrategy = 'reschedule'
): WeekResetPlan {
  const overdueTasks = getOverdueTasks(tasks, now);
  const totalOverdueHours = overdueTasks.reduce((acc, t) => acc + (t.estimatedHours || 1), 0);

  // Compute 7-day capacity budget
  let totalWeeklyCapacityHours = 0;
  for (let i = 0; i < 7; i++) {
    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, 12, 0, 0);
    const dayKey = getDayKey(targetDate);
    totalWeeklyCapacityHours += capacitySettings.dailyWorkHours[dayKey] ?? 4;
  }

  const changes: TaskResetChange[] = [];

  if (strategy === 'reschedule') {
    // Distribute overdue tasks forward starting tomorrow (day 1 through day 4)
    // to give immediate relief today while keeping upcoming workload realistic.
    overdueTasks.forEach((task, index) => {
      // Space tasks across upcoming days: tomorrow, day after, etc.
      const dayOffset = (index % 4) + 1;
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + dayOffset, 23, 59, 0);
      const proposedIso = targetDate.toISOString();

      const dayName = targetDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

      changes.push({
        taskId: task.id,
        taskTitle: task.title,
        course: task.course,
        action: 'rescheduled',
        previousDueDateTime: task.dueDateTime,
        proposedDueDateTime: proposedIso,
        estimatedHours: task.estimatedHours,
        summary: `Rescheduled to ${dayName} 11:59 PM (reclaims today's focus)`,
      });
    });
  } else if (strategy === 'submit_partial') {
    overdueTasks.forEach((task) => {
      changes.push({
        taskId: task.id,
        taskTitle: task.title,
        course: task.course,
        action: 'marked_submitted',
        previousDueDateTime: task.dueDateTime,
        estimatedHours: task.estimatedHours,
        summary: 'Marked submitted for partial credit to close the open loop',
      });
    });
  } else if (strategy === 'drop') {
    overdueTasks.forEach((task) => {
      changes.push({
        taskId: task.id,
        taskTitle: task.title,
        course: task.course,
        action: 'dropped',
        previousDueDateTime: task.dueDateTime,
        estimatedHours: task.estimatedHours,
        summary: 'Forgiven & archived to protect mental bandwidth for upcoming courses',
      });
    });
  }

  // Calculate new active demand
  const activeIncompleteTasks = tasks.filter((t) => !t.completed);
  let newWeeklyDemandHours = 0;

  if (strategy === 'reschedule') {
    newWeeklyDemandHours = activeIncompleteTasks.reduce((acc, t) => acc + (t.estimatedHours || 1), 0);
  } else {
    // Overdue tasks are resolved, subtracting their load
    const nonOverdueIncomplete = activeIncompleteTasks.filter((t) => new Date(t.dueDateTime).getTime() >= now.getTime());
    newWeeklyDemandHours = nonOverdueIncomplete.reduce((acc, t) => acc + (t.estimatedHours || 1), 0);
  }

  const affirmation = overdueTasks.length === 0
    ? 'All active tasks are currently on schedule. Zero past-due pressure on your radar.'
    : strategy === 'reschedule'
    ? 'College workloads get intense. Giving yourself a realistic schedule forward is the smartest way to regain control.'
    : strategy === 'submit_partial'
    ? 'Submitting what you have secures partial credit and instantly clears mental fog.'
    : 'Forgiving past-due backlog removes guilt so you can dedicate 100% of your energy to what is still salvageable.';

  const previewSummary = overdueTasks.length === 0
    ? 'No overdue tasks to reset.'
    : strategy === 'reschedule'
    ? `Rescheduling ${overdueTasks.length} task${overdueTasks.length === 1 ? '' : 's'} (${totalOverdueHours.toFixed(1)}h total) across upcoming open study slots.`
    : strategy === 'submit_partial'
    ? `Closing ${overdueTasks.length} task${overdueTasks.length === 1 ? '' : 's'} as submitted for partial credit.`
    : `Clearing ${overdueTasks.length} overdue task${overdueTasks.length === 1 ? '' : 's'} (${totalOverdueHours.toFixed(1)}h backlog) for an immediate clean slate.`;

  return {
    overdueTasks,
    overdueCount: overdueTasks.length,
    totalOverdueHours,
    strategy,
    changes,
    newWeeklyDemandHours,
    totalWeeklyCapacityHours,
    affirmation,
    previewSummary,
  };
}

/**
 * Applies the chosen week reset plan to the task list, returning updated tasks.
 */
export function applyWeekReset(tasks: Task[], plan: WeekResetPlan, now: Date = new Date()): Task[] {
  const changeMap = new Map<string, TaskResetChange>(plan.changes.map((c) => [c.taskId, c]));

  return tasks.map((task) => {
    const change = changeMap.get(task.id);
    if (!change) return task;

    if (change.action === 'rescheduled' && change.proposedDueDateTime) {
      return {
        ...task,
        dueDateTime: change.proposedDueDateTime,
        updatedAt: now.toISOString(),
        notes: task.notes
          ? `${task.notes}\n// Rescheduled during Clean Slate Reset`
          : '// Rescheduled during Clean Slate Reset',
      };
    }

    if (change.action === 'marked_submitted') {
      return {
        ...task,
        completed: true,
        completedAt: now.toISOString(),
        updatedAt: now.toISOString(),
        notes: task.notes
          ? `${task.notes}\n// Submitted partial work during Clean Slate Reset`
          : '// Submitted partial work during Clean Slate Reset',
      };
    }

    if (change.action === 'dropped') {
      return {
        ...task,
        completed: true,
        completedAt: now.toISOString(),
        updatedAt: now.toISOString(),
        notes: task.notes
          ? `${task.notes}\n// Archived during Clean Slate Reset`
          : '// Archived during Clean Slate Reset',
      };
    }

    return task;
  });
}

/**
 * Ready-to-use email templates for communicating with professors and TAs
 * respectfully and without panic.
 */
export function generateInstructorEmail(
  task: Task,
  templateType: 'extension' | 'partial_submission' | 'office_hours' = 'extension',
  studentName: string = '[Your Name]'
): { subject: string; body: string } {
  const course = task.course || 'Course';
  const title = task.title;

  if (templateType === 'extension') {
    return {
      subject: `[${course}] Extension Request: ${title}`,
      body: `Dear Professor / Teaching Team,

I am writing to respectfully request a short extension on ${title} for ${course}.

Due to an unexpected workload conflict, I fell behind on completing the final portions. I have already made meaningful progress and want to ensure the final submission reflects thoughtful, quality work.

Would it be possible to submit this by tomorrow evening? I would be deeply grateful for your flexibility and am happy to share my current draft in the meantime.

Thank you very much for your time and understanding.

Sincerely,
${studentName}`,
    };
  }

  if (templateType === 'partial_submission') {
    return {
      subject: `[${course}] Submission of Work in Progress: ${title}`,
      body: `Dear Professor / Teaching Team,

I have submitted my current work in progress for ${title} on ${course}.

While I was unable to complete every section before the cutoff, I wanted to submit what I have accomplished to demonstrate my understanding of the core concepts.

Please let me know if there is an opportunity to submit the remaining sections for partial credit. I appreciate your guidance.

Best regards,
${studentName}`,
    };
  }

  return {
    subject: `[${course}] Quick Question regarding ${title} & Office Hours`,
    body: `Dear Professor / Teaching Team,

I hope you are having a good week. I am currently working on ${title} for ${course} and ran into a few conceptual roadblocks.

Could I stop by your upcoming office hours, or arrange a brief 10-minute check-in, to review my approach and make sure I'm on the right track?

Thank you for your help!

Best regards,
${studentName}`,
  };
}
