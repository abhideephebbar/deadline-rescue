import { Task, CapacitySettings, DayOfWeek } from '../types';
import { calculateTaskScore, getSmartRecommendations } from './ranking';
import { calculateDailyLoads } from './capacity';
import { simulateTaskDelay } from './forecast';
import { parseCourseworkText } from './importParser';
import { formatRelativeTime } from './date';

export interface GroundedConfirmation {
  type: 'add_task' | 'set_capacity' | 'drop_task' | 'reschedule_task';
  title: string;
  description: string;
  payload: any;
  confirmLabel: string;
}

export interface GroundedAnswer {
  reply: string;
  reasoning?: string;
  source: 'gemini' | 'rule-based';
  confirmation?: GroundedConfirmation;
}

export interface AskContextSnapshot {
  tasks: Task[];
  remainingEffortMap?: Record<string, number>;
  capacitySettings: CapacitySettings;
  now: Date;
}

/**
 * Executes grounded client-side business logic for an assistant query.
 * Calls /api/ask with automatic fallback to offline rule-based classification.
 */
export async function processAskQuery(
  userQuery: string,
  context: AskContextSnapshot
): Promise<GroundedAnswer> {
  const query = userQuery.trim();
  if (!query) {
    return {
      reply: 'Please ask a question about your deadlines, study hours, or upcoming assignments.',
      source: 'rule-based',
    };
  }

  let serverData: any = null;

  // Attempt serverless API call
  try {
    const compactTasks = context.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      course: t.course,
      dueDateTime: t.dueDateTime,
      estimatedHours: t.estimatedHours,
      priority: t.priority,
      category: t.category,
    }));

    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: query,
        snapshot: {
          tasks: compactTasks,
          now: context.now.toISOString(),
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (!data.fallbackToLocal) {
        serverData = data;
      }
    }
  } catch {
    // Fall back to rule-based offline processing
  }

  // If server responded with valid intent, ground it in real app calculations
  if (serverData && serverData.intent) {
    return groundIntent(serverData.intent, serverData.parameters, serverData.reply, context, 'gemini');
  }

  // Otherwise, use offline rule-based intent parsing
  const offline = classifyOfflineQuery(query, context);
  return groundIntent(offline.intent, offline.parameters, offline.reply, context, 'rule-based');
}

/**
 * Offline rule-based intent classifier.
 */
export function classifyOfflineQuery(
  query: string,
  context: AskContextSnapshot
): { intent: string; parameters: any; reply: string } {
  const lower = query.toLowerCase();

  // 1. Capacity setting ("I only have 2 hours", "have 3h tonight")
  const capacityMatch = lower.match(/(?:only have|have|got)\s+(\d+(?:\.\d+)?)\s*(?:hours|hrs|h)/);
  if (capacityMatch) {
    const hours = parseFloat(capacityMatch[1]);
    return {
      intent: 'set_today_capacity',
      parameters: { hours },
      reply: `Let's adjust today's available study time to ${hours}h.`,
    };
  }

  // 2. Explain ranking ("why is this top", "what should I do first", "why")
  if (
    lower.includes('why') ||
    lower.includes('what should i do') ||
    lower.includes('top task') ||
    lower.includes('next up') ||
    lower.includes('first')
  ) {
    return {
      intent: 'explain_ranking',
      parameters: {},
      reply: 'Here is why this task is prioritized based on your deadline and study capacity.',
    };
  }

  // 3. Skip or drop ("what if I skip", "drop lab", "can I skip")
  if (lower.includes('skip') || lower.includes('drop') || lower.includes('let go')) {
    return {
      intent: 'what_if_skip',
      parameters: {},
      reply: 'Here is the consequence of skipping this item.',
    };
  }

  // 4. Move or delay ("what if I move", "delay", "push back")
  if (lower.includes('move') || lower.includes('delay') || lower.includes('postpone')) {
    return {
      intent: 'what_if_move',
      parameters: { days: 1 },
      reply: 'Testing the consequence of delaying this task.',
    };
  }

  // 5. Add task ("add", "due", "assignment")
  if (lower.startsWith('add') || lower.includes('due next') || lower.includes('due tomorrow')) {
    const candidateTasks = parseCourseworkText(query, context.now);
    if (candidateTasks.length > 0) {
      const top = candidateTasks[0];
      return {
        intent: 'add_task',
        parameters: {
          title: top.title,
          course: top.course,
          dueDateTime: top.dueDateTime,
          estimatedHours: top.estimatedHours,
          priority: top.priority,
          category: top.category,
        },
        reply: `Proposed adding "${top.title}".`,
      };
    }
  }

  // Off-topic or general
  if (lower.includes('essay') && (lower.includes('write') || lower.includes('topic'))) {
    return {
      intent: 'other',
      parameters: { isOffTopic: true },
      reply: "I'm focused on helping you triage your deadlines and study hours. I don't write essays, but I can help you find time to finish one!",
    };
  }

  return {
    intent: 'other',
    parameters: {},
    reply: 'Here is a quick overview of your current coursework load.',
  };
}

