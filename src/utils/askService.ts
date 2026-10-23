import { Task, CapacitySettings, DayOfWeek, StopwatchSession } from '../types';
import { calculateTaskScore, getSmartRecommendations } from './ranking';
import { calculateDailyLoads } from './capacity';
import { simulateTaskDelay } from './forecast';
import { parseCourseworkText } from './importParser';
import { formatRelativeTime } from './date';
import { buildAppFacts, AppFacts } from './facts';

export type FallbackReason = 'no_key' | 'model_unavailable' | 'rate_limited' | 'error' | 'server_error';

export interface PendingOffer {
  kind: 'start_task';
  taskId: string;
}

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
  fallbackReason?: FallbackReason;
  confirmation?: GroundedConfirmation;
  clarificationOptions?: Array<{ label: string; query: string }>;
  suggestionChips?: string[];
  referencedTaskId?: string;
  pendingOffer?: PendingOffer;
  cooldownTaskId?: string;
}

export interface AskMessageHistoryItem {
  role: 'user' | 'assistant';
  text: string;
  taskId?: string;
  pendingOffer?: PendingOffer;
  suggestionChips?: string[];
}

export interface AskContextSnapshot {
  tasks: Task[];
  remainingEffortMap?: Record<string, number>;
  capacitySettings: CapacitySettings;
  now: Date;
  history?: AskMessageHistoryItem[];
  offeredTaskIds?: string[];
  onStartTask?: (taskId: string) => void;
  stopwatchSessions?: StopwatchSession[];
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'about', 'what', 'when', 'which', 'with', 'from',
  'this', 'that', 'have', 'only', 'will', 'should', 'could', 'would', 'does',
  'task', 'work', 'next', 'item', 'assignment', 'homework', 'please', 'can',
  'how', 'why', 'are', 'you', 'was', 'were', 'our', 'out', 'all', 'record',
]);

const ACRONYM_MAP: Record<string, string> = {
  os: 'operating systems',
  dbms: 'database',
  algo: 'algorithms',
  ds: 'data structures',
  econ: 'economics',
  stats: 'statistics',
  calc: 'calculus',
};

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
 * Checks if text is an affirmative confirmation.
 * Accepts: yes, yeah, yep, yup, sure, ok do it, let's go, go ahead, please, do it.
 */
export function isAffirmative(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const clean = text.toLowerCase().trim().replace(/[.,!?;:]/g, '');
  return /^(yes|yeah|yep|yup|sure|ok do it|okay do it|lets go|let's go|go ahead|please|do it|yes please|sure thing)$/i.test(
    clean
  );
}

/**
 * Checks if text is a negative decline.
 * Accepts: no, nah, not now, later, not today, nope, no thanks.
 */
export function isNegative(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  const clean = text.toLowerCase().trim().replace(/[.,!?;:]/g, '');
  return /^(no|nah|not now|later|not today|nope|no thanks)$/i.test(clean);
}

/**
 * Checks whether user query asks about priorities, what to do next, or study hours/time.
 */
