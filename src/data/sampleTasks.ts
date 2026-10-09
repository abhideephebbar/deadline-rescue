import { Task } from '../types';

/**
 * Generates sample college student tasks anchored dynamically around current local time.
 */
export function generateSampleTasks(): Task[] {
  const now = new Date();

  // Helper to add hours
  const addHours = (hours: number): string => {
    const d = new Date(now.getTime() + hours * 60 * 60 * 1000);
    return d.toISOString();
  };

  return [
    {
      id: 'task-sample-1',
      title: 'Operating Systems: Kernel Concurrency Lab',
      course: 'CS 350',
      dueDateTime: addHours(6.5), // Due in 6.5 hours!
      estimatedHours: 4.0,        // Buffer is only 2.5 hours!
      priority: 'urgent',
      category: 'project',
      notes: 'Finish multi-threaded lock implementation and run test suite in virtual machine.',
      completed: false,
      createdAt: addHours(-48),
      updatedAt: addHours(-48),
    },
    {
      id: 'task-sample-2',
      title: 'Intermediate Microeconomics: Problem Set 4',
      course: 'ECON 201',
      dueDateTime: addHours(22), // Due tomorrow
      estimatedHours: 2.5,
      priority: 'high',
      category: 'assignment',
      notes: 'Questions 3-8 on Nash equilibrium and imperfect competition diagrams.',
      completed: false,
      createdAt: addHours(-24),
      updatedAt: addHours(-24),
    },
    {
      id: 'task-sample-3',
      title: 'Molecular Genetics: Pre-Lab Protocol Quiz',
      course: 'BIO 112',
      dueDateTime: addHours(30), // Due in 30 hours
      estimatedHours: 0.75,      // Quick win!
      priority: 'medium',
      category: 'quiz',
      notes: '15-question Canvas quiz on gel electrophoresis safety and pipetting precision.',
      completed: false,
      createdAt: addHours(-12),
      updatedAt: addHours(-12),
    },
    {
      id: 'task-sample-4',
      title: 'Modern Philosophy: First Draft of Term Essay',
      course: 'PHIL 140',
      dueDateTime: addHours(72), // Due in 3 days
      estimatedHours: 5.0,
      priority: 'medium',
      category: 'assignment',
      notes: '1,500 words analyzing Descartes’ Meditations and wax argument.',
      completed: false,
      createdAt: addHours(-6),
      updatedAt: addHours(-6),
    },
    {
      id: 'task-sample-5',
      title: 'Linear Algebra: WebAssign Homework 6',
      course: 'MATH 220',
      dueDateTime: addHours(120), // 5 days out
      estimatedHours: 2.0,
      priority: 'low',
      category: 'assignment',
      notes: 'Orthogonal projections and Gram-Schmidt process exercises.',
      completed: false,
      createdAt: addHours(-1),
      updatedAt: addHours(-1),
    },
    {
      id: 'task-sample-6',
      title: 'Intro to Psychology: Chapters 4 & 5 Discussion Post',
      course: 'PSYC 101',
      dueDateTime: addHours(-5), // Completed earlier
      estimatedHours: 1.0,
      priority: 'medium',
      category: 'reading',
      notes: '300-word response to cognitive development prompts and two peer replies.',
      completed: true,
      completedAt: addHours(-6),
      createdAt: addHours(-30),
      updatedAt: addHours(-6),
    },
  ];
}

