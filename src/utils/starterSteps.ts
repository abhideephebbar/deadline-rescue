import { TaskCategory } from '../types';

/**
 * Concrete, low-barrier 10-minute starter step templates by category.
 * Designed to eliminate activation energy and procrastination by focusing
 * strictly on the immediate initial milestone.
 */
export const STARTER_TEMPLATES: Record<TaskCategory, (title: string, course: string) => string> = {
  assignment: (title, course) =>
    `Open the prompt for "${title}" (${course}) and write down the 3 core questions or requirements on scratch paper.`,
  lab: (title, course) =>
    `Open your IDE / terminal for "${title}" (${course}), pull the starter code, and verify that the base environment or test suite compiles.`,
  project: (title, course) =>
    `Break "${title}" (${course}) into 3 bullet milestones and write the blank outline file or project skeleton.`,
  exam: (title, course) =>
    `Scan the exam topics for "${title}" (${course}) and write down the top 3 formulas or concepts you feel least confident about.`,
  reading: (title, course) =>
    `Open "${title}" (${course}), skim the main section headings, bold terms, and chapter summary questions before reading page one.`,
  quiz: (title, course) =>
    `Pull up lecture notes for "${title}" (${course}) and spend 10 minutes highlighting key definitions.`,
  other: (title, course) =>
    `Open your workspace for "${title}" (${course}), close distracting browser tabs, and write your first 2 sentences or initial bullet point.`,
};

/**
 * Generates a concrete first step of about 10 minutes based on task category, title, and course.
 */
export function getStarterStep(category: TaskCategory, title: string = 'this task', course: string = 'Coursework'): string {
  const templateFn = STARTER_TEMPLATES[category] || STARTER_TEMPLATES.assignment;
  return templateFn(title, course);
}
