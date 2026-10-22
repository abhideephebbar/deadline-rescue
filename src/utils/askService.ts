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
  clarificationOptions?: Array<{ label: string; query: string }>;
  suggestionChips?: string[];
  referencedTaskId?: string;
}

export interface AskMessageHistoryItem {
  role: 'user' | 'assistant';
  text: string;
  taskId?: string;
}

export interface AskContextSnapshot {
  tasks: Task[];
  remainingEffortMap?: Record<string, number>;
  capacitySettings: CapacitySettings;
  now: Date;
  history?: AskMessageHistoryItem[];
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'about', 'what', 'when', 'which', 'with', 'from',
  'this', 'that', 'have', 'only', 'will', 'should', 'could', 'would', 'does',
  'task', 'work', 'next', 'item', 'assignment', 'homework', 'please', 'can',
  'how', 'why', 'are', 'you', 'was', 'were', 'our', 'out', 'all'
]);

const DAY_NAME_KEYS: Record<string, DayOfWeek> = {
  sunday: 'sun',
  sun: 'sun',
  monday: 'mon',
  mon: 'mon',
  tuesday: 'tue',
  tue: 'tue',
  wednesday: 'wed',
  wed: 'wed',
  thursday: 'thu',
  thu: 'thu',
  friday: 'fri',
  fri: 'fri',
  saturday: 'sat',
  sat: 'sat',
};

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
      suggestionChips: ['Why is this my top task?', 'I only have 2 hours tonight', 'What should I do next?'],
    };
  }

  // 1. Check local small-talk and conversational queries FIRST (zero network latency)
  const localMatch = checkLocalSmallTalk(query, context);
  if (localMatch) {
    return localMatch;
  }

  let serverData: any = null;

  // 2. Attempt serverless API call with rich grounding facts
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

    const incomplete = context.tasks.filter((t) => !t.completed && !t.dropped);
    const { topRecommendation, rankedQueue, catchUpQueue } = getSmartRecommendations(
      context.tasks,
      context.now,
      context.remainingEffortMap,
      context.capacitySettings
    );

    const weeklyLoads = calculateDailyLoads(incomplete, context.capacitySettings, context.now, 7);
    const weeklyDemandHours = Math.round(weeklyLoads.reduce((a, b) => a + b.demandHours, 0) * 10) / 10;
    const weeklyCapacityHours = Math.round(weeklyLoads.reduce((a, b) => a + b.capacityHours, 0) * 10) / 10;
    const deficitHours = Math.max(0, Math.round((weeklyDemandHours - weeklyCapacityHours) * 10) / 10);

    const tasksDue48h = incomplete
      .filter((t) => {
        const diffHours = (new Date(t.dueDateTime).getTime() - context.now.getTime()) / 3600000;
        return diffHours >= 0 && diffHours <= 48;
      })
      .map((t) => ({ title: t.title, course: t.course }));

    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: query,
        snapshot: {
          tasks: compactTasks,
          now: context.now.toISOString(),
          facts: {
            topTask: topRecommendation?.task
              ? {
                  title: topRecommendation.task.title,
                  course: topRecommendation.task.course,
                  due: topRecommendation.task.dueDateTime,
                  hours: topRecommendation.task.estimatedHours,
                }
              : null,
            demandVsCapacity: { weeklyDemandHours, weeklyCapacityHours, deficitHours },
            tasksDue48h,
            catchUpCount: catchUpQueue.length,
            nextUp: rankedQueue.slice(1, 4).map((r) => ({ title: r.task.title })),
            history: context.history?.slice(-6) || [],
          },
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

  // 3. If server responded with valid intent, ground it in real app calculations
  if (serverData && serverData.intent) {
    return groundIntent(serverData.intent, serverData.parameters, serverData.reply, context, 'gemini');
  }

  // 4. Otherwise, use offline rule-based intent parsing
  const offline = classifyOfflineQuery(query, context);
  return groundIntent(offline.intent, offline.parameters, offline.reply, context, 'rule-based');
}

/**
 * Handles fast local small talk and conversational queries without a network request.
 */
