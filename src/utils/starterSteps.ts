import { TaskCategory } from '../types';

/**
 * Concrete, low-barrier 10-minute starter step templates by category.
 * Formatted as one short, clean imperative sentence without repeating full task titles.
 */
export const STARTER_TEMPLATES: Record<TaskCategory, (course?: string) => string> = {
  project: () =>
    'Write 3 milestones and create the empty project file.',
  assignment: () =>
    'Read the questions and outline your answer to the first one.',
  exam: () =>
    'Pick one topic and write down 5 things you remember.',
  lab: () =>
    'Pull the starter code and verify that the base environment compiles.',
  reading: () =>
    'Skim the main section headings and chapter summary questions.',
  quiz: () =>
    'Review your notes and highlight key definitions for 10 minutes.',
  other: () =>
    'Open your workspace, close distracting tabs, and write the first bullet point.',
};

/**
 * Generates a concrete first step of about 10 minutes based on task category.
 * Never repeats the full task title.
 */
export function getStarterStep(
  category: TaskCategory,
  _title?: string,
  course?: string
): string {
  const templateFn = STARTER_TEMPLATES[category] || STARTER_TEMPLATES.assignment;
  return templateFn(course);
}