/**
 * Computes numbers strictly using real app algorithms and generates confirmation cards.
 */
export function groundIntent(
  intent: string,
  parameters: any,
  rawReply: string,
  context: AskContextSnapshot,
  source: 'gemini' | 'rule-based'
): GroundedAnswer {
  const incompleteTasks = context.tasks.filter((t) => !t.completed && !t.dropped);
  const { topRecommendation } = getSmartRecommendations(
    context.tasks,
    context.now,
    context.remainingEffortMap,
    context.capacitySettings
  );

  switch (intent) {
    case 'explain_ranking': {
      let targetTask = topRecommendation?.task;
      if (parameters?.taskId) {
        const found = incompleteTasks.find((t) => t.id === parameters.taskId);
        if (found) targetTask = found;
      } else if (parameters?.taskTitle) {
        const queryTitle = String(parameters.taskTitle).toLowerCase();
        const found = incompleteTasks.find((t) => t.title.toLowerCase().includes(queryTitle));
        if (found) targetTask = found;
      }

      if (!targetTask) {
        return {
          reply: "You don't have any active tasks right now.",
          source,
        };
      }

      const remainingEffort = typeof context.remainingEffortMap?.[targetTask.id] === 'number'
        ? context.remainingEffortMap[targetTask.id]
        : targetTask.estimatedHours;
      const scoreAnalysis = calculateTaskScore(
        targetTask,
        context.now,
        remainingEffort,
        context.capacitySettings
      );

      const hoursRem = Math.round(
        (new Date(targetTask.dueDateTime).getTime() - context.now.getTime()) / (1000 * 3600)
      );

      const reply = `"${targetTask.title}" (${targetTask.course}) is prioritized because it requires ~${remainingEffort}h of effort before ${formatRelativeTime(hoursRem)}.`;
      const reasoning = scoreAnalysis.explanation;

      return {
        reply,
        reasoning,
        source,
      };
    }

    case 'set_today_capacity': {
      const hours = Math.max(0.5, Math.min(16, Number(parameters?.hours) || 2));
      const dayNames: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const todayKey = dayNames[context.now.getDay()];

      const currentCapacity = context.capacitySettings.dailyWorkHours[todayKey] || 4;
      const dailyLoads = calculateDailyLoads(context.tasks, context.capacitySettings, context.now, 1);
      const demandHours = dailyLoads[0]?.demandHours || 0;

      const reply = `If you have ${hours}h available today (down from ${currentCapacity}h), you have ~${demandHours}h of assignments due today.`;

      const confirmation: GroundedConfirmation = {
        type: 'set_capacity',
        title: `Set today's focus hours to ${hours}h?`,
        description: `Temporarily updates your daily focus capacity to ${hours} hours for ${todayKey.toUpperCase()}.`,
        payload: { day: todayKey, hours },
        confirmLabel: 'Update study hours',
      };

      return {
        reply,
        reasoning: `Adjusting your focus hours lets the system recalibrate your buffer and flag any overloaded days accurately.`,
        source,
        confirmation,
      };
    }

    case 'what_if_skip': {
      let targetTask = incompleteTasks.find((t) => t.priority === 'low') || incompleteTasks[incompleteTasks.length - 1];
      if (parameters?.taskId) {
        const found = incompleteTasks.find((t) => t.id === parameters.taskId);
        if (found) targetTask = found;
      }

      if (!targetTask) {
        return {
          reply: 'You have no incomplete tasks to skip.',
          source,
        };
      }

      const effort = targetTask.estimatedHours;
      const reply = `Skipping "${targetTask.title}" (${targetTask.course}) would free up ~${effort} hours of study time today.`;

      const confirmation: GroundedConfirmation = {
        type: 'drop_task',
        title: `Let go of "${targetTask.title}"?`,
        description: `Marks this assignment as dropped without penalty or nagging.`,
        payload: { taskId: targetTask.id },
        confirmLabel: 'Let it go',
      };

      return {
        reply,
        reasoning: 'Dropping low-priority reading or optional work is a valid triage strategy when you are overloaded.',
        source,
        confirmation,
      };
    }

    case 'what_if_move': {
      const targetTask = topRecommendation?.task || incompleteTasks[0];
      if (!targetTask) {
        return {
          reply: 'You have no incomplete tasks to move.',
          source,
        };
      }

      const days = Math.max(1, Math.min(7, Number(parameters?.days) || 1));
      const simulation = simulateTaskDelay(targetTask, days, context.tasks, context.capacitySettings, context.now);

      const targetDate = new Date(context.now);
      targetDate.setDate(targetDate.getDate() + simulation.targetDayIndex);
      targetDate.setHours(23, 59, 0, 0);

      const confirmation: GroundedConfirmation = {
        type: 'reschedule_task',
        title: `Move "${targetTask.title}" to ${simulation.targetDayLabel}?`,
        description: simulation.consequenceSentence,
        payload: { taskId: targetTask.id, newDueIso: targetDate.toISOString() },
        confirmLabel: 'Move deadline',
      };

      return {
        reply: simulation.consequenceSentence,
        reasoning: `Postponing by ${days} day(s) shifts demand into ${simulation.targetDayLabel}.`,
        source,
        confirmation,
      };
    }

    case 'add_task': {
      const title = typeof parameters?.title === 'string' ? parameters.title.trim() : 'New Assignment';
      const course = typeof parameters?.course === 'string' ? parameters.course.trim().toUpperCase() : 'GENERAL';
      let dueDateTime = new Date(context.now.getTime() + 48 * 3600 * 1000).toISOString();
      if (parameters?.dueDateTime && !isNaN(new Date(parameters.dueDateTime).getTime())) {
        dueDateTime = new Date(parameters.dueDateTime).toISOString();
      }
      const estimatedHours = Math.max(0.25, Math.min(40, Number(parameters?.estimatedHours) || 2.0));
      const priority = ['urgent', 'high', 'medium', 'low'].includes(parameters?.priority)
        ? parameters.priority
        : 'medium';
      const category = ['assignment', 'lab', 'project', 'reading', 'quiz', 'exam'].includes(parameters?.category)
        ? parameters.category
        : 'assignment';

      const taskData = {
        title,
        course,
        dueDateTime,
        estimatedHours,
        priority,
        category,
        notes: typeof parameters?.notes === 'string' ? parameters.notes : '',
      };

      const confirmation: GroundedConfirmation = {
        type: 'add_task',
        title: `Add "${title}" (${course})?`,
        description: `Due ${formatRelativeTime(Math.round((new Date(dueDateTime).getTime() - context.now.getTime()) / 3600000))}, ~${estimatedHours}h estimated effort.`,
        payload: taskData,
        confirmLabel: 'Add task',
      };

      return {
        reply: `Proposed adding "${title}" to your schedule.`,
        source,
        confirmation,
      };
    }

    default: {
      if (parameters?.isOffTopic) {
        return {
          reply: "I'm focused on helping you triage your deadlines and manage your study schedule. Ask me about what to do next, adjusting your study hours, or testing what happens if you delay an assignment!",
          source,
        };
      }

      const totalHours = incompleteTasks.reduce((acc, t) => acc + t.estimatedHours, 0);
      return {
        reply: rawReply || `You have ${incompleteTasks.length} active assignments requiring ~${totalHours} total study hours.`,
        source,
      };
    }
  }
}