export function checkLocalSmallTalk(
  query: string,
  context: AskContextSnapshot
): GroundedAnswer | null {
  const lower = query.toLowerCase().trim();

  const incompleteTasks = context.tasks.filter((t) => !t.completed && !t.dropped);
  const { topRecommendation } = getSmartRecommendations(
    context.tasks,
    context.now,
    context.remainingEffortMap,
    context.capacitySettings
  );

  // Greetings
  if (/\b(hi|hello|hey|yo|howdy|greetings|good morning|good afternoon|good evening)\b/i.test(lower)) {
    if (incompleteTasks.length === 0) {
      return {
        reply: "Hey! You don't have any tasks scheduled right now. Add an assignment or paste deadlines to get started.",
        source: 'rule-based',
        suggestionChips: ['Add a task', 'Paste deadlines'],
      };
    }

    if (topRecommendation?.task) {
      const hoursUntilDue = Math.round(
        (new Date(topRecommendation.task.dueDateTime).getTime() - context.now.getTime()) / 3600000
      );
      const dueStr = formatRelativeTime(hoursUntilDue);
      const dailyLoads = calculateDailyLoads(incompleteTasks, context.capacitySettings, context.now, 7);
      const todayLoad = dailyLoads[0];
      const todayStatus =
        todayLoad && todayLoad.demandHours > todayLoad.capacityHours
          ? `You have ~${todayLoad.demandHours}h planned against ${todayLoad.capacityHours}h capacity today.`
          : 'You look on track today.';

      return {
        reply: `Hey! Your top task is ${topRecommendation.task.title}, ${dueStr.toLowerCase()}. ${todayStatus}`,
        source: 'rule-based',
        referencedTaskId: topRecommendation.task.id,
        suggestionChips: ['Why is this my top task?', 'I only have 2 hours tonight', 'What should I do next?'],
      };
    }

    return {
      reply: 'Hi! How can I help you triage your coursework today?',
      source: 'rule-based',
      suggestionChips: ['Why is this my top task?', 'I only have 2 hours tonight', 'What should I do next?'],
    };
  }

  // Thanks / Gratitude
  if (/\b(thanks|thank you|thx|appreciate it|thank u)\b/i.test(lower)) {
    return {
      reply: "You're welcome! Let me know if you need to adjust anything else.",
      source: 'rule-based',
      suggestionChips: ['Why is this my top task?', 'I only have 2 hours tonight'],
    };
  }

  // Affirmations
  if (/^((ok|okay|cool|sounds good|got it|great|perfect|awesome|bet|nice)\b[\s.!]*)+$/i.test(lower)) {
    return {
      reply: "Sounds good! I'm here whenever you want to check your deadlines or study hours.",
      source: 'rule-based',
      suggestionChips: ['Why is this my top task?', 'I only have 2 hours tonight'],
    };
  }

  // Capabilities / Help / What can you do
  if (/\b(help|what can you do|how do you work|how does this work|features|commands)\b/i.test(lower)) {
    const totalHours = incompleteTasks.reduce((acc, t) => acc + t.estimatedHours, 0);
    const topTitle = topRecommendation?.task ? `"${topRecommendation.task.title}"` : 'None';

    return {
      reply: `I help you triage your deadlines and plan realistic study hours without guilt. Right now you have ${incompleteTasks.length} active assignments (~${totalHours}h total effort), with ${topTitle} as your top recommendation. You can ask me what to do next, update your focus hours, or simulate delaying a deadline.`,
      source: 'rule-based',
      referencedTaskId: topRecommendation?.task?.id,
      suggestionChips: ['Why is this my top task?', 'I only have 2 hours tonight', 'What if I delay this task?'],
    };
  }

  return null;
}

/**
 * Resolves pronouns ("it", "that one", "this task") against session history.
 */
