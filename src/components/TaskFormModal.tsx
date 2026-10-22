import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Check, Sparkles } from 'lucide-react';
import { Task, Priority, TaskCategory } from '../types';
import { toDateTimeLocalString } from '../utils/date';
import { CategoryCalibration, getCalibratedEstimateSuggestion } from '../utils/calibration';
import { BitmapChevron } from './BitmapChevron';
import { ScrambleTextOnHover } from './ScrambleText';

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
}

const COMMON_COURSES = ['CS 350', 'MATH 220', 'ECON 201', 'BIO 112', 'PHYS 140', 'ENG 105', 'CHEM 101'];

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialTask,
  calibrations,
}) => {
  const [title, setTitle] = useState('');
  const [course, setCourse] = useState('');
  const [dueDateTime, setDueDateTime] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<number | string>(2);
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<TaskCategory>('assignment');
  const [notes, setNotes] = useState('');

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="fixed inset-0" onClick={onClose} />

      <div className="relative w-full max-w-xl bg-[#0e0e0e] border border-white/20 shadow-2xl z-10 font-mono">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black">
          <div>
            <span className="text-[10px] text-orange-400 uppercase tracking-[0.25em] block">
              CONSOLE // ENTRY
            </span>
            <h2 className="font-display text-2xl text-white uppercase tracking-tight">
              {initialTask ? 'Modify Coursework Parameter' : 'Initialize New Deadline'}
            </h2>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1 border border-white/10 hover:border-white/30 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-widest mb-1.5">
              Assignment Title <span className="text-orange-400">*</span>
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
              } text-white text-xs placeholder-zinc-600 focus:outline-none uppercase tracking-wide`}
            />
            {errors.title && (
              <p className="mt-1 text-[11px] text-red-400 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.title}</span>
              </p>
            )}
          </div>

          {/* Course & Category Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-widest mb-1.5">
                Course Code
              </label>
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. CS 350, ECON 201"
                className="w-full px-3 py-2 bg-black border border-white/15 focus:border-orange-500 text-white text-xs uppercase tracking-wide focus:outline-none"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {COMMON_COURSES.slice(0, 4).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCourse(c)}
                    className="text-[9px] px-1.5 py-0.5 border border-white/10 hover:border-orange-400/50 text-zinc-400 hover:text-white transition-colors"
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-widest mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TaskCategory)}
                className="w-full px-3 py-2 bg-black border border-white/15 focus:border-orange-500 text-white text-xs uppercase tracking-wide focus:outline-none"
              >
                <option value="assignment">Assignment / P-Set</option>
                <option value="lab">Lab / Experiment</option>
                <option value="project">Project / Milestone</option>
                <option value="exam">Exam / Midterm</option>
                <option value="quiz">Quiz</option>
                <option value="reading">Reading / Discussion</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Due Date & Time */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-widest">
                Due Date & Time <span className="text-orange-400">*</span>
              </label>
              <span className="text-[10px] text-zinc-500">LOCAL CLOCK</span>
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
              } text-white text-xs focus:outline-none uppercase`}
            />
            {errors.dueDateTime && (
              <p className="mt-1 text-[11px] text-red-400 flex items-center space-x-1">
                <AlertCircle className="w-3 h-3" />
                <span>{errors.dueDateTime}</span>
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] text-zinc-600">SHORTCUTS:</span>
              <button
                type="button"
                onClick={() => setQuickDeadline(0, true)}
                className="text-[10px] px-2 py-0.5 border border-white/10 hover:border-white/30 text-zinc-400 hover:text-white"
              >
                Tonight 11:59 PM
              </button>
              <button
                type="button"
                onClick={() => setQuickDeadline(24, true)}
                className="text-[10px] px-2 py-0.5 border border-white/10 hover:border-white/30 text-zinc-400 hover:text-white"
              >
                Tomorrow 11:59 PM
              </button>
              <button
                type="button"
                onClick={() => setQuickDeadline(48)}
                className="text-[10px] px-2 py-0.5 border border-white/10 hover:border-white/30 text-zinc-400 hover:text-white"
              >
                In 2 Days
              </button>
            </div>
          </div>

          {/* Effort & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-widest mb-1.5">
                Estimated Workload (Hours) <span className="text-orange-400">*</span>
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
                className={`w-full px-3 py-2 bg-black border ${
                  errors.estimatedHours ? 'border-red-500' : 'border-white/15 focus:border-orange-500'
                } text-white text-xs focus:outline-none`}
              />
              {errors.estimatedHours && (
                <p className="mt-1 text-[11px] text-red-400 flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{errors.estimatedHours}</span>
                </p>
              )}

              <div className="flex flex-wrap gap-1 mt-1.5">
                {[0.5, 1.0, 2.0, 3.5, 5.0].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => setEstimatedHours(h)}
                    className={`text-[9px] px-1.5 py-0.5 border transition-colors ${
                      Number(estimatedHours) === h
                        ? 'border-orange-500 bg-orange-500/10 text-orange-400 font-bold'
                        : 'border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {h}H
                  </button>
                ))}
              </div>

              {/* Estimate Calibration Suggestion (only shown if >=3 completed samples) */}
              {(() => {
                const numVal = typeof estimatedHours === 'number' ? estimatedHours : parseFloat(String(estimatedHours));
                const suggestion = calibrations && !isNaN(numVal) && numVal > 0
                  ? getCalibratedEstimateSuggestion(category, numVal, calibrations)
                  : null;

                if (!suggestion) return null;

                return (
                  <div className="mt-2.5 p-2.5 border border-orange-500/40 bg-orange-950/20 text-xs space-y-1.5 animate-fade-in">
                    <div className="flex items-center justify-between text-orange-400 font-bold text-[10px] uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-orange-400" />
                        <span>Estimate Calibration</span>
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 border border-orange-500/30">
                        {suggestion.sampleCount} SAMPLES
                      </span>
                    </div>
                    <p className="text-zinc-300 text-[11px] leading-relaxed">
                      {suggestion.reason} Use <strong className="text-white font-bold">{suggestion.suggestedHours}h</strong>?
                    </p>
                    <div className="flex items-center gap-2 pt-0.5">
                      <button
                        type="button"
                        onClick={() => setEstimatedHours(suggestion.suggestedHours)}
                        className="px-2 py-0.5 bg-orange-500 hover:bg-orange-400 text-black font-bold uppercase text-[10px] tracking-wider transition-colors cursor-pointer"
                      >
                        Use {suggestion.suggestedHours}h
                      </button>
                      <span className="text-[10px] text-zinc-500">or keep {numVal}h</span>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-widest mb-1.5">
                Priority Weight <span className="text-orange-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((p) => {
                  const isSelected = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider border transition-all text-center ${
                        isSelected
                          ? p === 'urgent'
                            ? 'border-red-500 bg-red-500/20 text-red-300'
                            : p === 'high'
                              ? 'border-orange-500 bg-orange-500/20 text-orange-300'
                              : 'border-white bg-white/10 text-white'
                          : 'border-white/10 text-zinc-500 hover:border-white/20 hover:text-zinc-300 bg-black/40'
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
            <label className="block text-[11px] font-semibold text-zinc-300 uppercase tracking-widest mb-1.5">
              Protocol Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Submit on Canvas before 11:59 PM..."
              className="w-full px-3 py-2 bg-black border border-white/15 focus:border-orange-500 text-white text-xs focus:outline-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-white/10 hover:border-white/30 text-zinc-400 hover:text-white text-xs uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="group inline-flex items-center space-x-2 border border-orange-500 bg-orange-500 text-black px-5 py-2 text-xs uppercase tracking-widest font-bold hover:bg-orange-400 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <ScrambleTextOnHover
                text={initialTask ? 'Commit Changes' : 'Arm Deadline'}
                as="span"
                duration={0.3}
              />
              <BitmapChevron className="transition-transform duration-200 group-hover:rotate-45" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
