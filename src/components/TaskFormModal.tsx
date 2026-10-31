import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, AlertCircle, Check, Sparkles } from 'lucide-react';
import { Task, Priority, TaskCategory } from '../types';
import { toDateTimeLocalString } from '../utils/date';
import { CategoryCalibration, getCalibratedEstimateSuggestion } from '../utils/calibration';
import { Modal } from './ui/Modal';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    course: string;
    dueDateTime: string;
    estimatedHours: number;
    priority: Priority;
    category: TaskCategory;
    notes?: string;
  }) => void;
  initialTask?: Task | null;
  calibrations?: Record<TaskCategory, CategoryCalibration | null>;
  existingCourses?: string[];
}

const COMMON_COURSES = ['CS 350', 'MATH 220', 'ECON 201', 'BIO 112', 'PHYS 140', 'ENG 105', 'CHEM 101'];

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialTask,
  calibrations,
  existingCourses,
}) => {
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('');
  const courseInputRef = useRef<HTMLInputElement>(null);
  const [dueDateTime, setDueDateTime] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<number | string>(2);
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<TaskCategory>('assignment');
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  const distinctCourses = useMemo(() => {
    if (existingCourses && existingCourses.length > 0) {
      const fromProps = Array.from(
        new Set(existingCourses.map((c) => c.trim().toUpperCase()).filter((c) => c && c !== 'GENERAL'))
      );
      if (fromProps.length > 0) return fromProps;
    }
    try {
      const stored = localStorage.getItem('deadline_rescue_tasks');
      if (stored) {
        const parsed: Task[] = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          const fromTasks = Array.from(
            new Set(parsed.map((t) => t.course?.trim().toUpperCase()).filter((c) => c && c !== 'GENERAL'))
          );
          if (fromTasks.length > 0) return fromTasks;
        }
      }
    } catch {
      // ignore
    }
    return [];
  }, [existingCourses, isOpen]);

  const courseChips = distinctCourses.length > 0 ? distinctCourses.slice(0, 6) : COMMON_COURSES.slice(0, 4);

  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setTitle(initialTask.title);
        setCourse(initialTask.course);
        setDueDateTime(toDateTimeLocalString(new Date(initialTask.dueDateTime)));
        setEstimatedHours(initialTask.estimatedHours);
        setPriority(initialTask.priority);
        setCategory(initialTask.category);
        setNotes(initialTask.notes || '');
      } else {
        const tomorrowMidnight = new Date();
        tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);
        tomorrowMidnight.setHours(23, 59, 0, 0);

        setTitle('');
        setCourse('');
        setDueDateTime(toDateTimeLocalString(tomorrowMidnight));
        setEstimatedHours(2);
        setPriority('medium');
        setCategory('assignment');
        setNotes('');
      }
      setErrors({});
    }
  }, [isOpen, initialTask]);

  const validate = () => {
    const errs: Record<string, string> = {};

    if (!title.trim()) {
      errs.title = 'Title is required';
    } else if (title.trim().length < 3) {
      errs.title = 'Title must be at least 3 characters';
    }

    if (!dueDateTime) {
      errs.dueDateTime = 'Due date and time is required';
    } else {
      const parsed = new Date(dueDateTime);
      if (isNaN(parsed.getTime())) {
        errs.dueDateTime = 'Please enter a valid date and time';
      }
    }

    const hours = Number(estimatedHours);
    if (!estimatedHours || isNaN(hours) || hours <= 0) {
      errs.estimatedHours = 'Estimated hours must be positive';
    } else if (hours > 100) {
      errs.estimatedHours = 'Hours must be 100 or less';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      title: title.trim(),
      course: course.trim().toUpperCase(),
      dueDateTime,
      estimatedHours: Number(estimatedHours),
      priority,
      category,
      notes: notes.trim(),
    });

    onClose();
  };

  const setQuickDeadline = (hoursFromNow: number, setEndOfDay: boolean = false) => {
    const d = new Date();
    if (setEndOfDay) {
      d.setDate(d.getDate() + Math.floor(hoursFromNow / 24));
      d.setHours(23, 59, 0, 0);
    } else {
      d.setTime(d.getTime() + hoursFromNow * 60 * 60 * 1000);
    }
    setDueDateTime(toDateTimeLocalString(d));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      title={initialTask ? 'Edit Task' : 'Add Task'}
    >
      <div className="font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/40">
          <div>
            <h2 className="text-lg font-semibold text-white">
              {initialTask ? 'Edit Task' : 'Add Task'}
            </h2>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Task title <span className="text-orange-400">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
              }}
              placeholder="e.g. Distributed Systems Lab 3, Problem Set 4..."
              className={`w-full px-3 py-2 bg-black border ${
                errors.title ? 'border-red-500' : 'border-white/15 focus:border-orange-500'
              } rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-red-400 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.title}</span>
              </p>
            )}
          </div>

          {/* Course & Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Course code
              </label>
              <input
                ref={courseInputRef}
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. CS 350"
                className="w-full px-3 py-2 bg-black border border-white/15 focus:border-orange-500 rounded-lg text-white text-sm placeholder-zinc-500 focus:outline-none uppercase"
              />
              {/* Quick Course Pills */}
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                {courseChips.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCourse(c)}
                    className="min-h-[28px] text-[11px] px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                  >
                    {c}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setCourse('');
                    courseInputRef.current?.focus();
                  }}
                  className="min-h-[28px] text-[11px] px-2 py-0.5 rounded bg-orange-500/10 hover:bg-orange-500/20 text-orange-300 hover:text-orange-200 border border-orange-500/25 transition-colors cursor-pointer"
                >
                  + New
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3 py-2 bg-black border border-white/15 focus:border-orange-500 rounded-lg text-white text-sm capitalize focus:outline-none"
              >
                <option value="assignment">Assignment</option>
                <option value="lab">Lab</option>
                <option value="project">Project</option>
                <option value="exam">Exam</option>
                <option value="reading">Reading</option>
                <option value="quiz">Quiz</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Due Date & Quick Select */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-zinc-300">
                Deadline <span className="text-orange-400">*</span>
              </label>
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setQuickDeadline(24, true)}
                  className="text-[11px] text-zinc-400 hover:text-orange-400 underline transition-colors"
                >
                  Tomorrow
                </button>
                <span className="text-zinc-600 text-xs">•</span>
                <button
                  type="button"
                  onClick={() => setQuickDeadline(72, true)}
                  className="text-[11px] text-zinc-400 hover:text-orange-400 underline transition-colors"
                >
                  In 3 days
                </button>
                <span className="text-zinc-600 text-xs">•</span>
                <button
                  type="button"
                  onClick={() => setQuickDeadline(168, true)}
                  className="text-[11px] text-zinc-400 hover:text-orange-400 underline transition-colors"
                >
                  Next week
                </button>
              </div>
            </div>
            <input
              type="datetime-local"
              value={dueDateTime}
              onChange={(e) => {
                setDueDateTime(e.target.value);
                if (errors.dueDateTime) setErrors((prev) => ({ ...prev, dueDateTime: '' }));
              }}
              className={`w-full px-3 py-2 bg-black border ${
                errors.dueDateTime ? 'border-red-500' : 'border-white/15 focus:border-orange-500'
              } rounded-lg text-white text-sm focus:outline-none`}
            />
            {errors.dueDateTime && (
              <p className="mt-1 text-xs text-red-400 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.dueDateTime}</span>
              </p>
            )}
          </div>

          {/* Estimated Hours & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Estimated study hours
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="100"
                value={estimatedHours}
                onChange={(e) => {
                  setEstimatedHours(e.target.value);
                  if (errors.estimatedHours) setErrors((prev) => ({ ...prev, estimatedHours: '' }));
                }}
                className={`w-full px-3 py-2 bg-black border ${
                  errors.estimatedHours ? 'border-red-500' : 'border-white/15 focus:border-orange-500'
                } rounded-lg text-white text-sm font-mono focus:outline-none`}
              />
              {/* Intelligent calibration hint if user underestimates/overestimates */}
              {calibrations && calibrations[category] && calibrations[category]!.sampleCount >= 3 && (
                <div className="mt-1.5 flex items-center space-x-1 text-[11px] text-amber-400">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span>
                    Past {category}s took ~{Math.round(calibrations[category]!.ratio * 100)}% of initial estimate
                  </span>
                  {(() => {
                    const sugg = getCalibratedEstimateSuggestion(category, Number(estimatedHours) || 2, calibrations);
                    if (sugg && sugg.suggestedHours !== Number(estimatedHours)) {
                      return (
                        <button
                          type="button"
                          onClick={() => setEstimatedHours(sugg.suggestedHours)}
                          className="ml-1 underline text-orange-400 hover:text-white"
                        >
                          Use {sugg.suggestedHours}h
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}
              {errors.estimatedHours && (
                <p className="mt-1 text-xs text-red-400 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.estimatedHours}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                Priority
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((p) => {
                  const isSelected = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 px-1 text-xs font-medium capitalize rounded-lg border transition-all ${
                        isSelected
                          ? p === 'urgent'
                            ? 'border-red-500 bg-red-500/20 text-red-300'
                            : p === 'high'
                              ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                              : 'border-white/40 bg-white/10 text-white'
                          : 'border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200 bg-black/40'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Notes (optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Submit on Canvas before 11:59 PM..."
              className="w-full px-3 py-2 bg-black border border-white/15 focus:border-orange-500 rounded-lg text-white text-xs placeholder-zinc-500 focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-white/10 hover:border-white/30 text-zinc-300 hover:text-white text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-black text-xs font-semibold transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{initialTask ? 'Save changes' : 'Add task'}</span>
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