export function resolvePronounTask(
  query: string,
  history?: AskMessageHistoryItem[],
  tasks: Task[] = []
): Task | null {
  if (!history || history.length === 0) return null;
  const lower = query.toLowerCase();

  const containsPronoun = /\b(it|that one|this task|that task|the assignment|this assignment)\b/i.test(lower);
  if (!containsPronoun) return null;

  // Search backward in history for a referenced task ID
  for (let i = history.length - 1; i >= 0; i--) {
    const item = history[i];
    if (item.taskId) {
      const found = tasks.find((t) => t.id === item.taskId);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Fuzzy matches coursework query against task titles and course codes.
 */
export function findMatchingTasks(query: string, tasks: Task[]): Task[] {
  const incomplete = tasks.filter((t) => !t.completed && !t.dropped);
  const lower = query.toLowerCase();

  const cleanLower = lower.replace(/[^a-z0-9\s]/g, ' ');
  const squishedQuery = lower.replace(/[^a-z0-9]/g, '');

  // 1. Direct course match (e.g. "CS 350", "Math 220", "cs350")
  const courseMatches = incomplete.filter((t) => {
    if (!t.course) return false;
    const cLower = t.course.toLowerCase();
    const cSquished = cLower.replace(/[^a-z0-9]/g, '');
    return (
      cleanLower.includes(cLower) ||
      (cSquished.length >= 3 && squishedQuery.includes(cSquished))
    );
  });
  if (courseMatches.length > 0) {
    return courseMatches;
  }

  // 2. Exact substring match in title (both directions)
  const titleSubstringMatches = incomplete.filter((t) => {
    const tLower = t.title.toLowerCase();
    return lower.includes(tLower) || tLower.includes(cleanLower.trim());
  });
  if (titleSubstringMatches.length > 0) {
    return titleSubstringMatches;
  }

  // 3. Keyword token matching (words of length >= 3 not in STOP_WORDS)
  const tokens = lower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((tok) => tok.length >= 3 && !STOP_WORDS.has(tok));

  if (tokens.length === 0) return [];

  const scored = incomplete
    .map((t) => {
      const titleLower = t.title.toLowerCase();
      const courseLower = t.course.toLowerCase();
      let matchCount = 0;
      for (const tok of tokens) {
        if (titleLower.includes(tok) || courseLower.includes(tok)) {
          matchCount++;
        }
      }
      return { task: t, matchCount };
    })
    .filter((item) => item.matchCount > 0);

  if (scored.length > 0) {
    const maxMatches = Math.max(...scored.map((s) => s.matchCount));
    return scored.filter((s) => s.matchCount === maxMatches).map((s) => s.task);
  }

  return [];
}

/**
 * Parses target day from student query (e.g. "tonight", "tomorrow", "friday").
 */
export function parseTargetDay(query: string, now: Date): { dayKey: DayOfWeek; dayOffset: number } {
  const lower = query.toLowerCase();
  const dayNames: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayDay = now.getDay();
  const todayKey = dayNames[todayDay];

  if (/\b(tomorrow|tmrw)\b/i.test(lower)) {
    const nextDay = (todayDay + 1) % 7;
    return { dayKey: dayNames[nextDay], dayOffset: 1 };
  }

  const inNDaysMatch = lower.match(/\bin\s+(\d+)\s*days?\b/i);
  if (inNDaysMatch) {
    const offset = parseInt(inNDaysMatch[1], 10);
    const targetDay = (todayDay + offset) % 7;
    return { dayKey: dayNames[targetDay], dayOffset: offset };
  }

  // Check explicit weekday mentions
  for (const [name, key] of Object.entries(DAY_NAME_KEYS)) {
    const regex = new RegExp(`\\b${name}\\b`, 'i');
    if (regex.test(lower)) {
      const targetIndex = dayNames.indexOf(key);
      let diff = targetIndex - todayDay;
      if (diff <= 0) diff += 7;
      return { dayKey: key, dayOffset: diff };
    }
  }

  return { dayKey: todayKey, dayOffset: 0 };
}

/**
 * Offline rule-based intent classifier.
 */
export function classifyOfflineQuery(
  query: string,
  context: AskContextSnapshot
): { intent: string; parameters: any; reply: string } {
  const lower = query.toLowerCase();

  // Prompt injection / system override protection
  if (
    /ignore previous instructions|system prompt|developer mode|override instructions|<script>/i.test(lower)
  ) {
    return {
      intent: 'other',
      parameters: { isOffTopic: true },
      reply: "I'm your Deadline Rescue study triage assistant. I only help manage deadlines and plan realistic focus hours.",
    };
  }

  // 1. Capacity setting ("I only have 2 hours", "have 3h tonight", "have 2 hours tomorrow")
  const capacityMatch = lower.match(/(?:only have|have|got)\s+(\d+(?:\.\d+)?)\s*(?:hours|hrs|h)/i);
  if (capacityMatch) {
    const hours = parseFloat(capacityMatch[1]);
    const { dayKey, dayOffset } = parseTargetDay(lower, context.now);
    return {
      intent: 'set_today_capacity',
      parameters: { hours, dayKey, dayOffset },
      reply: `Let's adjust your study time to ${hours}h.`,
    };
  }

  // Check for pronoun reference from history
  const pronounTask = resolvePronounTask(query, context.history, context.tasks);

  // 2. Explain ranking ("why is this top", "what should I do first", "why", "coursework questions")
  if (
    /\b(why|what should i do|top task|next up|do first|what's next|whats next)\b/i.test(lower)
  ) {
    return {
      intent: 'explain_ranking',
      parameters: pronounTask ? { taskId: pronounTask.id } : {},
      reply: 'Here is why this task is prioritized based on your deadline and study capacity.',
    };
  }

  // 3. Skip or drop ("what if I skip", "drop lab", "can I skip", "let go")
  if (/\b(skip|drop|let go|forgive)\b/i.test(lower)) {
    if (pronounTask) {
      return {
        intent: 'what_if_skip',
        parameters: { taskId: pronounTask.id },
        reply: `Testing consequence of skipping "${pronounTask.title}".`,
      };
    }

    const incomplete = context.tasks.filter((t) => !t.completed && !t.dropped);
    const matches = findMatchingTasks(query, context.tasks);
    if (matches.length === 1) {
      return {
        intent: 'what_if_skip',
        parameters: { taskId: matches[0].id },
        reply: `Testing consequence of skipping "${matches[0].title}".`,
      };
    } else if (matches.length > 1) {
      return {
        intent: 'clarify',
        parameters: {
          clarificationOptions: matches.map((m) => ({
            label: `${m.course}: ${m.title}`,
            query: `What if I skip ${m.title}?`,
          })),
        },
        reply: 'I found multiple matching assignments. Which one did you mean?',
      };
    } else if (incomplete.length > 0) {
      return {
        intent: 'clarify',
        parameters: {
          clarificationOptions: incomplete.slice(0, 5).map((m) => ({
            label: `${m.course}: ${m.title}`,
            query: `What if I skip ${m.title}?`,
          })),
        },
        reply: 'Which assignment are you thinking of skipping?',
      };
    }

    return {
      intent: 'what_if_skip',
      parameters: {},
      reply: 'You have no incomplete tasks to skip.',
    };
  }

  // 4. Move or delay ("what if I move", "delay", "push back", "postpone")
  if (/\b(move|delay|push back|postpone)\b/i.test(lower)) {
    const daysMatch = lower.match(/\b(\d+)\s*(?:days?|d)\b/i);
    const days = daysMatch ? parseInt(daysMatch[1], 10) : 1;

    if (pronounTask) {
      return {
        intent: 'what_if_move',
        parameters: { taskId: pronounTask.id, days },
        reply: `Testing consequence of delaying "${pronounTask.title}".`,
      };
    }

    const incomplete = context.tasks.filter((t) => !t.completed && !t.dropped);
    const matches = findMatchingTasks(query, context.tasks);
    if (matches.length === 1) {
      return {
        intent: 'what_if_move',
        parameters: { taskId: matches[0].id, days },
        reply: `Testing consequence of delaying "${matches[0].title}".`,
      };
    } else if (matches.length > 1) {
      return {
        intent: 'clarify',
        parameters: {
          clarificationOptions: matches.map((m) => ({
            label: `${m.course}: ${m.title}`,
            query: `What if I move ${m.title} by ${days} day?`,
          })),
        },
        reply: 'I found multiple matching assignments. Which one did you mean?',
      };
    } else if (incomplete.length > 0) {
      return {
        intent: 'clarify',
        parameters: {
          clarificationOptions: incomplete.slice(0, 5).map((m) => ({
            label: `${m.course}: ${m.title}`,
            query: `What if I move ${m.title} by ${days} day?`,
          })),
        },
        reply: 'Which assignment would you like to move?',
      };
    }

    return {
      intent: 'what_if_move',
      parameters: { days },
      reply: 'You have no incomplete tasks to move.',
    };
  }

  // 5. Add task ("add", "track", "due next", "due tomorrow")
  if (/^(add|track)\b/i.test(lower) || /\b(due next|due tomorrow|due on)\b/i.test(lower)) {
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

  // 6. Off-topic essay or non-triage queries
  if (
    /\b(essay|write|code|solve|cheat|quiz answer|exam answer)\b/i.test(lower) &&
    !/\b(due|submit|hours|time|when)\b/i.test(lower)
  ) {
    return {
      intent: 'other',
      parameters: { isOffTopic: true },
      reply: "I'm focused on helping you triage your deadlines and study hours. I don't write essays or solve homework, but I can help you find time to finish them!",
    };
  }

  // 7. Specific course questions ("What's due for CS 350?", "CS 350")
  const specificCourseMatches = findMatchingTasks(query, context.tasks);
  if (specificCourseMatches.length > 0) {
    if (specificCourseMatches.length === 1) {
      return {
        intent: 'explain_ranking',
        parameters: { taskId: specificCourseMatches[0].id },
        reply: `Here are the details for ${specificCourseMatches[0].title}.`,
      };
    } else {
      return {
        intent: 'clarify',
        parameters: {
          clarificationOptions: specificCourseMatches.map((m) => ({
            label: `${m.course}: ${m.title}`,
            query: `Why is ${m.title} prioritized?`,
          })),
        },
        reply: `I found ${specificCourseMatches.length} tasks matching "${query}". Which one would you like to review?`,
      };
    }
  }

  // 8. Unknown input / gibberish fallback
  return {
    intent: 'unknown',
    parameters: {},
    reply: "I didn't quite get that. Here are some things you can ask me:",
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
    case 'chat': {
      return {
        reply: rawReply || 'How can I help you manage your coursework today?',
        source,
        suggestionChips: ['Why is this my top task?', 'I only have 2 hours tonight', 'What if I delay my next deadline?'],
      };
    }

    case 'clarify': {
      const options = Array.isArray(parameters?.clarificationOptions)
        ? parameters.clarificationOptions
        : [];
      return {
        reply: rawReply || 'I found multiple matching assignments. Which one did you mean?',
        source,
        clarificationOptions: options,
      };
    }

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
          suggestionChips: ['Add a task', 'Paste deadlines'],
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
        referencedTaskId: targetTask.id,
        suggestionChips: [
          `What if I move ${targetTask.title} by 1 day?`,
          `What if I skip ${targetTask.title}?`,
          'I only have 2 hours tonight',
        ],
      };
    }

    case 'set_today_capacity': {
      const hours = Math.max(0.5, Math.min(16, Number(parameters?.hours) || 2));
      const dayNames: DayOfWeek[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const targetDayKey: DayOfWeek = parameters?.dayKey || dayNames[context.now.getDay()];
      const dayOffset = Number(parameters?.dayOffset) || 0;

      const currentCapacity = context.capacitySettings.dailyWorkHours[targetDayKey] || 4;
      const dailyLoads = calculateDailyLoads(context.tasks, context.capacitySettings, context.now, 7);
      const targetDayLoad = dailyLoads[dayOffset] || dailyLoads[0];
      const demandHours = targetDayLoad?.demandHours || 0;

      const dayLabel = dayOffset === 0 ? 'today' : dayOffset === 1 ? 'tomorrow' : targetDayKey.toUpperCase();
      const reply = `If you have ${hours}h available ${dayLabel} (adjusted from ${currentCapacity}h), you have ~${demandHours}h of assignments planned.`;

      const confirmation: GroundedConfirmation = {
        type: 'set_capacity',
        title: `Set ${dayLabel}'s study hours to ${hours}h?`,
        description: `Updates your focus capacity to ${hours} hours for ${targetDayKey.toUpperCase()}.`,
        payload: { day: targetDayKey, hours },
        confirmLabel: 'Update study hours',
      };

      return {
        reply,
        reasoning: `Adjusting focus hours updates your workload buffer and accurately flags overloaded days.`,
        source,
        confirmation,
        suggestionChips: ['Why is this my top task?', 'What if I delay a task?'],
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
          suggestionChips: ['Add a task', 'Check my schedule'],
        };
      }

      const effort = targetTask.estimatedHours;
      const reply = `Skipping "${targetTask.title}" (${targetTask.course}) would free up ~${effort} hours of study time.`;

      const confirmation: GroundedConfirmation = {
        type: 'drop_task',
        title: `Let go of "${targetTask.title}"?`,
        description: `Marks this assignment as dropped without penalty or guilt.`,
        payload: { taskId: targetTask.id },
        confirmLabel: 'Let it go',
      };

      return {
        reply,
        reasoning: 'Dropping low-priority reading or optional work is a valid triage strategy when you are overloaded.',
        source,
        confirmation,
        referencedTaskId: targetTask.id,
        suggestionChips: ['Why is this my top task?', 'I only have 2 hours tonight'],
      };
    }

    case 'what_if_move': {
      let targetTask = topRecommendation?.task || incompleteTasks[0];
      if (parameters?.taskId) {
        const found = incompleteTasks.find((t) => t.id === parameters.taskId);
        if (found) targetTask = found;
      }

      if (!targetTask) {
        return {
          reply: 'You have no incomplete tasks to move.',
          source,
          suggestionChips: ['Add a task'],
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
        referencedTaskId: targetTask.id,
        suggestionChips: ['Why is this my top task?', 'I only have 2 hours tonight'],
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
        suggestionChips: ['Why is this my top task?', 'I only have 2 hours tonight'],
      };
    }

    case 'unknown':
    default: {
      if (parameters?.isOffTopic) {
        return {
          reply: "I'm focused on helping you triage your deadlines and manage your study schedule. Ask me about what to do next, adjusting your study hours, or testing what happens if you delay an assignment!",
          source,
          suggestionChips: ['Why is this my top task?', 'I only have 2 hours tonight', 'What if I delay this task?'],
        };
      }

      return {
        reply: rawReply || "I didn't quite get that. Here are some things you can ask me:",
        source,
        suggestionChips: ['Why is this my top task?', 'I only have 2 hours tonight', 'What if I delay a deadline?'],
      };
    }
  }
}
