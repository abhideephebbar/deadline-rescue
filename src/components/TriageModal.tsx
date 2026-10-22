import React from 'react';
import { X, ShieldAlert, Play, Check } from 'lucide-react';
import { Task, CapacitySettings } from '../types';
import { generateTriagePlan } from '../utils/triage';
import { Modal } from './ui/Modal';

interface TriageModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  capacitySettings: CapacitySettings;
  now?: Date;
  remainingEffortMap?: Record<string, number>;
  onStartNow?: (task: Task) => void;
  onToggleComplete?: (id: string) => void;
}

export const TriageModal: React.FC<TriageModalProps> = ({
  isOpen,
  onClose,
  tasks,
  capacitySettings,
  now = new Date(),
  remainingEffortMap,
  onStartNow,
  onToggleComplete,
}) => {
  const plan = generateTriagePlan(tasks, capacitySettings, now, remainingEffortMap);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
      title="Workload triage"
    >
      <div className="p-6 sm:p-7 space-y-6 font-sans">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-orange-400 text-xs font-semibold uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4 text-orange-500" />
              <span>Overload triage</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight mt-1">
              Workload recovery plan
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              When study hours fall short of total deadlines, triage helps you focus on what matters most.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close triage"
            className="p-1.5 rounded-lg border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Workload Relief Summary */}
        <div className="p-4 rounded-xl border border-white/10 bg-black/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-xs text-zinc-400 font-medium">Workload adjustment:</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-zinc-400 line-through">{plan.totalDemandHours}h demand</span>
              <span className="text-orange-400 font-bold">&rarr;</span>
              <span className="text-emerald-400 font-bold text-sm">{plan.optimizedDemandHours}h plan</span>
              <span className="text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded text-[11px]">
                Saved {plan.hoursSaved}h
              </span>
            </div>
          </div>
          <div className="text-xs text-zinc-400 text-left sm:text-right">
            Weekly budget: <strong>{plan.totalCapacityHours}h</strong> ·{' '}
            <span className={plan.isOverCapacity ? 'text-orange-400 font-semibold' : 'text-emerald-400'}>
              {plan.isOverCapacity ? `${plan.deficitHours}h deficit resolved` : 'Capacity on track'}
            </span>
          </div>
        </div>

        {/* Three-Column Triage Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: DO FULLY */}
          <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-red-500/20 pb-2">
              <div className="flex items-center space-x-2 text-red-400 text-xs font-semibold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>1. Do fully</span>
              </div>
              <span className="text-xs text-red-300 font-medium">{plan.doFully.length}</span>
            </div>
            <p className="text-xs text-zinc-400">
              High-priority assignments with key deadlines. Commit full focus.
            </p>

            <div className="space-y-2.5">
              {plan.doFully.length > 0 ? (
                plan.doFully.map(({ task, oneLineReason, recommendedHours }) => (
                  <div key={task.id} className="p-3 rounded-lg border border-white/10 bg-black/40 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white truncate">{task.title}</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-orange-400 text-xs font-mono font-bold">{recommendedHours}h</span>
                        {onToggleComplete && (
                          <button
                            onClick={() => onToggleComplete(task.id)}
                            type="button"
                            title="Mark completed"
                            className="p-1 rounded border border-white/10 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center space-x-2">
                      <span className="px-1.5 py-0.5 rounded border border-white/10 text-zinc-300 whitespace-nowrap shrink-0">{task.course}</span>
                      <span>•</span>
                      <span className="capitalize text-red-400">{task.priority}</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 italic pt-0.5">{oneLineReason}</p>
                    {onStartNow && (
                      <button
                        onClick={() => {
                          onStartNow(task);
                          onClose();
                        }}
                        type="button"
                        className="mt-1 w-full py-1 rounded bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs font-medium flex items-center justify-center space-x-1 transition-colors"
                      >
                        <Play className="w-3 h-3" />
                        <span>Start now</span>
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-zinc-500 text-xs py-3 text-center">None in this category.</div>
              )}
            </div>
          </div>

          {/* Column 2: DO MINIMUM */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/10 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
              <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>2. Do the minimum</span>
              </div>
              <span className="text-xs text-amber-300 font-medium">{plan.doMinimum.length}</span>
            </div>
            <p className="text-xs text-zinc-400">
              Deliver 80% quality in half the time. Submit partial work without guilt.
            </p>

            <div className="space-y-2.5">
              {plan.doMinimum.length > 0 ? (
                plan.doMinimum.map(({ task, oneLineReason, recommendedHours }) => (
                  <div key={task.id} className="p-3 rounded-lg border border-white/10 bg-black/40 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white truncate">{task.title}</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-amber-400 text-xs font-mono font-bold">{recommendedHours}h cap</span>
                        {onToggleComplete && (
                          <button
                            onClick={() => onToggleComplete(task.id)}
                            type="button"
                            title="Mark completed"
                            className="p-1 rounded border border-white/10 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center space-x-2">
                      <span className="px-1.5 py-0.5 rounded border border-white/10 text-zinc-300 whitespace-nowrap shrink-0">{task.course}</span>
                      <span>•</span>
                      <span className="capitalize text-amber-400">{task.priority}</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 italic pt-0.5">{oneLineReason}</p>
                  </div>
                ))
              ) : (
                <div className="text-zinc-500 text-xs py-3 text-center">None in this category.</div>
              )}
            </div>
          </div>

          {/* Column 3: SAFE TO DEFER */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-950/10 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
              <div className="flex items-center space-x-2 text-blue-400 text-xs font-semibold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>3. Safe to defer</span>
              </div>
              <span className="text-xs text-blue-300 font-medium">{plan.safeToDefer.length}</span>
            </div>
            <p className="text-xs text-zinc-400">
              Low-stakes coursework. Request an extension or deprioritize.
            </p>

            <div className="space-y-2.5">
              {plan.safeToDefer.length > 0 ? (
                plan.safeToDefer.map(({ task, oneLineReason }) => (
                  <div key={task.id} className="p-3 rounded-lg border border-white/10 bg-black/40 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white truncate">{task.title}</span>
                      <div className="flex items-center space-x-1.5">
                        {onToggleComplete && (
                          <button
                            onClick={() => onToggleComplete(task.id)}
                            type="button"
                            title="Mark completed"
                            className="p-1 rounded border border-white/10 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center space-x-2">
                      <span className="px-1.5 py-0.5 rounded border border-white/10 text-zinc-300 whitespace-nowrap shrink-0">{task.course}</span>
                      <span>•</span>
                      <span className="capitalize text-blue-400">{task.priority}</span>
                    </div>
                    <p className="text-[11px] text-blue-200/90 italic pt-0.5">{oneLineReason}</p>
                  </div>
                ))
              ) : (
                <div className="text-zinc-500 text-xs py-3 text-center">No deferrals needed.</div>
              )}
            </div>
          </div>
        </div>

        {/* Suggestion disclaimer */}
        <div className="p-3.5 rounded-xl border border-white/10 bg-zinc-950 text-xs text-zinc-400 space-y-1">
          <p className="text-[11px] leading-relaxed text-zinc-400">
            {plan.disclaimer}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            type="button"
            className="text-xs text-zinc-400 hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            type="button"
            className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-semibold text-xs tracking-wide transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
