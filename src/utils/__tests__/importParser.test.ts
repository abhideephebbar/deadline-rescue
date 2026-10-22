import { describe, it, expect } from 'vitest';
import {
  extractCourseCode,
  extractCategoryAndDefaults,
  extractEstimatedHours,
  extractDueDate,
  parseCourseworkText,
} from '../importParser';

describe('Paste-to-Import Rule-Based Parser', () => {
  const baseTimestamp = new Date(2026, 9, 20, 10, 0, 0); // Tuesday, Oct 20, 2026

  it('extracts course codes correctly across variations', () => {
    expect(extractCourseCode('CS 350 - Operating Systems Lab').code).toBe('CS 350');
    expect(extractCourseCode('Finish MATH101 homework').code).toBe('MATH 101');
    expect(extractCourseCode('Problem set for econ-201').code).toBe('ECON 201');
    expect(extractCourseCode('Study biology chapter 4').code).toBe('GENERAL');
  });

  it('detects categories, priority, and default efforts', () => {
    const exam = extractCategoryAndDefaults('Midterm Exam on Algorithms');
    expect(exam.category).toBe('exam');
    expect(exam.priority).toBe('urgent');
    expect(exam.defaultEffort).toBe(4.0);

    const lab = extractCategoryAndDefaults('Chemistry Laboratory 3');
    expect(lab.category).toBe('lab');
    expect(lab.priority).toBe('high');

    const reading = extractCategoryAndDefaults('Read Chapter 5 in textbook');
    expect(reading.category).toBe('reading');
    expect(reading.priority).toBe('low');

    const quiz = extractCategoryAndDefaults('Weekly pop quiz');
    expect(quiz.category).toBe('quiz');
  });

  it('extracts explicit effort hours if specified', () => {
    expect(extractEstimatedHours('CS 350 Lab 3 (~4h effort)', 2.0)).toBe(4.0);
    expect(extractEstimatedHours('Takes about 2.5 hours to finish', 1.0)).toBe(2.5);
    expect(extractEstimatedHours('Problem set - 5 hrs', 2.0)).toBe(5.0);
    expect(extractEstimatedHours('Generic task with no effort stated', 3.0)).toBe(3.0);
  });

  it('parses calendar dates and explicit times', () => {
    const res = extractDueDate('Due Oct 28 at 5:00 pm', baseTimestamp);
    const date = new Date(res.dueDateTime);
    expect(date.getMonth()).toBe(9); // Oct (0-indexed)
    expect(date.getDate()).toBe(28);
    expect(date.getHours()).toBe(17);
    expect(date.getMinutes()).toBe(0);
    expect(res.isDateAmbiguous).toBe(false);
  });

  it('flags ambiguous dates when only a weekday is mentioned', () => {
    const res = extractDueDate('Submit by Friday midnight', baseTimestamp);
    expect(res.isDateAmbiguous).toBe(true);
    expect(res.ambiguityReason).toContain('Only weekday specified');
    const date = new Date(res.dueDateTime);
    expect(date.getHours()).toBe(23);
    expect(date.getMinutes()).toBe(59);
  });

  it('parses full multi-line syllabus snippet into structured candidates', () => {
    const snippet = `
      CS 350 - Operating Systems: Lab 3 (Virtual Memory) due Oct 28 at 11:59 PM (~4h effort).
      MATH 220: Problem Set 5 due next Tuesday by midnight.
      BIO 112: Read Chapter 6 before tomorrow.
      Midterm Exam for ECON 201 on Nov 15 at 2:00 PM.
    `;

    const parsed = parseCourseworkText(snippet, baseTimestamp);
    expect(parsed.length).toBe(4);

    // Task 1: CS 350 Lab 3
    const t1 = parsed[0];
    expect(t1.course).toBe('CS 350');
    expect(t1.category).toBe('lab');
    expect(t1.estimatedHours).toBe(4.0);
    expect(t1.title).toContain('Lab 3');

    // Task 2: MATH 220 Pset
    const t2 = parsed[1];
    expect(t2.course).toBe('MATH 220');
    expect(t2.category).toBe('assignment');

    // Task 3: BIO 112 Reading
    const t3 = parsed[2];
    expect(t3.course).toBe('BIO 112');
    expect(t3.category).toBe('reading');

    // Task 4: ECON 201 Midterm
    const t4 = parsed[3];
    expect(t4.course).toBe('ECON 201');
    expect(t4.category).toBe('exam');
    expect(t4.priority).toBe('urgent');
  });

  it('handles empty or blank text gracefully', () => {
    expect(parseCourseworkText('')).toEqual([]);
    expect(parseCourseworkText('    ')).toEqual([]);
  });
});
