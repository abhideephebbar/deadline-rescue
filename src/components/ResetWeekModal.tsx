import React, { useState } from 'react';
import { X, RotateCcw, Calendar, CheckCheck, Archive, Sparkles, ArrowRight } from 'lucide-react';
import { Task, CapacitySettings } from '../types';
import { generateWeekResetPlan, applyWeekReset, WeekResetStrategy } from '../utils/recovery';
import { Modal } from './ui/Modal';

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

  const plan = generateWeekResetPlan(tasks, capacitySettings, now, strategy);

  const handleApply = () => {
    const updated = applyWeekReset(tasks, plan, now);
    onConfirmReset(updated);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-3xl"
      title="Reset my week"
    >
      <div className="p-6 sm:p-7 space-y-6 font-sans">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-orange-400 text-xs font-semibold uppercase tracking-wider">
              <RotateCcw className="w-4 h-4 text-orange-500" />
              <span>Fresh start</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mt-1">
              Reset my week
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              When deadlines pile up, resetting gives you an honest, manageable roadmap forward without guilt.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Affirmation Box */}
        <div className="p-4 rounded-xl border border-orange-500/20 bg-orange-950/20 flex items-start space-x-3 text-xs">
          <Sparkles className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold text-orange-400 text-xs">Principle:</span>
            <p className="text-zinc-200 leading-relaxed text-xs">
              {plan.affirmation}
            </p>
          </div>
        </div>

        {plan.overdueCount === 0 ? (
          <div className="p-8 text-center space-y-3 rounded-xl border border-white/10 bg-zinc-950/50">
            <span className="text-emerald-400 text-xs font-semibold block">✓ All up to date</span>
            <h3 className="text-lg font-semibold text-white">No overdue assignments found</h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto">
              Your assignments are all on schedule. If you are feeling fatigue or pressure, consider adjusting your daily focus capacity in Settings.
            </p>
          </div>
        ) : (
          <>
            {/* Strategy Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-300 block">
                Choose recovery strategy:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Option 1: Realistic Reschedule */}
                <button
                  type="button"
                  onClick={() => setStrategy('reschedule')}
                  className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                    strategy === 'reschedule'
                      ? 'border-orange-500 bg-orange-500/10 text-white shadow-sm'
                      : 'border-white/10 bg-black/40 text-zinc-400 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 text-orange-400 text-xs font-semibold mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Reschedule</span>
                  </div>
                  <p className="text-xs leading-snug">
                    Move overdue items forward into open study slots across the coming week.
                  </p>
                </button>

                {/* Option 2: Submit Partial */}
                <button
                  type="button"
                  onClick={() => setStrategy('submit_partial')}
                  className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                    strategy === 'submit_partial'
                      ? 'border-emerald-500 bg-emerald-500/10 text-white shadow-sm'
                      : 'border-white/10 bg-black/40 text-zinc-400 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 text-emerald-400 text-xs font-semibold mb-1">
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Submit Partial</span>
                  </div>
                  <p className="text-xs leading-snug">
                    Mark as submitted for partial credit to close loops and secure base points.
                  </p>
                </button>

                {/* Option 3: Clean Slate / Drop */}
                <button
                  type="button"
                  onClick={() => setStrategy('drop')}
                  className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                    strategy === 'drop'
                      ? 'border-blue-500 bg-blue-500/10 text-white shadow-sm'
                      : 'border-white/10 bg-black/40 text-zinc-400 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 text-blue-400 text-xs font-semibold mb-1">
                    <Archive className="w-3.5 h-3.5" />
                    <span>Forgive & Drop</span>
                  </div>
                  <p className="text-xs leading-snug">
                    Archive past backlog so you can focus 100% on upcoming exams and labs.
                  </p>
                </button>
              </div>
            </div>

            {/* Impact Telemetry */}
            <div className="p-3.5 rounded-xl border border-white/10 bg-black/50 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[11px] text-zinc-400 block">Overdue Items:</span>
                <span className="font-semibold text-orange-400 text-sm">{plan.overdueCount} tasks</span>
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 block">Backlog Relieved:</span>
                <span className="font-semibold text-white text-sm">{plan.totalOverdueHours.toFixed(1)}h</span>
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 block">New Active Load:</span>
                <span className="font-semibold text-emerald-400 text-sm">{plan.newWeeklyDemandHours.toFixed(1)}h</span>
              </div>
              <div>
                <span className="text-[11px] text-zinc-400 block">Weekly Budget:</span>
                <span className="font-semibold text-zinc-300 text-sm">{plan.totalWeeklyCapacityHours.toFixed(1)}h</span>
              </div>
            </div>

            {/* Live Preview List of Changes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold uppercase tracking-wider">
                <span>Proposed changes:</span>
                <span className="text-orange-400 capitalize">{plan.previewSummary}</span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {plan.changes.map((change) => (
                  <div
                    key={change.taskId}
                    className="p-3 rounded-lg border border-white/10 bg-black/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="px-1.5 py-0.5 rounded border border-white/15 text-zinc-300 text-[10px] font-bold">
                          {change.course}
                        </span>
                        <span className="font-medium text-white">{change.taskTitle}</span>
                      </div>
                      <p className="text-[11px] text-zinc-400">{change.summary}</p>
                    </div>

                    <div className="text-right shrink-0">
                      {change.action === 'rescheduled' && change.proposedDueDateTime && (
                        <div className="flex items-center space-x-1.5 text-xs">
                          <span className="text-red-400 line-through">Past due</span>
                          <ArrowRight className="w-3 h-3 text-orange-400" />
                          <span className="text-emerald-400 font-medium">
                            {new Date(change.proposedDueDateTime).toLocaleDateString(undefined, {
                              weekday: 'short',
                              month: 'numeric',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      )}
                      {change.action === 'marked_submitted' && (
                        <span className="text-emerald-400 text-xs font-medium border border-emerald-500/30 px-2 py-0.5 rounded bg-emerald-500/10">
                          Submitted (Partial)
                        </span>
                      )}
                      {change.action === 'dropped' && (
                        <span className="text-blue-400 text-xs font-medium border border-blue-500/30 px-2 py-0.5 rounded bg-blue-500/10">
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
            className="text-xs text-zinc-400 hover:text-white cursor-pointer"
          >
            Cancel
          </button>

          {plan.overdueCount > 0 ? (
            <button
              onClick={handleApply}
              type="button"
              className="px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-semibold text-xs tracking-wide transition-colors cursor-pointer flex items-center space-x-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Apply reset</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              type="button"
              className="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium text-xs tracking-wide transition-colors cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
