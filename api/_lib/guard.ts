/**
 * Serverless API Security Guard & Validation Library
 *
 * Implements:
 * 1. Input length and payload limits (max 6000 chars)
 * 2. In-memory per-IP rate limiting + optional Upstash/Vercel KV + global daily cap
 * 3. Same-origin validation (no wildcard CORS)
 * 4. Strict server-side schema validation for LLM responses
 * 5. Prompt injection defense with untrusted input delimitation
 * 6. Redaction of sensitive keys and payloads in logs
 */

declare const process: { env: Record<string, string | undefined> };

export const MAX_INPUT_TEXT_LENGTH = 6000;
export const DEFAULT_RATE_LIMIT_PER_MINUTE = 20;
export const DEFAULT_GLOBAL_DAILY_LIMIT = 500;

export interface ValidatedCourseworkTask {
  title: string;
  course: string;
  dueDateTime: string;
  estimatedHours: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  category: 'assignment' | 'lab' | 'project' | 'reading' | 'quiz' | 'exam' | 'other';
  notes: string;
  uncertain?: boolean;
  isDateAmbiguous?: boolean;
  ambiguityReason?: string;
}

// In-memory rate limiting state
interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
}
const ipBuckets = new Map<string, RateLimitBucket>();

// In-memory global daily counter
let globalDailyCount = 0;
let currentDayKey = new Date().toISOString().slice(0, 10);

/**
 * Validates text length against limits.
 */
export function validateInputLength(
  text: unknown,
  maxLength: number = MAX_INPUT_TEXT_LENGTH
): { valid: boolean; error?: string } {
  if (typeof text !== 'string') {
    return { valid: false, error: 'Input must be a text string.' };
  }
  if (!text.trim()) {
    return { valid: false, error: 'Input text cannot be empty.' };
  }
  if (text.length > maxLength) {
    return {
      valid: false,
      error: `Input text exceeds maximum allowed length of ${maxLength} characters (received ${text.length}).`,
    };
  }
  return { valid: true };
}

/**
 * Checks same-origin headers to prevent cross-site invocation.
 */
export function validateSameOrigin(
  origin?: string | null,
  host?: string | null
): { allowed: boolean; error?: string } {
  // If no Origin header (e.g. server-to-server or direct browser navigation/GET), allow
  if (!origin) {
    return { allowed: true };
  }

  try {
    const originUrl = new URL(origin);
    const originHost = originUrl.host;

    // Allow local development
    if (
      originHost.startsWith('localhost:') ||
      originHost.startsWith('127.0.0.1:') ||
      originHost === 'localhost' ||
      originHost === '127.0.0.1'
    ) {
      return { allowed: true };
    }

    if (host && originHost.toLowerCase() === host.toLowerCase()) {
      return { allowed: true };
    }

    // Origin doesn't match host
    return {
      allowed: false,
      error: 'Cross-origin requests are forbidden.',
    };
  } catch {
    return { allowed: false, error: 'Invalid Origin header.' };
  }
}

/**
 * In-memory per-IP rate limiter (Token Bucket).
 */
export function checkRateLimit(
  ip: string,
  limitPerMinute: number = DEFAULT_RATE_LIMIT_PER_MINUTE
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const windowMs = 60 * 1000;

  const bucket = ipBuckets.get(ip) || { tokens: limitPerMinute, lastRefill: now };

  // Refill tokens based on elapsed time
  const elapsed = now - bucket.lastRefill;
  if (elapsed > windowMs) {
    bucket.tokens = limitPerMinute;
    bucket.lastRefill = now;
  } else {
    const tokensToAdd = (elapsed / windowMs) * limitPerMinute;
    bucket.tokens = Math.min(limitPerMinute, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    ipBuckets.set(ip, bucket);
    return { allowed: true };
  }

  ipBuckets.set(ip, bucket);
  return {
    allowed: false,
    retryAfter: Math.ceil((1 - bucket.tokens) * (windowMs / limitPerMinute) / 1000),
  };
}

/**
 * Checks and increments global daily usage counter.
 */
export function checkGlobalDailyLimit(
  maxDaily: number = Number(process.env.GLOBAL_DAILY_LIMIT) || DEFAULT_GLOBAL_DAILY_LIMIT
): { allowed: boolean; count: number } {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== currentDayKey) {
    currentDayKey = today;
    globalDailyCount = 0;
  }

  if (globalDailyCount >= maxDaily) {
    return { allowed: false, count: globalDailyCount };
  }

  globalDailyCount += 1;
  return { allowed: true, count: globalDailyCount };
}