export function isPriorityOrTimeQuery(message: string): boolean {
  if (!message || typeof message !== 'string') return false;
  const lower = message.toLowerCase().trim();
  return (
    /\b(priority|priorities|top task|do first|first thing)\b/i.test(lower) ||
    /\b(what(\s+should\s+i|\s+to|\s+do\s+i|\s+can\s+i)?\s+(do|work\s+on)?\s*(next|now|first)?)\b/i.test(lower) ||
    /\b(where\s+(to|do\s+i|should\s+i)\s+(start|begin))\b/i.test(lower) ||
    /\b(whats\s+next|what's\s+next)\b/i.test(lower) ||
    /\b(hours?|tonight|today|time|available)\b/i.test(lower)
  );
}

/**
 * Pure function determining whether the assistant may offer to start a task.
 * Constraints:
 * 1. At most once per task per session.
 * 2. Never in two consecutive replies.
 * 3. Only when user query is about priorities, what to do next, or time.
 */
export function shouldOfferStart(
  state: {
    offeredTaskIds?: Set<string> | string[];
    lastReplyHadOffer?: boolean;
    history?: AskMessageHistoryItem[];
    targetTaskId?: string;
  },
  message: string
): boolean {
  if (!message || typeof message !== 'string') return false;

  // 1. Must be about priorities, what to do next, or time
  if (!isPriorityOrTimeQuery(message)) {
    return false;
  }

  // 2. Never in two consecutive replies
  const lastHadOffer =
    state.lastReplyHadOffer ??
    Boolean(
      state.history &&
        (() => {
          for (let i = state.history.length - 1; i >= 0; i--) {
            if (state.history[i].role === 'assistant') {
              return Boolean(state.history[i].pendingOffer);
            }
          }
          return false;
        })()
    );

  if (lastHadOffer) {
    return false;
  }

  // 3. At most once per task per session
  if (state.targetTaskId) {
    const offered = state.offeredTaskIds;
    if (offered instanceof Set && offered.has(state.targetTaskId)) {
      return false;
    }
    if (Array.isArray(offered) && offered.includes(state.targetTaskId)) {
      return false;
    }
  }

  return true;
}

/**
 * Determines whether a message is schedule-related.
 * Keywords: due, deadline, task, assignment, lab, exam, schedule, plan, week, today, tomorrow, hours, priority, skip, move, add;
 * or a task title/course match (excluding concept questions);
 * or the last assistant message made a schedule offer.
 */
export function isScheduleRelated(
  message: string,
  history?: AskMessageHistoryItem[],
  tasks: Task[] = []
): boolean {
  if (!message || typeof message !== 'string') return false;
  const lower = message.toLowerCase().trim();

  // 1. Explicit schedule keywords
  const scheduleKeywords =
    /\b(due|deadline|deadlines|task|tasks|assignment|assignments|lab|labs|exam|exams|quiz|quizzes|project|projects|reading|readings|schedule|schedules|plan|planning|week|today|tomorrow|tonight|hours|hour|hrs|priority|priorities|skip|move|postpone|delay|add|drop|overdue|buffer|capacity|workload|first|next|start)\b/i;
  if (scheduleKeywords.test(lower)) {
    return true;
  }

  // 2. Study advice / concept queries are NOT schedule-related
  const isStudyAdviceQuery =
    /^(how\s+(do\s+i|can\s+i|to)\s+(revise|study|understand|learn)|what\s+is|explain\b)/i.test(lower);
  if (!isStudyAdviceQuery && tasks.length > 0) {
    const matches = findMatchingTasks(message, tasks);
    if (matches.length > 0) {
      return true;
    }
  }

  // 3. Last assistant message was a schedule offer
  if (history && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === 'assistant') {
        if (history[i].pendingOffer) {
          return true;
        }
        break;
      }
    }
  }

  return false;
}

/**
 * Filters suggestion chips to respect strict budget rules:
 * - Max 3
 * - Never repeat identical chips in consecutive messages
 */
export function sanitizeChips(
  chips?: string[],
  previousChips?: string[]
): string[] | undefined {
  if (!chips || chips.length === 0) return undefined;
  const sliced = chips.slice(0, 3);
  if (previousChips && previousChips.length === sliced.length) {
    const same = sliced.every((c, idx) => c.toLowerCase() === previousChips[idx]?.toLowerCase());
    if (same) return undefined;
  }
  return sliced;
}

/**
 * Handles fast local small talk and conversational queries without a network request.
 * Greetings -> one short friendly line with no task data ("Hey! What's up?").
 * Thanks -> "Anytime."
 * Distress -> keeps empathy without automatically pushing tasks; offers two chips ("Make a small plan", "Just talk").
 */
