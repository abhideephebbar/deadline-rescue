import { describe, it, expect } from 'vitest';
import { getStarterStep } from '../starterSteps';
import { TaskCategory } from '../../types';

describe('Start Now 10-Minute Starter Steps', () => {
  const categories: TaskCategory[] = ['assignment', 'lab', 'project', 'exam', 'reading', 'quiz', 'other'];

  it('provides a short, imperative sentence for every category', () => {
    for (const cat of categories) {
      const step = getStarterStep(cat, 'Homework 4: Giant Long Title With Many Words', 'CS 350');
      expect(typeof step).toBe('string');
      expect(step.length).toBeGreaterThan(15);
      // Invariant: Never repeats the full task title
      expect(step).not.toContain('Giant Long Title');
      expect(step).not.toContain('"');
    }
  });

  it('matches required templates for project, assignment, and exam', () => {
    expect(getStarterStep('project')).toBe(
      'Write 3 milestones and create the empty project file.'
    );
    expect(getStarterStep('assignment')).toBe(
      'Read the questions and outline your answer to the first one.'
    );
    expect(getStarterStep('exam')).toBe(
      'Pick one topic and write down 5 things you remember.'
    );
  });

  it('provides clean steps for lab, reading, quiz, and other', () => {
    expect(getStarterStep('lab')).toBe(
      'Pull the starter code and verify that the base environment compiles.'
    );
    expect(getStarterStep('reading')).toBe(
      'Skim the main section headings and chapter summary questions.'
    );
    expect(getStarterStep('quiz')).toBe(
      'Review your notes and highlight key definitions for 10 minutes.'
    );
    expect(getStarterStep('other')).toBe(
      'Open your workspace, close distracting tabs, and write the first bullet point.'
    );
  });
});
