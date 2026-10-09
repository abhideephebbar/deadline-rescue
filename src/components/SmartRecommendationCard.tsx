import React, { useState } from 'react';
import { 
  Sparkles, 
  Clock, 
  Hourglass, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Zap,
  Info
} from 'lucide-react';
import { Task } from '../types';
import { getSmartRecommendations } from '../utils/ranking';

interface SmartRecommendationCardProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
}

export const SmartRecommendationCard: React.FC<SmartRecommendationCardProps> = ({
  tasks,
  onToggleComplete,
}) => {
  const [showFullQueue, setShowFullQueue] = useState(false);
  const { topRecommendation, rankedQueue } = getSmartRecommendations(tasks);

  // If no incomplete tasks
  if (!topRecommendation) {
    const hasAnyTasks = tasks.length > 0;
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900/90 to-zinc-950 border border-zinc-800 p-6 sm:p-8 text-center shadow-xl">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          {hasAnyTasks ? 'All Caught Up! Zero Imminent Threats' : 'No Tasks Yet'}
        </h3>
        <p className="text-sm text-zinc-400 max-w-md mx-auto">
          {hasAnyTasks
            ? 'You have completed all active assignments and labs. Relax or add upcoming coursework to stay ahead of the curve.'
            : 'Add your courses and assignment deadlines to let our Smart Recommendation Engine triage your study schedule.'}
        </p>
      </div>
    );
  }

  const { task, headline, explanation, keyFactors, urgency, actionAdvice, score } = topRecommendation;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/95 to-zinc-950 border border-brand-500/30 p-5 sm:p-7 shadow-2xl shadow-brand-950/40">
      {/* Background glow effects */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Banner Header */}
      <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-zinc-800/80">
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500/20 text-brand-300 border border-brand-500/30">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-300">
                AI Smart Recommendation
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-500/15 text-brand-300 font-mono font-medium border border-brand-500/20">
                Score: {score}
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {headline}
            </h2>
          </div>
        </div>

        {/* Action Button: Complete right from hero card */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onToggleComplete(task.id)}
            className="w-full sm:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-emerald-950/40 transform active:scale-95"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark Completed</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative pt-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Task Headline & Reasoning */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-zinc-800 text-zinc-200 border border-zinc-700/80">
                {task.course || 'GENERAL'}
              </span>
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${urgency.badgeClass}`}>
                {urgency.label}
              </span>
              <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-800/80 text-zinc-300 border border-zinc-700/50 uppercase">
                {task.category}
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-snug">
              {task.title}
            </h3>

            {task.notes && (
              <p className="mt-2 text-xs sm:text-sm text-zinc-400 line-clamp-2">
                {task.notes}
              </p>
            )}
          </div>

          {/* AI Explanation Box (Fulfills Feature #4) */}
          <div className="p-4 rounded-xl bg-brand-950/30 border border-brand-500/20 text-zinc-200">
            <div className="flex items-start space-x-2.5">
              <Info className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <p className="text-xs sm:text-sm leading-relaxed text-zinc-200 font-medium">
                  <span className="text-brand-300 font-semibold">Why this task first: </span>
                  {explanation}
                </p>
                <p className="text-xs text-zinc-400 italic">
                  💡 Strategy: {actionAdvice}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Triage Metrics Grid */}
        <div className="flex flex-col justify-between space-y-3 bg-zinc-950/60 p-4 sm:p-5 rounded-xl border border-zinc-800/80">
          <div className="space-y-3">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
              Triage Diagnostics
            </span>

            <div className="flex items-center justify-between text-xs sm:text-sm border-b border-zinc-800/80 pb-2">
              <span className="text-zinc-400 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>Deadline:</span>
              </span>
              <span className={`font-semibold ${urgency.isOverdue ? 'text-rose-400' : 'text-zinc-200'}`}>
                {urgency.relativeTime}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm border-b border-zinc-800/80 pb-2">
              <span className="text-zinc-400 flex items-center space-x-1.5">
                <Hourglass className="w-3.5 h-3.5 text-zinc-500" />
                <span>Estimated Effort:</span>
              </span>
              <span className="font-semibold text-zinc-200">
                {task.estimatedHours} hour{task.estimatedHours === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm border-b border-zinc-800/80 pb-2">
              <span className="text-zinc-400 flex items-center space-x-1.5">
                <Zap className="w-3.5 h-3.5 text-zinc-500" />
                <span>Safety Buffer:</span>
              </span>
              <span className={`font-semibold ${
                urgency.hasTimeDeficit || urgency.isOverdue 
                  ? 'text-rose-400' 
                  : urgency.bufferHours <= 4 
                    ? 'text-amber-400' 
                    : 'text-emerald-400'
              }`}>
                {urgency.isOverdue 
                  ? '0h (Late)' 
                  : `${urgency.bufferHours.toFixed(1)} hrs left`}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-zinc-400 flex items-center space-x-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-zinc-500" />
                <span>Priority Level:</span>
              </span>
              <span className="font-semibold uppercase tracking-wide text-brand-300">
                {task.priority}
              </span>
            </div>
          </div>

          {/* Key Factor Badges */}
          <div className="pt-2">
            <div className="text-[11px] text-zinc-400 font-medium mb-1.5">Key Factors:</div>
            <div className="flex flex-wrap gap-1">
              {keyFactors.map((factor, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300"
                >
                  {factor}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Priority Queue (Showing #2, #3, etc.) */}
      {rankedQueue.length > 1 && (
        <div className="mt-6 pt-4 border-t border-zinc-800/80">
          <button
            onClick={() => setShowFullQueue(!showFullQueue)}
            className="w-full flex items-center justify-between text-xs sm:text-sm text-zinc-400 hover:text-zinc-200 transition-colors py-1"
          >
            <span className="flex items-center space-x-2 font-medium">
              <span>View Full Priority Queue</span>
              <span className="px-2 py-0.2 bg-zinc-800 text-zinc-300 rounded-full text-xs">
                {rankedQueue.length} tasks ranked
              </span>
            </span>
            {showFullQueue ? (
              <ChevronUp className="w-4 h-4 text-zinc-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            )}
          </button>

          {showFullQueue && (
            <div className="mt-3 space-y-2 pt-2">
              <p className="text-xs text-zinc-400 mb-2">
                Order in which you should tackle your remaining tasks based on deadline urgency, effort, and priority:
              </p>
              <div className="divide-y divide-zinc-800/60 rounded-xl bg-zinc-950/40 border border-zinc-800/80 overflow-hidden">
                {rankedQueue.map((item, idx) => (
                  <div
                    key={item.task.id}
                    className="p-3 flex items-center justify-between hover:bg-zinc-900/40 transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 
                          ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30' 
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-semibold text-zinc-300 truncate">
                            {item.task.title}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                            {item.task.course}
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-400 flex items-center space-x-2 mt-0.5">
                          <span>{item.urgency.relativeTime}</span>
                          <span>•</span>
                          <span>{item.task.estimatedHours}h effort</span>
                          <span>•</span>
                          <span className="uppercase text-brand-400/80">{item.task.priority}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={() => onToggleComplete(item.task.id)}
                        title="Mark Done"
                        className="p-1.5 rounded-lg bg-zinc-800 hover:bg-emerald-600/20 hover:text-emerald-300 text-zinc-400 transition-colors"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
