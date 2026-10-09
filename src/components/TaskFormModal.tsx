import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Sparkles, Check } from 'lucide-react';
import { Task, Priority, TaskCategory } from '../types';
import { toDateTimeLocalString } from '../utils/date';

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
}

const COMMON_COURSES = ['CS 350', 'MATH 220', 'ECON 201', 'BIO 112', 'PHYS 140', 'ENG 105', 'CHEM 101'];

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialTask,
}) => {
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('');
  const [dueDateTime, setDueDateTime] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<number | string>(2);
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<TaskCategory>('assignment');
  const [notes, setNotes] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

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
        // Default new task setup: Tomorrow at 11:59 PM
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

  if (!isOpen) return null;

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
      errs.estimatedHours = 'Estimated hours must be a positive number';
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

  // Quick deadline setter helper
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl shadow-black overflow-hidden z-10 transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">
                {initialTask ? 'Edit Task Details' : 'Add New Deadline'}
              </h2>
              <p className="text-xs text-zinc-400">
                Provide details for deadline urgency triage and buffer calculation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 sm:space-y-5">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Task Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
              }}
              placeholder="e.g. Distributed Systems Lab 3, Problem Set 4, Midterm Review"
              className={`w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border ${
                errors.title ? 'border-rose-500 focus:border-rose-500' : 'border-zinc-800 focus:border-brand-500'
              } text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors`}
            />
            {errors.title && (
              <p className="mt-1 text-xs text-rose-400 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.title}</span>
              </p>
            )}
          </div>

          {/* Course & Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Course Code */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Course / Subject
              </label>
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. CS 350, ECON 201"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-500 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500 uppercase"
              />
              {/* Quick Course Chips */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {COMMON_COURSES.slice(0, 4).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCourse(c)}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-500 text-white text-sm focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="assignment">Assignment / P-Set</option>
                <option value="project">Project / Lab</option>
                <option value="exam">Exam / Midterm / Final</option>
                <option value="quiz">Quiz</option>
                <option value="reading">Reading / Discussion</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Due Date & Time */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Due Date & Time <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] text-zinc-400">Local Time</span>
            </div>
            <input
              type="datetime-local"
              value={dueDateTime}
              onChange={(e) => {
                setDueDateTime(e.target.value);
                if (errors.dueDateTime) setErrors((prev) => ({ ...prev, dueDateTime: '' }));
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border ${
                errors.dueDateTime ? 'border-rose-500' : 'border-zinc-800'
              } text-white text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500`}
            />
            {errors.dueDateTime && (
              <p className="mt-1 text-xs text-rose-400 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errors.dueDateTime}</span>
              </p>
            )}

            {/* Quick date presets for college students */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[11px] text-zinc-500 mr-1">Quick presets:</span>
              <button
                type="button"
                onClick={() => setQuickDeadline(0, true)}
                className="text-[11px] px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors"
              >
                Tonight 11:59 PM
              </button>
              <button
                type="button"
                onClick={() => setQuickDeadline(24, true)}
                className="text-[11px] px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors"
              >
                Tomorrow 11:59 PM
              </button>
              <button
                type="button"
                onClick={() => setQuickDeadline(48)}
                className="text-[11px] px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors"
              >
                In 2 Days
              </button>
              <button
                type="button"
                onClick={() => setQuickDeadline(72)}
                className="text-[11px] px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors"
              >
                In 3 Days
              </button>
            </div>
          </div>

          {/* Estimated Hours & Priority Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Estimated Hours */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Estimated Workload (Hours) <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="100"
                value={estimatedHours}
                onChange={(e) => {
                  setEstimatedHours(e.target.value);
                  if (errors.estimatedHours) setErrors((prev) => ({ ...prev, estimatedHours: '' }));
                }}
                className={`w-full px-3.5 py-2 rounded-xl bg-zinc-950 border ${
                  errors.estimatedHours ? 'border-rose-500' : 'border-zinc-800'
                } text-white text-sm focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500`}
              />
              {errors.estimatedHours && (
                <p className="mt-1 text-xs text-rose-400 flex items-center space-x-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errors.estimatedHours}</span>
                </p>
              )}
              {/* Quick Hours Presets */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {[0.5, 1.0, 2.0, 3.5, 5.0].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setEstimatedHours(h)}
                    className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                      Number(estimatedHours) === h
                        ? 'bg-brand-500/30 text-brand-300 font-bold border border-brand-500/40'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {h}h
                  </button>
                ))}
              </div>
            </div>

            {/* Priority Selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                Priority Level <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((p) => {
                  const isSelected = priority === p;
                  let colorStyles = '';
                  if (p === 'urgent') colorStyles = isSelected ? 'bg-rose-500/20 text-rose-300 border-rose-500' : 'text-rose-400/80';
                  if (p === 'high') colorStyles = isSelected ? 'bg-amber-500/20 text-amber-300 border-amber-500' : 'text-amber-400/80';
                  if (p === 'medium') colorStyles = isSelected ? 'bg-blue-500/20 text-blue-300 border-blue-500' : 'text-blue-400/80';
                  if (p === 'low') colorStyles = isSelected ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500' : 'text-emerald-400/80';

                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`px-2.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all text-center ${
                        isSelected
                          ? `${colorStyles} ring-1 ring-brand-500/50 shadow-sm`
                          : 'bg-zinc-950 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Notes / Sub-tasks (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Include citations, push code to GitHub before 11:59 PM..."
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-500 text-white text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center space-x-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-semibold shadow-lg shadow-brand-600/30 border border-brand-400/30 transition-all transform active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{initialTask ? 'Save Changes' : 'Add to Rescue Radar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
