import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Check, 
  Sparkles, 
  Mail, 
  ArrowRight,
  BookmarkCheck,
  ChevronDown,
  Clock
} from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { Recommendation, Task, StopwatchState } from '../types';
import { getStarterStep } from '../utils/starterSteps';
import { Collapse } from './ui/Collapse';

interface NowCardProps {
  recommendation: Recommendation | null;
  onToggleComplete: (id: string) => void;
  onNotToday: (task: Task) => void;
  onEmailInstructor?: (task: Task) => void;
  stopwatch: {
    status: StopwatchState;
    displayElapsedMs: number;
    formattedTime: string;
    start: () => void;
    startStarterMode?: (taskId?: string) => void;
    isStarterMode?: boolean;
    isStarterCompleted?: boolean;
    completeStarterAndStop?: (taskDetails?: { id: string; title: string; course: string }) => void;
    completeStarterKeepGoing?: () => void;
    pause: () => void;
    resume: () => void;
    stop: () => void;
    saveSession: () => void;
    resetToIdle: () => void;
    selectedTaskId: string;
    setSelectedTaskId: (id: string) => void;
    isSaved: boolean;
  };
  catchUpCount?: number;
  onOpenCatchUp?: () => void;
}

export const NowCard: React.FC<NowCardProps> = ({
  recommendation,
  onToggleComplete,
  onNotToday,
  onEmailInstructor,
  stopwatch,
  catchUpCount = 0,
  onOpenCatchUp,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  // Empty State
  if (!recommendation) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-[#1d1d21] p-6 sm:p-8 text-center space-y-3 font-sans shadow-lg">
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
          <Check className="w-5 h-5" />
        </div>
        <h2 className="text-xl font-semibold text-white tracking-tight">
          You're all caught up
        </h2>
        <p className="text-sm text-zinc-400 max-w-sm mx-auto leading-relaxed">
          Zero pending deadlines right now. Take a break, or add an assignment to plan ahead.
        </p>
      </div>
    );
  }

  const { task, explanation, urgency } = recommendation;
  const starterStep = getStarterStep(task.category, task.title, task.course);

  // Check if stopwatch is actively attached to this task
  const isTimedOnThisTask = stopwatch.selectedTaskId === task.id;
  const timerActive = isTimedOnThisTask && (stopwatch.status === 'running' || stopwatch.status === 'paused');
  const timerStopped = isTimedOnThisTask && stopwatch.status === 'stopped';

  const handleStartTimer = () => {
    stopwatch.setSelectedTaskId(task.id);
    stopwatch.start();
  };

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={task.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="relative rounded-2xl border border-white/[0.08] bg-[#1d1d21] p-5 sm:p-7 shadow-lg font-sans space-y-5"
      >
        {/* Top Header Tag */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
              Up next
            </span>
          </div>

          {/* Status chip */}
          <span className="text-xs text-zinc-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full font-mono">
            {urgency.relativeTime}
          </span>
        </div>

        {/* Task Headline & Metadata */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-white bg-white/10 px-2 py-0.5 rounded whitespace-nowrap shrink-0">
              {task.course}
            </span>
            <span className="text-xs text-zinc-400 capitalize">
              {task.category}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs text-zinc-400 font-mono">
              {task.estimatedHours}h estimated
            </span>
            {task.needsReview && (
              <span
                className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-400/10 border border-amber-400/20 px-2 py-0.5 rounded"
                title="Imported with uncertainty — review details"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Needs review
              </span>
            )}
          </div>

          <h2 className="text-2xl sm:text-[30px] font-bold text-white tracking-tight leading-tight">
            {task.title}
          </h2>

          {/* Muted 2-line plain reason with tooltip */}
          <p
            className="text-xs sm:text-sm text-zinc-400 leading-relaxed line-clamp-2"
            title={explanation}
          >
            <span className="font-medium text-zinc-300">Why this one:</span>{' '}
            {explanation}
          </p>
        </div>

        {/* Timer & Primary Actions */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/[0.08]">
          {/* Left: Stopwatch Timer Controls */}
          <div className="flex items-center space-x-3 min-h-[44px]">
            <AnimatePresence mode="wait">
              {timerActive ? (
                <m.div
                  key="timer-active"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center space-x-3"
                >
                  <span className="font-mono text-xl sm:text-2xl font-bold text-white tracking-wider">
                    {stopwatch.formattedTime}
                  </span>

                  {stopwatch.status === 'running' ? (
                    <button
                      type="button"
                      onClick={stopwatch.pause}
                      className="px-3 py-1.5 min-h-[36px] rounded-lg border border-white/20 hover:border-white/40 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopwatch.resume}
                      className="px-3 py-1.5 min-h-[36px] rounded-lg bg-orange-500 text-black text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Resume</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={stopwatch.stop}
                    className="px-3 py-1.5 min-h-[36px] rounded-lg border border-red-500/30 hover:border-red-500/60 text-red-400 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Stop</span>
                  </button>
                </m.div>
              ) : timerStopped ? (
                <m.div
                  key="timer-stopped"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center space-x-3"
                >
                  <span className="font-mono text-sm text-zinc-300">
                    Logged: {stopwatch.formattedTime}
                  </span>
                  {!stopwatch.isSaved ? (
                    <button
                      type="button"
                      onClick={stopwatch.saveSession}
                      className="px-3 py-1.5 min-h-[36px] rounded-lg bg-emerald-500 text-black text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <BookmarkCheck className="w-3.5 h-3.5" />
                      <span>Save session</span>
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-400 font-medium">✓ Saved</span>
                  )}
                  <button
                    type="button"
                    onClick={handleStartTimer}
                    className="px-3 py-1.5 min-h-[36px] rounded-lg border border-white/20 text-zinc-300 text-xs hover:text-white transition-colors cursor-pointer"
                  >
                    Restart
                  </button>
                </m.div>
              ) : (
                <m.div
                  key="timer-idle"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-wrap items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={handleStartTimer}
                    className="inline-flex items-center space-x-2 px-4 py-2 min-h-[44px] rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-semibold text-sm transition-colors shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (stopwatch.startStarterMode) {
                        stopwatch.startStarterMode(task.id);
                      } else {
                        stopwatch.setSelectedTaskId(task.id);
                        stopwatch.start();
                      }
                    }}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 min-h-[44px] rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white font-medium text-xs sm:text-sm transition-colors cursor-pointer"
                  >
                    <Clock className="w-3.5 h-3.5 text-orange-400" />
                    <span>Just 5 minutes</span>
                  </button>
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* 5-Minute Starter Mode Notice & Completion Choices */}
          {timerActive && stopwatch.isStarterMode && (
            <div className="w-full pt-1">
              {stopwatch.isStarterCompleted ? (
                <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-400">
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>5 minutes completed!</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        stopwatch.completeStarterAndStop?.({
                          id: task.id,
                          title: task.title,
                          course: task.course,
                        })
                      }
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs transition-colors cursor-pointer min-h-[38px]"
                    >
                      That counts — log it and stop
                    </button>
                    <button
                      type="button"
                      onClick={() => stopwatch.completeStarterKeepGoing?.()}
                      className="px-3.5 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors cursor-pointer min-h-[38px]"
                    >
                      Keep going
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-orange-300 font-medium">
                  Just 5 minutes. You can stop after — starting is the whole game.
                </p>
              )}
            </div>
          )}

          {/* Right: Secondary Actions */}
          <div className="flex items-center space-x-3 text-sm">
            {/* Mark Complete */}
            <button
              type="button"
              onClick={() => onToggleComplete(task.id)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 min-h-[40px] rounded-lg border border-white/10 hover:border-emerald-500/50 text-zinc-300 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Mark done</span>
            </button>

            {/* Quiet "Not today" */}
            <button
              type="button"
              onClick={() => onNotToday(task)}
              className="text-zinc-400 hover:text-white underline underline-offset-4 transition-colors cursor-pointer text-xs min-h-[40px] flex items-center"
              title="Move this task to tomorrow so you can focus on something else"
            >
              Not today
            </button>
          </div>
        </div>

        {/* Collapsible Details Disclosure (Collapsed by default) */}
        <div className="pt-1 border-t border-white/[0.08]">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="inline-flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer py-1"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showDetails ? 'rotate-180' : ''}`} />
            <span>{showDetails ? 'Hide details' : 'Show details'}</span>
          </button>

          <Collapse isOpen={showDetails}>
            <div className="space-y-4 pt-3 text-xs">
              {/* Full Notes (if available) */}
              {task.notes && (
                <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5 space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">Notes</span>
                  <p className="text-zinc-300 leading-relaxed">{task.notes}</p>
                </div>
              )}

              {/* 10-Minute Starter Kickoff Step */}
              <div className="rounded-lg border border-orange-500/20 bg-orange-950/15 p-3.5 space-y-1.5">
                <div className="flex items-center space-x-1.5 text-xs font-medium text-orange-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>First 10 minutes</span>
                </div>
                <p className="text-xs text-zinc-200 leading-relaxed">
                  {starterStep}
                </p>
              </div>

              {/* Overdue Recovery Guidance (if overdue) */}
              {urgency.isOverdue && (
                <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-950/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="text-amber-300">
                    Deadline passed. Take a recovery step:
                  </span>
                  <div className="flex items-center space-x-2 shrink-0">
                    {onEmailInstructor && (
                      <button
                        type="button"
                        onClick={() => onEmailInstructor(task)}
                        className="px-2.5 py-1 rounded border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <Mail className="w-3 h-3" />
                        <span>Email instructor</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onToggleComplete(task.id)}
                      className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 flex items-center space-x-1 transition-colors cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>Submit partial work</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Note when older catch-up items exist */}
              {catchUpCount > 0 && onOpenCatchUp && (
                <div className="pt-1 text-xs text-zinc-400 flex items-center justify-between">
                  <span>{catchUpCount} older item{catchUpCount === 1 ? '' : 's'} need attention.</span>
                  <button
                    type="button"
                    onClick={onOpenCatchUp}
                    className="text-orange-400 hover:text-orange-300 underline underline-offset-2 cursor-pointer flex items-center space-x-1"
                  >
                    <span>Review catch-up items</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </Collapse>
        </div>
      </m.div>
    </AnimatePresence>
  );
};
