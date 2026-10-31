import { Priority, TaskCategory } from '../types';
import { getCategoryDefaults } from './categoryDefaults';

export interface ParsedTaskCandidate {
  id: string;
  title: string;
  course: string;
  dueDateTime: string;
  estimatedHours: number;
  priority: Priority;
  category: TaskCategory;
  notes: string;
  uncertain?: boolean;
  isDateAmbiguous: boolean;
  ambiguityReason?: string;
  selected: boolean;
  confidence: 'high' | 'medium' | 'low';
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const WEEKDAY_MAP: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tues: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thur: 4, thurs: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

/**
 * Extracts course codes verbatim from input text, e.g. CS 350, CT-2, DBMS, DS, MATH.
 * Never invents, expands, or fabricates codes.
 */
export function extractCourseCode(text: string): { code: string; cleanText: string } {
  // 1. Check alphanumeric course code (e.g. CS 350, CT-2, MATH 220, MATH101)
  const courseRegex = /\b([a-zA-Z]{2,4})\s*[-_]?\s*(\d{1,3}[a-zA-Z]?)\b/;
  const match = text.match(courseRegex);
  if (match) {
    const code = `${match[1].toUpperCase()} ${match[2].toUpperCase()}`;
    const cleanText = text.replace(match[0], '').replace(/\s{2,}/g, ' ').trim();
    return { code, cleanText };
  }

  // 2. Check standalone common course acronyms/subjects verbatim
  const acronymRegex = /\b(DBMS|DS|OS|CN|DAA|AI|ML|OOP|SE|COA|TOC|CD|MATH|PHYS|CHEM|BIO|ECON)\b/i;
  const acrMatch = text.match(acronymRegex);
  if (acrMatch) {
    const code = acrMatch[0].toUpperCase();
    const cleanText = text.replace(acrMatch[0], '').replace(/\s{2,}/g, ' ').trim();
    return { code, cleanText };
  }

  return { code: 'GENERAL', cleanText: text };
}

/**
 * Extracts category and default priority & effort using user category defaults
 */
export function extractCategoryAndDefaults(text: string): {
  category: TaskCategory;
  defaultEffort: number;
  priority: Priority;
} {
  const defaults = getCategoryDefaults();
  const lower = text.toLowerCase();

  if (/\b(exam|midterm|final|test)\b/.test(lower)) {
    return { category: 'exam', defaultEffort: defaults.exam, priority: 'urgent' };
  }
  if (/\b(lab|laboratory)\b/.test(lower)) {
    return { category: 'lab', defaultEffort: defaults.lab, priority: 'high' };
  }
  if (/\b(project|paper|essay|milestone|term paper)\b/.test(lower)) {
    return { category: 'project', defaultEffort: defaults.project, priority: 'high' };
  }
  if (/\b(quiz)\b/.test(lower)) {
    return { category: 'quiz', defaultEffort: defaults.quiz, priority: 'medium' };
  }
  if (/\b(reading|chapter|ch\.\s*\d+|read\b)/.test(lower)) {
    return { category: 'reading', defaultEffort: defaults.reading, priority: 'low' };
  }

  // Default
  return { category: 'assignment', defaultEffort: defaults.assignment, priority: 'medium' };
}

/**
 * Parses explicit effort if mentioned (e.g., "~3h", "2.5 hours", "4 hrs", "effort: 1h")
 */
export function extractEstimatedHours(text: string, defaultHours: number): number {
  const effortRegex = /(?:~|\bapprox(?:\.|imately)?\s*)?(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i;
  const match = text.match(effortRegex);
  if (match) {
    const parsed = parseFloat(match[1]);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 50) {
      return parsed;
    }
  }
  return defaultHours;
}

/**
 * Parses time of day from text (e.g. "11:59pm", "5pm", "noon", "midnight", "2:30 PM")
 */
function extractTimeOfDay(text: string): { hour: number; minute: number; hasExplicitTime: boolean } {
  const lower = text.toLowerCase();

  if (lower.includes('midnight')) {
    return { hour: 23, minute: 59, hasExplicitTime: true };
  }
  if (lower.includes('noon')) {
    return { hour: 12, minute: 0, hasExplicitTime: true };
  }

  const timeRegex = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i;
  const match = text.match(timeRegex);
  if (match) {
    let hour = parseInt(match[1], 10);
    const minute = match[2] ? parseInt(match[2], 10) : 0;
    const meridian = match[3].toLowerCase();

    if (meridian === 'pm' && hour < 12) hour += 12;
    if (meridian === 'am' && hour === 12) hour = 0;

    return { hour, minute, hasExplicitTime: true };
  }

  // Default student deadline is 11:59 PM
  return { hour: 23, minute: 59, hasExplicitTime: false };
}

/**
 * Extracts and parses deadline date & time with ambiguity detection
 */
export function extractDueDate(
  text: string,
  now: Date = new Date()
): {
  dueDateTime: string;
  isDateAmbiguous: boolean;
  ambiguityReason?: string;
} {
  const lower = text.toLowerCase();
  const timeInfo = extractTimeOfDay(text);

  // 1. "Today" or "Tonight"
  if (/\b(today|tonight)\b/.test(lower)) {
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), timeInfo.hour, timeInfo.minute, 0);
    return {
      dueDateTime: target.toISOString(),
      isDateAmbiguous: false,
    };
  }

  // 2. "Tomorrow"
  if (/\btomorrow\b/.test(lower)) {
    const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, timeInfo.hour, timeInfo.minute, 0);
    return {
      dueDateTime: target.toISOString(),
      isDateAmbiguous: false,
    };
  }

  // 3. Month name and day (e.g. "Oct 28", "October 28th", "Nov 5 at 5pm")
  const monthRegex = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/i;
  const monthMatch = text.match(monthRegex);
  if (monthMatch) {
    const monthKey = monthMatch[1].toLowerCase();
    const month = MONTH_MAP[monthKey] ?? now.getMonth();
    const day = parseInt(monthMatch[2], 10);

    let year = now.getFullYear();
    // If the date has already passed by more than 2 months, assume next year
    const targetDate = new Date(year, month, day, timeInfo.hour, timeInfo.minute, 0);
    if (targetDate.getTime() < now.getTime() - 60 * 24 * 3600 * 1000) {
      targetDate.setFullYear(year + 1);
    }

    return {
      dueDateTime: targetDate.toISOString(),
      isDateAmbiguous: !timeInfo.hasExplicitTime,
      ambiguityReason: !timeInfo.hasExplicitTime ? 'No cutoff time specified; defaulted to 11:59 PM.' : undefined,
    };
  }

  // 4. Numeric date (e.g. "10/30", "11/05/2026", "10-28")
  const numericDateRegex = /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/;
  const numMatch = text.match(numericDateRegex);
  if (numMatch) {
    const m = parseInt(numMatch[1], 10) - 1;
    const d = parseInt(numMatch[2], 10);
    let y = now.getFullYear();
    if (numMatch[3]) {
      const parsedYear = parseInt(numMatch[3], 10);
      y = parsedYear < 100 ? 2000 + parsedYear : parsedYear;
    }

    if (m >= 0 && m <= 11 && d >= 1 && d <= 31) {
      const targetDate = new Date(y, m, d, timeInfo.hour, timeInfo.minute, 0);
      return {
        dueDateTime: targetDate.toISOString(),
        isDateAmbiguous: !numMatch[3] || !timeInfo.hasExplicitTime,
        ambiguityReason: !numMatch[3] ? 'Month/day format used without explicit year.' : undefined,
      };
    }
  }

  // 5. Day of week (e.g. "due Friday", "next Tuesday", "on Wednesday 11:59pm")
  const weekdayRegex = /\b(?:next\s+|this\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)\b/i;
  const weekMatch = text.match(weekdayRegex);
  if (weekMatch) {
    const dayKey = weekMatch[1].toLowerCase();
    const targetDayIndex = WEEKDAY_MAP[dayKey];
    if (targetDayIndex !== undefined) {
      const currentDayIndex = now.getDay();
      let diff = targetDayIndex - currentDayIndex;
      if (diff <= 0) diff += 7; // Next occurrence

      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, timeInfo.hour, timeInfo.minute, 0);
      return {
        dueDateTime: targetDate.toISOString(),
        isDateAmbiguous: true,
        ambiguityReason: `Only weekday specified (${weekMatch[1]}); scheduled for upcoming ${targetDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}.`,
      };
    }
  }

  // Default Fallback: No recognizable date
  const defaultDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 23, 59, 0);
  return {
    dueDateTime: defaultDate.toISOString(),
    isDateAmbiguous: true,
    ambiguityReason: 'No clear date detected in text; defaulted to 2 days from now at 11:59 PM.',
  };
}

