import React, { useEffect } from 'react';
import { X, ShieldAlert, Play, Check } from 'lucide-react';
import { Task, CapacitySettings } from '../types';
import { generateTriagePlan } from '../utils/triage';

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
  // ESC key handler
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

  const plan = generateTriagePlan(tasks, capacitySettings, now, remainingEffortMap);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="triage-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto animate-fade-in"
    >
      <div className="relative w-full max-w-4xl bg-[#111111] border border-orange-500/40 text-white font-mono shadow-[0_0_50px_rgba(249,115,22,0.15)] p-6 sm:p-8 space-y-6 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center space-x-2 text-orange-400 text-xs uppercase tracking-widest font-bold">
              <ShieldAlert className="w-4 h-4 text-orange-500" />
              <span>TACTICAL EMERGENCY TRIAGE MODE</span>
            </div>
            <h2 id="triage-modal-title" className="font-display text-2xl sm:text-3xl text-white tracking-tight uppercase mt-1">
              Workload Recovery Protocol
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              When remaining effort exceeds available capacity, tactical triage protects your GPA by prioritizing what truly matters.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close triage"
            className="p-1.5 border border-white/10 text-zinc-400 hover:text-white hover:border-white/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Workload Relief Summary */}
        <div className="p-4 border border-white/10 bg-black/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-[10px] uppercase text-zinc-500 tracking-wider">CAPACITY RECOVERY:</span>
            <div className="flex items-baseline space-x-2">
              <span className="text-zinc-400 line-through">{plan.totalDemandHours}h demand</span>
              <span className="text-orange-400 font-bold">&rarr;</span>
              <span className="text-emerald-400 font-bold text-sm">{plan.optimizedDemandHours}h triage plan</span>
              <span className="text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.2 text-[10px]">
                SAVED {plan.hoursSaved}H FOCUS
              </span>
            </div>
          </div>
          <div className="text-[11px] text-zinc-400 text-left sm:text-right">
            Weekly Budget: <strong>{plan.totalCapacityHours}h</strong> //{' '}
            <span className={plan.isOverCapacity ? 'text-orange-400 font-bold' : 'text-emerald-400'}>
              {plan.isOverCapacity ? `${plan.deficitHours}h Deficit Resolved` : 'Capacity Secure'}
            </span>
          </div>
        </div>

        {/* Three-Column Triage Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Column 1: DO FULLY */}
          <div className="border border-red-500/30 bg-red-950/10 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-red-500/20 pb-2">
              <div className="flex items-center space-x-2 text-red-400 text-xs uppercase font-bold tracking-wider">
                <span className="w-2 h-2 bg-red-500" />
                <span>1. DO FULLY</span>
              </div>
              <span className="text-[10px] text-red-300 font-bold">[{plan.doFully.length}]</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              High-stakes deliverables with major GPA weight. Commit full focus.
            </p>

            <div className="space-y-2.5">
              {plan.doFully.length > 0 ? (
                plan.doFully.map(({ task, oneLineReason, recommendedHours }) => (
                  <div key={task.id} className="p-2.5 border border-white/10 bg-black/40 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white uppercase truncate">{task.title}</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-orange-400 text-[10px] font-bold">{recommendedHours}h</span>
                        {onToggleComplete && (
                          <button
                            onClick={() => onToggleComplete(task.id)}
                            type="button"
                            title="Mark task completed"
                            className="p-0.5 border border-white/20 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-500 flex items-center space-x-2">
                      <span className="px-1 border border-white/10 text-zinc-400">{task.course}</span>
                      <span>•</span>
                      <span className="uppercase text-red-400">{task.priority}</span>
                    </div>
                    <p className="text-[11px] text-zinc-300 italic pt-0.5">// {oneLineReason}</p>
                    {onStartNow && (
                      <button
                        onClick={() => {
                          onStartNow(task);
                          onClose();
                        }}
                        type="button"
                        className="mt-1 w-full py-1 bg-orange-500/20 hover:bg-orange-500 hover:text-black border border-orange-500/40 text-orange-400 text-[10px] uppercase font-bold transition-colors flex items-center justify-center gap-1"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Start Working Now</span>
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-zinc-600 text-xs py-3 text-center">No high-stakes tasks currently queued.</div>
              )}
            </div>
          </div>

          {/* Column 2: DO THE MINIMUM */}
          <div className="border border-amber-500/30 bg-amber-950/10 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
              <div className="flex items-center space-x-2 text-amber-400 text-xs uppercase font-bold tracking-wider">
                <span className="w-2 h-2 bg-amber-400" />
                <span>2. DO MINIMUM</span>
              </div>
              <span className="text-[10px] text-amber-300 font-bold">[{plan.doMinimum.length}]</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Capture 75–80% partial credit with 50% effort. Solve core questions only.
            </p>

            <div className="space-y-2.5">
              {plan.doMinimum.length > 0 ? (
                plan.doMinimum.map(({ task, oneLineReason, recommendedHours, originalEffort }) => (
                  <div key={task.id} className="p-2.5 border border-white/10 bg-black/40 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white uppercase truncate">{task.title}</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-amber-400 text-[10px] font-bold">
                          {recommendedHours}h <span className="text-zinc-500 line-through">({originalEffort}h)</span>
                        </span>
                        {onToggleComplete && (
                          <button
                            onClick={() => onToggleComplete(task.id)}
                            type="button"
                            title="Mark task completed"
                            className="p-0.5 border border-white/20 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-500 flex items-center space-x-2">
                      <span className="px-1 border border-white/10 text-zinc-400">{task.course}</span>
                      <span>•</span>
                      <span className="uppercase text-amber-400">{task.priority}</span>
                    </div>
                    <p className="text-[11px] text-amber-200/90 italic pt-0.5">// {oneLineReason}</p>
                  </div>
                ))
              ) : (
                <div className="text-zinc-600 text-xs py-3 text-center">No medium MVP candidates.</div>
              )}
            </div>
          </div>

          {/* Column 3: SAFE TO DEFER */}
          <div className="border border-blue-500/30 bg-blue-950/10 p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
              <div className="flex items-center space-x-2 text-blue-400 text-xs uppercase font-bold tracking-wider">
                <span className="w-2 h-2 bg-blue-400" />
                <span>3. SAFE TO DEFER</span>
              </div>
              <span className="text-[10px] text-blue-300 font-bold">[{plan.safeToDefer.length}]</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Low-stakes tasks or distant deadlines. Pause guilt-free to rescue today.
            </p>

            <div className="space-y-2.5">
              {plan.safeToDefer.length > 0 ? (
                plan.safeToDefer.map(({ task, oneLineReason, originalEffort }) => (
                  <div key={task.id} className="p-2.5 border border-white/10 bg-black/40 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white uppercase truncate">{task.title}</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-blue-400 text-[10px] font-bold">
                          0h today <span className="text-zinc-500">({originalEffort}h freed)</span>
                        </span>
                        {onToggleComplete && (
                          <button
                            onClick={() => onToggleComplete(task.id)}
                            type="button"
                            title="Mark task completed"
                            className="p-0.5 border border-white/20 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500 transition-colors"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-[10px] text-zinc-500 flex items-center space-x-2">
                      <span className="px-1 border border-white/10 text-zinc-400">{task.course}</span>
                      <span>•</span>
                      <span className="uppercase text-blue-400">{task.priority}</span>
                    </div>
                    <p className="text-[11px] text-blue-200/90 italic pt-0.5">// {oneLineReason}</p>
                  </div>
                ))
              ) : (
                <div className="text-zinc-600 text-xs py-3 text-center">No low-priority deferrals found.</div>
              )}
            </div>
          </div>
        </div>

        {/* Mandatory Explicit Disclaimer: Input-based, not Predictions */}
        <div className="p-3.5 border border-white/10 bg-zinc-950 text-xs text-zinc-400 space-y-1">
          <div className="flex items-center space-x-2 text-orange-400 font-bold uppercase text-[10px] tracking-wider">
            <span>ℹ️ MODEL NOTICE: USER INPUTS, NOT PREDICTIONS</span>
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            {plan.disclaimer}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            type="button"
            className="text-xs text-zinc-400 hover:text-white uppercase tracking-wider"
          >
            Close Triage View
          </button>
          <button
            onClick={onClose}
            type="button"
            className="px-5 py-2 bg-orange-500 hover:bg-orange-400 text-black font-bold uppercase text-xs tracking-widest transition-colors cursor-pointer"
          >
            Apply Triage Focus
          </button>
        </div>
      </div>
    </div>
  );
};