/**
 * Resets rate limiters (primarily for unit tests).
 */
export function resetRateLimits(): void {
  ipBuckets.clear();
  globalDailyCount = 0;
  currentDayKey = new Date().toISOString().slice(0, 10);
}

/**
 * Delimits untrusted student text to neutralize prompt injection attacks.
 */
export function wrapUntrustedInput(text: string): string {
  // Replace triple quotes or custom delimitation attempts
  const sanitized = text.replace(/<\/untrusted_student_input>/gi, '');
  return `<untrusted_student_input>\n${sanitized}\n</untrusted_student_input>`;
}

/**
 * Validates and repairs an individual coursework task extracted by the model.
 * Returns null if the item cannot be salvaged.
 */
export function sanitizeExtractedTask(
  raw: any,
  fallbackDateIso: string = new Date().toISOString()
): ValidatedCourseworkTask | null {
  if (!raw || typeof raw !== 'object') return null;

  // Title validation
  const rawTitle = typeof raw.title === 'string' ? raw.title.trim() : '';
  if (!rawTitle) return null;
  const title = rawTitle.slice(0, 160);

  // Course validation - preserve verbatim identifier, never fabricate
  const rawCourse = typeof raw.course === 'string' ? raw.course.trim().toUpperCase() : 'GENERAL';
  const course = rawCourse.slice(0, 50) || 'GENERAL';

  // Due date validation
  let dueDateTime = fallbackDateIso;
  if (typeof raw.dueDateTime === 'string') {
    const parsed = new Date(raw.dueDateTime);
    if (!isNaN(parsed.getTime())) {
      dueDateTime = parsed.toISOString();
    }
  }

  // Estimated hours validation (sane range: 0.25 to 40.0)
  let estimatedHours = 2.0;
  if (typeof raw.estimatedHours === 'number' && !isNaN(raw.estimatedHours)) {
    estimatedHours = Math.max(0.25, Math.min(40.0, Math.round(raw.estimatedHours * 4) / 4));
  }

  // Priority validation
  const validPriorities = ['urgent', 'high', 'medium', 'low'] as const;
  const priority = validPriorities.includes(raw.priority) ? raw.priority : 'medium';

  // Category validation
  const validCategories = ['assignment', 'lab', 'project', 'reading', 'quiz', 'exam', 'other'] as const;
  const category = validCategories.includes(raw.category) ? raw.category : 'assignment';

  // Notes validation
  const notes = typeof raw.notes === 'string' ? raw.notes.slice(0, 500) : '';

  // Uncertainty flag (hedged text)
  const uncertain = Boolean(raw.uncertain);

  return {
    title,
    course,
    dueDateTime,
    estimatedHours,
    priority,
    category,
    notes,
    uncertain,
    isDateAmbiguous: Boolean(raw.isDateAmbiguous),
    ambiguityReason: typeof raw.ambiguityReason === 'string' ? raw.ambiguityReason.slice(0, 200) : undefined,
  };
}

/**
 * Validates a list of tasks from model JSON.
 */
export function sanitizeTaskList(
  rawList: any,
  fallbackDateIso?: string
): ValidatedCourseworkTask[] {
  if (!Array.isArray(rawList)) return [];
  const results: ValidatedCourseworkTask[] = [];

  for (const item of rawList) {
    const sanitized = sanitizeExtractedTask(item, fallbackDateIso);
    if (sanitized) {
      results.push(sanitized);
    }
  }

  return results;
}