/**
 * Cleans extracted text into a readable task title
 */
export function cleanTaskTitle(text: string, course: string, category: TaskCategory): string {
  let cleaned = text
    // Remove course code
    .replace(new RegExp(course.replace(' ', '\\s*'), 'i'), '')
    // Remove common prefixes
    .replace(/\b(due|deadline|reminder|remember to|submit|complete|finish|assignment:|hw:|lab:|quiz:)\b/gi, '')
    // Remove date fragments
    .replace(/\b(on|by|at|before|until)\s+(today|tonight|tomorrow|midnight|noon|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, '')
    .replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}(?:st|nd|rd|th)?\b/gi, '')
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, '')
    .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, '')
    .replace(/(?:~|\bapprox(?:\.|imately)?\s*)?\d+(?:\.\d+)?\s*(?:hours?|hrs?|h)\b/gi, '')
    // Remove punctuation & extra whitespace
    .replace(/^[:\s\-–—*•]+/, '')
    .replace(/[:\s\-–—*•]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (cleaned.length < 3) {
    cleaned = `${course} ${category.toUpperCase()}`;
  }

  return cleaned;
}

/**
 * Extracts specific qualifiers like chapters, syllabus, submission instructions
 */
export function extractTaskQualifiers(text: string): string {
  const qualifiers: string[] = [];
  const portalMatch = text.match(/\b(submit\s+on\s+portal|portal\s+submission|turn\s+in\s+on\s+canvas|upload\s+to\s+gradescope|submit\s+online)\b/i);
  if (portalMatch) qualifiers.push(portalMatch[0].trim());

  const chapterMatch = text.match(/\b(chapters?\s+\d+(?:-\d+)?|ch\.\s*\d+(?:-\d+)?|pages?\s+\d+(?:-\d+)?|full\s+check)\b/i);
  if (chapterMatch) qualifiers.push(chapterMatch[0].trim());

  return qualifiers.join('; ');
}

