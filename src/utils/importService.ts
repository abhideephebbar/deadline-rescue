import { ParsedTaskCandidate, parseCourseworkText } from './importParser';
import { Priority, TaskCategory } from '../types';

export interface ImportParseResult {
  tasks: ParsedTaskCandidate[];
  source: 'gemini' | 'rule-based';
  notice?: string;
}

/**
 * Attempts to parse coursework text via serverless LLM function (/api/parse-tasks).
 * Falls back seamlessly to the offline rule-based parser if the endpoint is
 * unreachable, fails, or has no API key configured.
 */
export async function parseTasksWithFallback(
  text: string,
  now: Date = new Date()
): Promise<ImportParseResult> {
  // If text is empty
  if (!text || !text.trim()) {
    return { tasks: [], source: 'rule-based' };
  }

  try {
    const response = await fetch('/api/parse-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        now: now.toISOString(),
      }),
    });

    if (response.ok) {
      const data = await response.json();

      if (!data.fallbackToLocal && Array.isArray(data.tasks) && data.tasks.length > 0) {
        // Map into full ParsedTaskCandidate objects
        const tasks: ParsedTaskCandidate[] = data.tasks.map((item: any, idx: number) => ({
          id: `gemini-${Date.now()}-${idx}`,
          title: item.title || 'Coursework Task',
          course: (item.course || 'GENERAL').toUpperCase(),
          dueDateTime: item.dueDateTime || new Date(now.getTime() + 48 * 3600 * 1000).toISOString(),
          estimatedHours: typeof item.estimatedHours === 'number' ? item.estimatedHours : 2.0,
          priority: (['urgent', 'high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium') as Priority,
          category: (['assignment', 'lab', 'project', 'reading', 'quiz', 'exam'].includes(item.category) ? item.category : 'assignment') as TaskCategory,
          notes: item.notes || '',
          isDateAmbiguous: Boolean(item.isDateAmbiguous),
          ambiguityReason: item.ambiguityReason || undefined,
          selected: true,
          confidence: 'high' as const,
        }));

        return {
          tasks,
          source: 'gemini',
          notice: 'Parsed using Gemini AI (serverless)',
        };
      }
    }
  } catch {
    // Expected in offline/local Vite dev when /api/parse-tasks isn't running on a dev server
  }

  // Seamless fallback to offline rule-based parser
  const ruleTasks = parseCourseworkText(text, now);
  return {
    tasks: ruleTasks,
    source: 'rule-based',
    notice: 'Parsed using offline rule-based engine',
  };
}
