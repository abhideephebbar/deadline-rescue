import React from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Check, 
  Sparkles, 
  Mail, 
  ArrowRight,
  BookmarkCheck
} from 'lucide-react';
import { Recommendation, Task, StopwatchState } from '../types';
import { getStarterStep } from '../utils/starterSteps';

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
  // Empty State
  if (!recommendation) {
    return (
      <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-6 sm:p-8 text-center space-y-3 font-sans">
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
    <div className="relative rounded-xl border border-orange-500/30 bg-zinc-950 p-5 sm:p-7 shadow-[0_4px_24px_rgba(0,0,0,0.5)] font-sans space-y-5">
      {/* Top Header Tag */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">
            Do this now
          </span>
        </div>

        {/* Status chip */}
        <span className="text-xs text-zinc-400 bg-white/5 border border-white/10 px-2.5 py-0.5 rounded-full">
          {urgency.relativeTime}
        </span>
      </div>

      {/* Task Headline & Metadata */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-white bg-white/10 px-2 py-0.5 rounded">
            {task.course}
          </span>
          <span className="text-xs text-zinc-400 capitalize">
            {task.category}
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-xs text-zinc-400 font-mono">
            {task.estimatedHours}h estimated
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug">
          {task.title}
        </h2>

        {task.notes && (
          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
            {task.notes}
          </p>
        )}
      </div>

      {/* Plain Language Rationale */}
      <p className="text-sm text-zinc-300 leading-relaxed bg-white/[0.03] border border-white/5 p-3 rounded-lg">
        {explanation}
      </p>

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

      {/* Timer & Primary Actions */}
      <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-white/10">
        {/* Left: Stopwatch Timer Controls */}
        <div className="flex items-center space-x-3">
          {timerActive ? (
            <div className="flex items-center space-x-3">
              <span className="font-mono text-xl sm:text-2xl font-bold text-white tracking-wider">
                {stopwatch.formattedTime}
              </span>

              {stopwatch.status === 'running' ? (
                <button
                  type="button"
                  onClick={stopwatch.pause}
                  className="px-3 py-1.5 rounded-md border border-white/20 hover:border-white/40 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopwatch.resume}
                  className="px-3 py-1.5 rounded-md bg-orange-500 text-black text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume</span>
                </button>
              )}

              <button
                type="button"
                onClick={stopwatch.stop}
                className="px-3 py-1.5 rounded-md border border-red-500/30 hover:border-red-500/60 text-red-400 text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Square className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            </div>
          ) : timerStopped ? (
            <div className="flex items-center space-x-3">
              <span className="font-mono text-sm text-zinc-300">
                Logged: {stopwatch.formattedTime}
              </span>
              {!stopwatch.isSaved ? (
                <button
                  type="button"
                  onClick={stopwatch.saveSession}
                  className="px-3 py-1.5 rounded-md bg-emerald-500 text-black text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
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
                className="px-3 py-1.5 rounded-md border border-white/20 text-zinc-300 text-xs hover:text-white transition-colors cursor-pointer"
              >
                Restart
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStartTimer}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-semibold text-sm transition-colors shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start (10 min kickoff)</span>
            </button>
          )}
        </div>

        {/* Right: Secondary Actions */}
        <div className="flex items-center space-x-3 text-xs">
          {/* Mark Complete */}
          <button
            type="button"
            onClick={() => onToggleComplete(task.id)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-md border border-white/15 hover:border-emerald-500/50 text-zinc-300 hover:text-emerald-400 transition-colors cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Mark done</span>
          </button>

          {/* Quiet "Not today" */}
          <button
            type="button"
            onClick={() => onNotToday(task)}
            className="text-zinc-400 hover:text-white underline underline-offset-4 transition-colors cursor-pointer"
            title="Move this task to tomorrow so you can focus on something else"
          >
            Not today
          </button>
        </div>
      </div>

      {/* Overdue Recovery Guidance (if overdue) */}
      {urgency.isOverdue && (
        <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-amber-300">
            This deadline has passed. Take a recovery step to clear mental pressure:
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

      {/* Note when older catch-up items exist (Phase 3 integration) */}
      {catchUpCount > 0 && onOpenCatchUp && (
        <div className="pt-2 text-xs text-zinc-400 flex items-center justify-between border-t border-white/5">
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
  );
};