/**
 * Primary rule-based parser that splits raw coursework text into candidates.
 */
export function parseCourseworkText(rawText: string, now: Date = new Date()): ParsedTaskCandidate[] {
  if (!rawText || !rawText.trim()) return [];

  // Normalize delimiters and split by lines, bullets, semicolons, periods, or conversational joins like ", also"
  const normalized = rawText
    .replace(/,\s*(also|and)\s+/gi, '\n')
    .replace(/(?<=[.!?])\s+(?=[A-Z0-9]|someone\b|also\b)/gi, '\n');

  const rawLines = normalized
    .split(/\r?\n|;/)
    .map((line) => line.trim())
    .filter((line) => line.length > 5);

  const candidates: ParsedTaskCandidate[] = [];

  rawLines.forEach((line, index) => {
    // Ignore lines that look like generic greetings or signatures
    if (/^(hi|hello|dear|thanks|best|cheers|sincerely|regards)\b/i.test(line)) {
      return;
    }

    const { code: course, cleanText: textAfterCourse } = extractCourseCode(line);
    const { category, defaultEffort, priority } = extractCategoryAndDefaults(line);
    const estimatedHours = extractEstimatedHours(line, defaultEffort);
    const { dueDateTime, isDateAmbiguous, ambiguityReason } = extractDueDate(line, now);
    const title = cleanTaskTitle(textAfterCourse, course, category);

    // Detect hedges ("someone said", "not sure", "maybe", etc.)
    const hasHedge = /\b(not sure|maybe|someone said|i think|possibly|unconfirmed|might be|someone told)\b/i.test(line);

    // Extract notes/qualifiers (e.g. chapters 3-5, submit on portal)
    const qualifiers = extractTaskQualifiers(line);
    const notes = qualifiers || line;

    // Assess confidence
    let confidence: 'high' | 'medium' | 'low' = 'high';
    if (course === 'GENERAL' && isDateAmbiguous) {
      confidence = 'low';
    } else if (course === 'GENERAL' || isDateAmbiguous || hasHedge) {
      confidence = 'medium';
    }

    candidates.push({
      id: `parsed-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      course,
      dueDateTime,
      estimatedHours,
      priority,
      category,
      notes,
      uncertain: hasHedge,
      isDateAmbiguous,
      ambiguityReason,
      selected: true,
      confidence,
    });
  });

  return candidates;
}