export function checkLocalSmallTalk(
  query: string,
  _context?: AskContextSnapshot,
  _facts?: AppFacts
): GroundedAnswer | null {
  const lower = query.toLowerCase().trim();

  // 1. Distress / Overwhelmed ("I'm so overwhelmed", "stressed", "swamped", "too much")
  if (/\b(overwhelmed|stressed|swamped|too much|can't do this|burnout|panicking|freaking out)\b/i.test(lower)) {
    return {
      reply: "Take a deep breath—having a packed week is really tough, but you don't have to tackle it all at once. Take it one step at a time.",
      source: 'rule-based',
      suggestionChips: ['Make a small plan', 'Just talk'],
    };
  }

  // 2. Greetings
  if (/\b(hi|hello|hey|yo|howdy|greetings|good morning|good afternoon|good evening)\b/i.test(lower)) {
    return {
      reply: "Hey! What's up?",
      source: 'rule-based',
    };
  }

  // 3. Thanks / Gratitude
  if (/\b(thanks|thank you|thx|appreciate it|thank u)\b/i.test(lower)) {
    return {
      reply: 'Anytime.',
      source: 'rule-based',
    };
  }

  // 4. Casual affirmations (e.g. "ok", "got it", "cool")
  if (/^((ok|okay|cool|sounds good|got it|great|perfect|awesome|bet|nice)\b[\s.!]*)+$/i.test(lower)) {
    return {
      reply: 'Sounds good!',
      source: 'rule-based',
    };
  }

  // 5. Capabilities / Help / What can you do
  if (/\b(help|what can you do|how do you work|how does this work|features|commands)\b/i.test(lower)) {
    return {
      reply: 'I help you triage deadlines, plan realistic study hours, and test schedule changes without guilt. What would you like to check?',
      source: 'rule-based',
      suggestionChips: ['Why is this my top task?', 'I only have 2 hours tonight'],
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

  // 1. Direct course match (e.g. "CS 350", "Math 220", "cs350", "DBMS")
  const courseMatches = incomplete.filter((t) => {
    if (!t.course) return false;
    const cLower = t.course.toLowerCase();
    const cSquished = cLower.replace(/[^a-z0-9]/g, '');
    return (
      cleanLower.includes(cLower) ||
      (cSquished.length >= 2 && squishedQuery.includes(cSquished))
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

  // 3. Expand acronyms in query (e.g. "os" -> "operating systems", "dbms" -> "database")
  const expandedTokens: string[] = [];
  const rawTokens = lower
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((tok) => tok.length >= 2 && !STOP_WORDS.has(tok));

  for (const tok of rawTokens) {
    expandedTokens.push(tok);
    if (ACRONYM_MAP[tok]) {
      ACRONYM_MAP[tok].split(' ').forEach((w) => expandedTokens.push(w));
    }
  }

  if (expandedTokens.length === 0) return [];

  const scored = incomplete
    .map((t) => {
      const titleLower = t.title.toLowerCase();
      const courseLower = t.course.toLowerCase();
      let matchCount = 0;
      for (const tok of expandedTokens) {
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
 * Resolves a task reference string from a tool call or user query into a concrete Task.
 */
export function resolveTaskRef(
  taskRef: string | undefined,
  context: AskContextSnapshot
): { task?: Task; isAmbiguous?: boolean; candidates?: Task[]; notFound?: boolean } {
  const incomplete = context.tasks.filter((t) => !t.completed && !t.dropped);
  if (incomplete.length === 0) {
    return { notFound: true, candidates: [] };
  }

  // 0. Check exact ID match first
  if (taskRef) {
    const byId = incomplete.find((t) => t.id === taskRef);
    if (byId) {
      return { task: byId };
    }
  }

  // 1. If taskRef is missing, 'top', 'first', or refers to top recommendation
  if (
    !taskRef ||
    taskRef.toLowerCase() === 'top' ||
    taskRef.toLowerCase() === 'first' ||
    taskRef.toLowerCase() === 'next'
  ) {
    const { topRecommendation } = getSmartRecommendations(
      context.tasks,
      context.now,
      context.remainingEffortMap,
      context.capacitySettings
    );
    if (topRecommendation?.task) {
      return { task: topRecommendation.task };
    }
    return { task: incomplete[0] };
  }

  // 2. Check for pronoun reference from history
  const pronounTask = resolvePronounTask(taskRef, context.history, context.tasks);
  if (pronounTask) {
    return { task: pronounTask };
  }

  // 3. Fuzzy search by title & course code
  const matches = findMatchingTasks(taskRef, context.tasks);
  if (matches.length === 1) {
    return { task: matches[0] };
  }
  if (matches.length > 1) {
    return { isAmbiguous: true, candidates: matches };
  }

  return { notFound: true, candidates: incomplete };
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

  // Capacity setting ("I only have 2 hours", "have 3h tonight", "have 2 hours tomorrow")
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

  // Explain ranking ("why is this top", "what should I do first", "why", "coursework questions")
  if (
    /\b(why|what should i do|top task|next up|do first|what's next|whats next)\b/i.test(lower)
  ) {
    return {
      intent: 'explain_ranking',
      parameters: pronounTask ? { taskId: pronounTask.id } : {},
      reply: 'Here is why this task is prioritized based on your deadline and study capacity.',
    };
  }

  // Skip or drop ("what if I skip", "drop lab", "can I skip", "let go")
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

  // Move or delay ("what if I move", "delay", "push back", "postpone")
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

  // Add task ("add", "track", "due next", "due tomorrow")
  if (/^(add|track)\b/i.test(lower) || /\b(due next|due tomorrow|due on)\b/i.test(lower)) {
    const candidateTasks = parseCourseworkText(query, context.now);
    if (candidateTasks.length > 0) {
      const top = candidateTasks[0];
      let course = top.course;
      if (course === 'GENERAL') {
        const uppercaseMatch = query.match(/\b([A-Z]{2,6})\b/);
        if (uppercaseMatch && !['ADD', 'DUE', 'PM', 'AM'].includes(uppercaseMatch[1])) {
          course = uppercaseMatch[1];
        }
      }
      return {
        intent: 'add_task',
        parameters: {
          title: top.title,
          course,
          dueDateTime: top.dueDateTime,
          estimatedHours: top.estimatedHours,
          priority: top.priority,
          category: top.category,
        },
        reply: `Proposed adding "${top.title}".`,
      };
    }
  }

  // Off-topic essay or non-triage queries
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

  // Specific course questions ("What's due for CS 350?", "CS 350")
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

  // Unknown input / gibberish fallback
  return {
    intent: 'unknown',
    parameters: {},
    reply: "I didn't quite get that. Here are some things you can ask me:",
  };
}

/**
 * Grounds a tool call proposed by Gemini or offline parser in deterministic local logic.
 */
export function groundToolCall(
  toolName: string,
  args: Record<string, any>,
  modelReply: string,
  context: AskContextSnapshot,
  source: 'gemini' | 'rule-based',
  facts: AppFacts,
  fallbackReason?: FallbackReason
): GroundedAnswer {
  switch (toolName) {
    case 'offer_start_task': {
      const resolution = resolveTaskRef(args.taskRef, context);
      const targetTask = resolution.task;
      if (!targetTask) {
        return {
          reply: modelReply || "You don't have any active assignments scheduled right now.",
          source,
          fallbackReason,
        };
      }

      const canOffer = shouldOfferStart(
        {
          offeredTaskIds: context.offeredTaskIds,
          history: context.history,
          targetTaskId: targetTask.id,
        },
        'what to do next'
      );

      return {
        reply: modelReply || `Your top priority right now is "${targetTask.title}" (${targetTask.course}).`,
        source,
        fallbackReason,
        referencedTaskId: targetTask.id,
        pendingOffer: canOffer ? { kind: 'start_task', taskId: targetTask.id } : undefined,
      };
    }

    case 'explain_task': {
      const resolution = resolveTaskRef(args.taskRef, context);
      if (resolution.isAmbiguous && resolution.candidates) {
        return {
          reply: 'I found multiple matching assignments. Which one would you like to review?',
          source,
          fallbackReason,
          clarificationOptions: resolution.candidates.map((m) => ({
            label: `${m.course}: ${m.title}`,
            query: `Why is ${m.title} prioritized?`,
          })),
        };
      }

      const targetTask = resolution.task;
      if (!targetTask) {
        return {
          reply: "You don't have any active assignments scheduled right now.",
          source,
          fallbackReason,
        };
      }

      const remEffort =
        typeof context.remainingEffortMap?.[targetTask.id] === 'number'
          ? context.remainingEffortMap[targetTask.id]
          : targetTask.estimatedHours;
      const scoreAnalysis = calculateTaskScore(
        targetTask,
        context.now,
        remEffort,
        context.capacitySettings
      );
      const hoursDiff = Math.round((new Date(targetTask.dueDateTime).getTime() - context.now.getTime()) / 3600000);
      const dueStr = formatRelativeTime(hoursDiff);

      const targetTaskLogged =
        (facts.topTask?.id === targetTask.id
          ? facts.topTask.loggedHours
          : facts.tasksDue48h.find((t) => t.id === targetTask.id)?.loggedHours) ?? 0;
      const loggedNotice = targetTaskLogged > 0 ? ` (${targetTaskLogged}h spent so far)` : '';

      // Client verifies plain language explanation grounded in facts (no "want to get started?" text)
      const verifiedReply = `"${targetTask.title}" (${targetTask.course}) is prioritized because it requires ~${remEffort}h of effort ${dueStr.toLowerCase()}.${loggedNotice}`;

      const canOffer = shouldOfferStart(
        {
          offeredTaskIds: context.offeredTaskIds,
          history: context.history,
          targetTaskId: targetTask.id,
        },
        'what to do next'
      );

      return {
        reply: modelReply && !modelReply.includes('NaN') && modelReply.length > 5 ? modelReply : verifiedReply,
        reasoning: scoreAnalysis.explanation,
        source,
        fallbackReason,
        referencedTaskId: targetTask.id,
        pendingOffer: canOffer ? { kind: 'start_task', taskId: targetTask.id } : undefined,
      };
    }

    case 'propose_add_task': {
      const title = typeof args.title === 'string' ? args.title.trim() : 'New Assignment';
      const course = typeof args.course === 'string' ? args.course.trim().toUpperCase() : 'GENERAL';
      let dueDateTime = new Date(context.now.getTime() + 48 * 3600 * 1000).toISOString();
      if (args.dueDateTime && !isNaN(new Date(args.dueDateTime).getTime())) {
        dueDateTime = new Date(args.dueDateTime).toISOString();
      }
      const estimatedHours = Math.max(0.25, Math.min(40, Number(args.estimatedHours) || 2.0));
      const priority = ['urgent', 'high', 'medium', 'low'].includes(args.priority)
        ? args.priority
        : 'medium';
      const category = ['assignment', 'lab', 'project', 'reading', 'quiz', 'exam'].includes(args.category)
        ? args.category
        : 'assignment';

      const taskData = {
        title,
        course,
        dueDateTime,
        estimatedHours,
        priority,
        category,
        notes: typeof args.notes === 'string' ? args.notes : '',
      };

      const confirmation: GroundedConfirmation = {
        type: 'add_task',
        title: `Add "${title}" (${course})?`,
        description: `Due ${formatRelativeTime(
          Math.round((new Date(dueDateTime).getTime() - context.now.getTime()) / 3600000)
        )}, ~${estimatedHours}h estimated effort.`,
        payload: taskData,
        confirmLabel: 'Add task',
      };

      return {
        reply: modelReply || `Proposed adding "${title}" to your schedule.`,
        source,
        fallbackReason,
        confirmation,
      };
    }

    case 'propose_set_capacity': {
      const hours = Math.max(0.5, Math.min(16, Number(args.hours) || 2));
      const { dayKey, dayOffset } = parseTargetDay(String(args.day || 'today'), context.now);

      const currentCapacity = context.capacitySettings.dailyWorkHours[dayKey] || 4;
      const dailyLoads = calculateDailyLoads(context.tasks, context.capacitySettings, context.now, 7);
      const targetDayLoad = dailyLoads[dayOffset] || dailyLoads[0];
      const demandHours = targetDayLoad?.demandHours || 0;

      const dayLabel = dayOffset === 0 ? 'today' : dayOffset === 1 ? 'tomorrow' : dayKey.toUpperCase();
      const verifiedReply = `If you have ${hours}h available ${dayLabel} (adjusted from ${currentCapacity}h), you have ~${demandHours}h of assignments planned.`;

      const confirmation: GroundedConfirmation = {
        type: 'set_capacity',
        title: `Set ${dayLabel}'s study hours to ${hours}h?`,
        description: `Updates your focus capacity to ${hours} hours for ${dayKey.toUpperCase()}.`,
        payload: { day: dayKey, hours },
        confirmLabel: 'Update study hours',
      };

      return {
        reply: modelReply || verifiedReply,
        reasoning: 'Adjusting focus hours updates your workload buffer and accurately flags overloaded days.',
        source,
        fallbackReason,
        confirmation,
      };
    }

    case 'propose_drop_task': {
      const resolution = resolveTaskRef(args.taskRef, context);
      if (resolution.isAmbiguous && resolution.candidates) {
        return {
          reply: 'I found multiple matching assignments. Which one did you mean to skip?',
          source,
          fallbackReason,
          clarificationOptions: resolution.candidates.map((m) => ({
            label: `${m.course}: ${m.title}`,
            query: `What if I skip ${m.title}?`,
          })),
        };
      }

      const targetTask = resolution.task;
      if (!targetTask) {
        return {
          reply: 'You have no incomplete tasks to skip.',
          source,
          fallbackReason,
        };
      }

      const effort = targetTask.estimatedHours;
      const verifiedReply = `Skipping "${targetTask.title}" (${targetTask.course}) would free up ~${effort} hours of study time.`;

      const confirmation: GroundedConfirmation = {
        type: 'drop_task',
        title: `Let go of "${targetTask.title}"?`,
        description: 'Marks this assignment as dropped without penalty or guilt.',
        payload: { taskId: targetTask.id },
        confirmLabel: 'Let it go',
      };

      return {
        reply: modelReply || verifiedReply,
        reasoning:
          'Dropping low-priority reading or optional work is a valid triage strategy when you are overloaded.',
        source,
        fallbackReason,
        confirmation,
        referencedTaskId: targetTask.id,
      };
    }

    case 'propose_move_task': {
      const resolution = resolveTaskRef(args.taskRef, context);
      if (resolution.isAmbiguous && resolution.candidates) {
        return {
          reply: 'I found multiple matching assignments. Which one would you like to move?',
          source,
          fallbackReason,
          clarificationOptions: resolution.candidates.map((m) => ({
            label: `${m.course}: ${m.title}`,
            query: `What if I move ${m.title} by 1 day?`,
          })),
        };
      }

      const targetTask = resolution.task;
      if (!targetTask) {
        return {
          reply: 'You have no incomplete tasks to move.',
          source,
          fallbackReason,
        };
      }

      let days = Number(args.days) || 1;
      if (args.weekday) {
        const { dayOffset } = parseTargetDay(args.weekday, context.now);
        days = Math.max(1, dayOffset);
      }
      days = Math.max(1, Math.min(7, days));

      const simulation = simulateTaskDelay(
        targetTask,
        days,
        context.tasks,
        context.capacitySettings,
        context.now
      );

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
        reply: modelReply || simulation.consequenceSentence,
        reasoning: `Postponing by ${days} day(s) shifts demand into ${simulation.targetDayLabel}.`,
        source,
        fallbackReason,
        confirmation,
        referencedTaskId: targetTask.id,
      };
    }

    default: {
      return {
        reply: modelReply || `You have ${facts.totalActiveCount} active assignments requiring ~${facts.totalActiveHours} total study hours.`,
        source,
        fallbackReason,
      };
    }
  }
}

/**
 * Computes numbers strictly using real app algorithms and generates confirmation cards.
 */
export function groundIntent(
  intent: string,
  parameters: any,
  rawReply: string,
  context: AskContextSnapshot,
  source: 'gemini' | 'rule-based',
  fallbackReason?: FallbackReason
): GroundedAnswer {
  const facts = buildAppFacts(
    context.tasks,
    context.capacitySettings,
    context.now,
    context.remainingEffortMap,
    context.stopwatchSessions
  );

  switch (intent) {
    case 'chat': {
      return {
        reply: rawReply || 'How can I help you manage your coursework today?',
        source,
        fallbackReason,
      };
    }

    case 'clarify': {
      const options = Array.isArray(parameters?.clarificationOptions)
        ? parameters.clarificationOptions
        : [];
      return {
        reply: rawReply || 'I found multiple matching assignments. Which one did you mean?',
        source,
        fallbackReason,
        clarificationOptions: options,
      };
    }

    case 'explain_ranking': {
      return groundToolCall(
        'explain_task',
        { taskRef: parameters?.taskId || parameters?.taskTitle },
        rawReply,
        context,
        source,
        facts,
        fallbackReason
      );
    }

    case 'set_today_capacity': {
      return groundToolCall(
        'propose_set_capacity',
        { day: parameters?.dayKey, hours: parameters?.hours },
        rawReply,
        context,
        source,
        facts,
        fallbackReason
      );
    }

    case 'what_if_skip': {
      return groundToolCall(
        'propose_drop_task',
        { taskRef: parameters?.taskId },
        rawReply,
        context,
        source,
        facts,
        fallbackReason
      );
    }

    case 'what_if_move': {
      return groundToolCall(
        'propose_move_task',
        { taskRef: parameters?.taskId, days: parameters?.days },
        rawReply,
        context,
        source,
        facts,
        fallbackReason
      );
    }

    case 'add_task': {
      return groundToolCall(
        'propose_add_task',
        parameters,
        rawReply,
        context,
        source,
        facts,
        fallbackReason
      );
    }

    case 'unknown':
    default: {
      if (parameters?.isOffTopic) {
        return {
          reply:
            "I'm focused on helping you triage your deadlines and manage your study schedule. Ask me about what to do next, adjusting your study hours, or testing what happens if you delay an assignment!",
          source,
          fallbackReason,
        };
      }

      // Check last assistant chips to prevent consecutive duplicate chips
      let lastChips: string[] | undefined;
      if (context.history) {
        for (let i = context.history.length - 1; i >= 0; i--) {
          if (context.history[i].role === 'assistant') {
            lastChips = context.history[i].suggestionChips;
            break;
          }
        }
      }

      const chips = sanitizeChips(['Why is this my top task?', 'I only have 2 hours tonight'], lastChips);

      return {
        reply: rawReply || "I didn't quite get that. Here are some things you can ask me:",
        source,
        fallbackReason,
        suggestionChips: chips,
      };
    }
  }
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

  // 0. Check previous assistant message for PendingOffer before anything else
  let lastAssistant: AskMessageHistoryItem | undefined;
  if (context.history && context.history.length > 0) {
    for (let i = context.history.length - 1; i >= 0; i--) {
      if (context.history[i].role === 'assistant') {
        lastAssistant = context.history[i];
        break;
      }
    }
  }

  // Affirmative check
  if (isAffirmative(query)) {
    if (lastAssistant?.pendingOffer && lastAssistant.pendingOffer.kind === 'start_task') {
      const taskId = lastAssistant.pendingOffer.taskId;
      const task = context.tasks.find((t) => t.id === taskId);
      const title = task ? task.title : 'your task';
      if (context.onStartTask) {
        context.onStartTask(taskId);
      }
      return {
        reply: `Started. The timer is running on ${title}. I'll stay out of your way.`,
        source: 'rule-based',
        cooldownTaskId: taskId,
      };
    }
    // Affirmative with NO pending offer
    return {
      reply: 'Sure. What would you like to do?',
      source: 'rule-based',
    };
  }

  // Negative check
  if (isNegative(query)) {
    if (lastAssistant?.pendingOffer && lastAssistant.pendingOffer.kind === 'start_task') {
      return {
        reply: 'No problem.',
        source: 'rule-based',
        cooldownTaskId: lastAssistant.pendingOffer.taskId,
      };
    }
  }

  const facts = buildAppFacts(
    context.tasks,
    context.capacitySettings,
    context.now,
    context.remainingEffortMap,
    context.stopwatchSessions
  );

  // 1. Check local small-talk and conversational queries FIRST (zero network latency)
  const localMatch = checkLocalSmallTalk(query, context, facts);
  if (localMatch) {
    return localMatch;
  }

  // 2. Relevance routing: determine if schedule-related
  const isSchedule = isScheduleRelated(query, context.history, context.tasks);

  let serverData: any = null;
  let fetchFailed = false;

  // 3. Attempt serverless API call with relevance-routed payload
  try {
    const compactTasks = isSchedule
      ? context.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          course: t.course,
          dueDateTime: t.dueDateTime,
          estimatedHours: t.estimatedHours,
          priority: t.priority,
          category: t.category,
          loggedHours:
            facts.topTask?.id === t.id
              ? facts.topTask.loggedHours
              : (facts.tasksDue48h.find((f) => f.id === t.id)?.loggedHours ?? 0),
        }))
      : [];

    const requestSnapshot = isSchedule
      ? {
          tasks: compactTasks,
          now: context.now.toISOString(),
          facts,
          history: context.history?.slice(-8) || [],
          isScheduleRelated: true,
        }
      : {
          now: context.now.toISOString(),
          facts: {
            currentTime: facts.currentTime,
            weekday: facts.weekday,
            history: context.history?.slice(-8) || [],
          },
          history: context.history?.slice(-8) || [],
          isScheduleRelated: false,
        };

    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: query,
        snapshot: requestSnapshot,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      serverData = data;
    } else {
      fetchFailed = true;
    }
  } catch {
    fetchFailed = true;
  }

  // 4. If server responded with Gemini tool call or text, process it
  if (serverData && serverData.source === 'gemini' && !serverData.fallbackToLocal) {
    if (serverData.toolCall) {
      return groundToolCall(
        serverData.toolCall.name,
        serverData.toolCall.args,
        serverData.reply,
        context,
        'gemini',
        facts
      );
    }

    // Plain text reply from Gemini
    const canOffer =
      isSchedule &&
      facts.topTask &&
      shouldOfferStart(
        {
          offeredTaskIds: context.offeredTaskIds,
          history: context.history,
          targetTaskId: facts.topTask.id,
        },
        query
      );

    return {
      reply: serverData.reply,
      source: 'gemini',
      referencedTaskId: isSchedule ? facts.topTask?.id : undefined,
      pendingOffer: canOffer && facts.topTask ? { kind: 'start_task', taskId: facts.topTask.id } : undefined,
    };
  }

  // 5. Otherwise, use offline rule-based intent parsing
  const offline = classifyOfflineQuery(query, context);
  const fallbackReason: FallbackReason =
    serverData?.fallbackReason || (fetchFailed ? 'server_error' : 'model_unavailable');
  return groundIntent(offline.intent, offline.parameters, offline.reply, context, 'rule-based', fallbackReason);
}
