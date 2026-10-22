import { useState, useEffect, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { Task, Priority, TaskCategory } from '../types';
import { generateSampleTasks } from '../data/sampleTasks';
import { migrateStorage, TASKS_STORAGE_KEY, LEGACY_TASKS_KEY } from '../utils/storageMigration';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    // Run migration if needed
    migrateStorage();

    try {
      const stored = localStorage.getItem(TASKS_STORAGE_KEY) || localStorage.getItem(LEGACY_TASKS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.error('Failed to load tasks from localStorage:', err);
    }
    // First launch default sample tasks
    const initialSamples = generateSampleTasks();
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(initialSamples));
    } catch {
      // storage unavailable
    }
    return initialSamples;
  });

  // Save to localStorage whenever tasks change
  useEffect(() => {
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    } catch (err) {
      console.error('Failed to save tasks to localStorage:', err);
    }
  }, [tasks]);

  const addTask = useCallback((taskData: {
    title: string;
    course: string;
    dueDateTime: string;
    estimatedHours: number;
    priority: Priority;
    category: TaskCategory;
    notes?: string;
  }) => {
    const now = new Date().toISOString();
    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: taskData.title.trim(),
      course: taskData.course.trim().toUpperCase() || 'GENERAL',
      dueDateTime: new Date(taskData.dueDateTime).toISOString(),
      estimatedHours: Number(taskData.estimatedHours),
      priority: taskData.priority,
      category: taskData.category,
      notes: taskData.notes?.trim() || '',
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    setTasks(prev => [newTask, ...prev]);
    return newTask;
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        return {
          ...t,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  }, []);

  const toggleComplete = useCallback((id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextCompleted = !t.completed;
        if (nextCompleted) {
          // Trigger subtle congratulatory celebration
          try {
            confetti({
              particleCount: 40,
              spread: 60,
              origin: { y: 0.8 },
              colors: ['#8b5cf6', '#10b981', '#38bdf8', '#fbbf24']
            });
          } catch {
            // ignore if confetti fails
          }
        }
        return {
          ...t,
          completed: nextCompleted,
          completedAt: nextCompleted ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    }));
  }, []);

  const resetToSampleTasks = useCallback(() => {
    const samples = generateSampleTasks();
    setTasks(samples);
  }, []);

  const clearAllTasks = useCallback(() => {
    setTasks([]);
  }, []);

  const replaceTasks = useCallback((newTasks: Task[]) => {
    setTasks(newTasks);
  }, []);

  return {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    resetToSampleTasks,
    clearAllTasks,
    replaceTasks,
  };
}

