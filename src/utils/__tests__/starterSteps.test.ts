import { describe, it, expect } from 'vitest';
import { getStarterStep } from '../starterSteps';
import { TaskCategory } from '../../types';

describe('Start Now 10-Minute Starter Steps', () => {
  const categories: TaskCategory[] = ['assignment', 'lab', 'project', 'exam', 'reading', 'quiz', 'other'];

  it('provides a concrete, actionable starter template for every category', () => {
    for (const cat of categories) {
      const step = getStarterStep(cat, 'Homework 4', 'CS 350');
      expect(typeof step).toBe('string');
      expect(step.length).toBeGreaterThan(25);
      expect(step).toContain('CS 350');
    }
  });

  it('tailors assignment kickoff to outlining questions', () => {
    const step = getStarterStep('assignment', 'P-Set 3', 'MATH 220');
    expect(step).toContain('scratch paper');
  });

  it('tailors lab kickoff to environment and test suite verification', () => {
    const step = getStarterStep('lab', 'Kernel Threads', 'CS 350');
    expect(step).toContain('starter code');
  });

  it('tailors reading kickoff to skimming headings', () => {
    const step = getStarterStep('reading', 'Chapter 4', 'BIO 101');
    expect(step).toContain('skim');
  });
});
