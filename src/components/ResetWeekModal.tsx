import React, { useState, useEffect } from 'react';
import { X, RotateCcw, Calendar, CheckCheck, Archive, Sparkles, ArrowRight } from 'lucide-react';
import { Task, CapacitySettings } from '../types';
import { generateWeekResetPlan, applyWeekReset, WeekResetStrategy } from '../utils/recovery';

interface ResetWeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  capacitySettings: CapacitySettings;
  now?: Date;
  onConfirmReset: (updatedTasks: Task[]) => void;
}

export const ResetWeekModal: React.FC<ResetWeekModalProps> = ({
  isOpen,
  onClose,
  tasks,
  capacitySettings,
  now = new Date(),
  onConfirmReset,
}) => {
  const [strategy, setStrategy] = useState<WeekResetStrategy>('reschedule');

  // ESC handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const plan = generateWeekResetPlan(tasks, capacitySettings, now, strategy);

  const handleApply = () => {
    const updated = applyWeekReset(tasks, plan, now);
    onConfirmReset(updated);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-week-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
    >
      <div className="relative w-full max-w-3xl bg-[#111111] border border-orange-500/40 text-white font-mono shadow-[0_0_50px_rgba(249,115,22,0.15)] p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-orange-400 text-xs uppercase tracking-widest font-bold">
              <RotateCcw className="w-4 h-4 text-orange-500" />
              <span>RECOVERY PROTOCOL // FRESH START</span>
            </div>
            <h2 id="reset-week-modal-title" className="font-display text-2xl sm:text-3xl text-white tracking-tight uppercase mt-1">
              Reset My Week
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              When coursework piles up, shame and paralysis solve nothing. Resetting gives you an honest, manageable roadmap forward.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Affirmation Box */}
        <div className="p-4 border border-orange-500/30 bg-orange-950/20 flex items-start space-x-3 text-xs">
          <Sparkles className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold text-orange-400 uppercase tracking-wider text-[11px]">GUIDING PRINCIPLE:</span>
            <p className="text-zinc-200 leading-relaxed text-xs">
              {plan.affirmation}
            </p>
          </div>
        </div>

        {plan.overdueCount === 0 ? (
          <div className="p-8 text-center space-y-3 border border-white/10 bg-zinc-950/50">
            <span className="text-emerald-400 text-xs uppercase font-bold tracking-widest block">✓ RADAR HEALTHY</span>
            <h3 className="font-display text-2xl text-white uppercase">No Overdue Assignments Found</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Your assignments are all on schedule. If you are feeling fatigue or pressure, consider adjusting your daily focus capacity in Settings.
            </p>
          </div>
        ) : (
          <>
            {/* Strategy Selector */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">
                SELECT RECOVERY STRATEGY:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Option 1: Realistic Reschedule */}
                <button
                  type="button"
                  onClick={() => setStrategy('reschedule')}
                  className={`p-3 text-left border transition-all cursor-pointer ${
                    strategy === 'reschedule'
                      ? 'border-orange-500 bg-orange-500/10 text-white shadow-[0_0_15px_rgba(249,115,22,0.2)]'
                      : 'border-white/10 bg-black/40 text-zinc-400 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 text-orange-400 text-xs font-bold uppercase mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Reschedule</span>
                  </div>
                  <p className="text-[11px] leading-snug">
                    Move overdue items forward into open study slots across the coming week.
                  </p>
                </button>

                {/* Option 2: Submit Partial */}
                <button
                  type="button"
                  onClick={() => setStrategy('submit_partial')}
                  className={`p-3 text-left border transition-all cursor-pointer ${
                    strategy === 'submit_partial'
                      ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : 'border-white/10 bg-black/40 text-zinc-400 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-bold uppercase mb-1">
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Submit Partial</span>
                  </div>
                  <p className="text-[11px] leading-snug">
                    Mark as submitted for partial credit to close loops and secure base points.
                  </p>
                </button>

                {/* Option 3: Clean Slate / Drop */}
                <button
                  type="button"
                  onClick={() => setStrategy('drop')}
                  className={`p-3 text-left border transition-all cursor-pointer ${
                    strategy === 'drop'
                      ? 'border-blue-500 bg-blue-500/10 text-white shadow-[0_0_15px_rgba(59,130,246,0.2)]'
                      : 'border-white/10 bg-black/40 text-zinc-400 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 text-blue-400 text-xs font-bold uppercase mb-1">
                    <Archive className="w-3.5 h-3.5" />
                    <span>Forgive & Drop</span>
                  </div>
                  <p className="text-[11px] leading-snug">
                    Archive past backlog so you can pour 100% focus into upcoming exams and labs.
                  </p>
                </button>
              </div>
            </div>

            {/* Impact Telemetry */}
            <div className="p-3.5 border border-white/10 bg-black/50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Overdue Items:</span>
                <span className="font-bold text-orange-400 text-sm">{plan.overdueCount} tasks</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Backlog Relieved:</span>
                <span className="font-bold text-white text-sm">{plan.totalOverdueHours.toFixed(1)}h</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">New Active Load:</span>
                <span className="font-bold text-emerald-400 text-sm">{plan.newWeeklyDemandHours.toFixed(1)}h</span>
              </div>
              <div>
                <span className="text-[10px] text-zinc-500 uppercase block">Weekly Budget:</span>
                <span className="font-bold text-zinc-300 text-sm">{plan.totalWeeklyCapacityHours.toFixed(1)}h</span>
              </div>
            </div>

            {/* Live Preview List of Changes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 uppercase tracking-wider font-bold">
                <span>PREVIEW OF PROPOSED CHANGES:</span>
                <span className="text-orange-400">{plan.previewSummary}</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {plan.changes.map((change) => (
                  <div
                    key={change.taskId}
                    className="p-3 border border-white/10 bg-black/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="px-1 border border-white/20 text-zinc-300 text-[10px] font-bold">
                          {change.course}
                        </span>
                        <span className="font-bold text-white uppercase">{change.taskTitle}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">// {change.summary}</p>
                    </div>

                    <div className="text-right shrink-0">
                      {change.action === 'rescheduled' && change.proposedDueDateTime && (
                        <div className="flex items-center space-x-1.5 text-[11px]">
                          <span className="text-red-400 line-through">Past due</span>
                          <ArrowRight className="w-3 h-3 text-orange-400" />
                          <span className="text-emerald-400 font-bold">
                            {new Date(change.proposedDueDateTime).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'numeric',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                      {change.action === 'marked_submitted' && (
                        <span className="text-emerald-400 text-[10px] uppercase font-bold border border-emerald-500/30 px-1.5 py-0.5 bg-emerald-500/10">
                          Submitted (Partial)
                        </span>
                      )}
                      {change.action === 'dropped' && (
                        <span className="text-blue-400 text-[10px] uppercase font-bold border border-blue-500/30 px-1.5 py-0.5 bg-blue-500/10">
                          Archived
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            type="button"
            className="text-xs text-zinc-400 hover:text-white uppercase tracking-wider cursor-pointer"
          >
            Cancel
          </button>

          {plan.overdueCount > 0 ? (
            <button
              onClick={handleApply}
              type="button"
              className="px-5 py-2.5 bg-orange-500 hover:bg-orange-400 text-black font-bold uppercase text-xs tracking-widest transition-colors cursor-pointer flex items-center space-x-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Confirm & Apply Reset</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              type="button"
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold uppercase text-xs tracking-widest transition-colors cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
