import React, { useState } from 'react';
import { X, Check, Mail, Calendar, EyeOff, Clock, Sparkles } from 'lucide-react';
import { Task } from '../types';
import { formatRelativeTime } from '../utils/date';

interface CatchUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  catchUpTasks: Task[];
  onMarkDone: (id: string) => void;
  onDropTask: (id: string) => void;
  onEmailInstructor: (task: Task) => void;
  onReschedule: (task: Task, newDateIso: string) => void;
  now?: Date;
}

export const CatchUpModal: React.FC<CatchUpModalProps> = ({
  isOpen,
  onClose,
  catchUpTasks,
  onMarkDone,
  onDropTask,
  onEmailInstructor,
  onReschedule,
  now = new Date(),
}) => {
  const [reschedulingTaskId, setReschedulingTaskId] = useState<string | null>(null);
  const [customDate, setCustomDate] = useState<string>('');

  if (!isOpen) return null;

  const handleQuickReschedule = (task: Task, daysToAdd: number) => {
    const base = now.getTime();
    const newDue = new Date(base + daysToAdd * 24 * 60 * 60 * 1000);
    newDue.setHours(23, 59, 0, 0);
    onReschedule(task, newDue.toISOString());
    setReschedulingTaskId(null);
  };

  const handleCustomReschedule = (task: Task) => {
    if (!customDate) return;
    const newDue = new Date(customDate);
    if (!isNaN(newDue.getTime())) {
      onReschedule(task, newDue.toISOString());
      setReschedulingTaskId(null);
      setCustomDate('');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="catch-up-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans"
    >
      <div className="bg-[#141414] border border-white/10 rounded-2xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-orange-400">
              <Sparkles className="w-4 h-4" />
              <h2 id="catch-up-title" className="text-base sm:text-lg font-semibold text-white">
                Catch-up items
              </h2>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              These assignments passed over 24 hours ago. Choose the best next step to keep your momentum going—no guilt, no penalty.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {catchUpTasks.length === 0 ? (
            <div className="text-center py-8 text-zinc-400 text-xs">
              All caught up! No older items needing review.
            </div>
          ) : (
            catchUpTasks.map((task) => {
              const due = new Date(task.dueDateTime).getTime();
              const hoursOverdue = Math.round((now.getTime() - due) / (1000 * 60 * 60));
              const isRescheduling = reschedulingTaskId === task.id;

              return (
                <div
                  key={task.id}
                  className="rounded-xl border border-white/10 bg-zinc-950/60 p-4 space-y-3"
                >
                  {/* Task details */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-[10px] font-bold text-zinc-300 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0">
                          {task.course}
                        </span>
                        <span className="text-[11px] text-amber-400/90 flex items-center space-x-1 font-mono">
                          <Clock className="w-3 h-3" />
                          <span>Passed {formatRelativeTime(-hoursOverdue)}</span>
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-white truncate">
                        {task.title}
                      </h3>
                      {task.notes && (
                        <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">
                          {task.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Quick action buttons */}
                  {!isRescheduling ? (
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5">
                      {/* 1. Mark done */}
                      <button
                        type="button"
                        onClick={() => onMarkDone(task.id)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Mark done</span>
                      </button>

                      {/* 2. Let it go / drop */}
                      <button
                        type="button"
                        onClick={() => onDropTask(task.id)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 text-xs transition-colors cursor-pointer"
                        title="Remove from active view without guilt"
                      >
                        <EyeOff className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Let it go</span>
                      </button>

                      {/* 3. Email instructor */}
                      <button
                        type="button"
                        onClick={() => {
                          onEmailInstructor(task);
                          onClose();
                        }}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-white/10 text-xs transition-colors cursor-pointer"
                      >
                        <Mail className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Email instructor</span>
                      </button>

                      {/* 4. Reschedule */}
                      <button
                        type="button"
                        onClick={() => setReschedulingTaskId(task.id)}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-orange-400 border border-white/10 text-xs transition-colors cursor-pointer"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Reschedule</span>
                      </button>
                    </div>
                  ) : (
                    /* Inline Reschedule Options */
                    <div className="space-y-2 pt-2 border-t border-white/10 bg-black/40 p-3 rounded-lg animate-fade-in text-xs">
                      <div className="flex items-center justify-between text-zinc-300 font-medium">
                        <span>Pick new target deadline:</span>
                        <button
                          type="button"
                          onClick={() => setReschedulingTaskId(null)}
                          className="text-zinc-500 hover:text-zinc-300 text-[11px]"
                        >
                          Cancel
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleQuickReschedule(task, 1)}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10"
                        >
                          Tomorrow night
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickReschedule(task, 3)}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10"
                        >
                          In 3 days
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickReschedule(task, 7)}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/10"
                        >
                          Next week
                        </button>
                      </div>

                      <div className="flex items-center space-x-2 pt-1">
                        <input
                          type="datetime-local"
                          value={customDate}
                          onChange={(e) => setCustomDate(e.target.value)}
                          className="px-2 py-1 rounded bg-zinc-900 border border-white/10 text-white text-xs"
                        />
                        <button
                          type="button"
                          disabled={!customDate}
                          onClick={() => handleCustomReschedule(task)}
                          className="px-3 py-1 rounded bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-black font-medium text-xs"
                        >
                          Set
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-end bg-zinc-950/40">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

