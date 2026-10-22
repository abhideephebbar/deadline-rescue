import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Clock, 
  Hourglass, 
  Zap, 
  AlertOctagon,
  Target
} from 'lucide-react';
import { Task } from '../types';
import { getSmartRecommendations } from '../utils/ranking';
import { ScrambleTextOnHover } from './ScrambleText';
import { BitmapChevron } from './BitmapChevron';

interface SmartRecommendationCardProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  now?: Date;
}

export const SmartRecommendationCard: React.FC<SmartRecommendationCardProps> = ({
  tasks,
  onToggleComplete,
  now = new Date(),
}) => {
  const [showFullQueue, setShowFullQueue] = useState(false);
  const { topRecommendation, rankedQueue } = getSmartRecommendations(tasks, now);

  // If no incomplete tasks
  if (!topRecommendation) {
    const hasAnyTasks = tasks.length > 0;
    return (
      <div id="section-triage" className="relative border border-white/10 bg-zinc-950/80 p-8 sm:p-12 text-center">
        <div className="max-w-md mx-auto space-y-3">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-emerald-400 block">
            SIGNAL // CLEAR
          </span>
          <h3 className="font-display text-4xl sm:text-5xl tracking-tight text-white uppercase">
            {hasAnyTasks ? 'All Deadlines Cleared' : 'Radar Empty'}
          </h3>
          <p className="font-mono text-xs text-zinc-400 leading-relaxed">
            {hasAnyTasks
              ? 'Zero imminent threats detected in current cycle. You have completed all active assignments and labs.'
              : 'Initialize your coursework radar by adding upcoming assignments or loading demo telemetry.'}
          </p>
        </div>
      </div>
    );
  }

  const { task, headline, explanation, keyFactors, urgency, actionAdvice, score } = topRecommendation;

  return (
    <div id="section-triage" className="relative border border-orange-500/40 bg-zinc-950 p-6 sm:p-8 transition-all shadow-[0_0_30px_rgba(249,115,22,0.07)]">
      {/* Top Banner Tag Line */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/10 gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-2.5 h-2.5 bg-orange-500 rounded-none animate-pulse" />
          <span className="font-mono text-[10px] sm:text-xs uppercase tracking-[0.25em] text-orange-400 font-semibold">
            01 // IMMEDIATE ACTION TARGET
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500 border border-white/10 px-2 py-0.5">
            RANK SCORE: {score}
          </span>
        </div>

        {/* Mark Done Direct Action */}
        <button
          onClick={() => onToggleComplete(task.id)}
          type="button"
          className="group inline-flex items-center space-x-2 border border-emerald-500/80 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black font-mono text-xs uppercase tracking-widest px-4 py-2 transition-all cursor-pointer"
        >
          <Check className="w-4 h-4 stroke-[2.5]" />
          <ScrambleTextOnHover text="Resolve & Mark Done" as="span" duration={0.3} />
          <BitmapChevron className="transition-transform duration-200 group-hover:rotate-45" />
        </button>
      </div>

      {/* Main Grid: Headline & Analysis */}
      <div className="pt-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recommended Task Headline */}
        <div className="lg:col-span-2 space-y-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-wider">
              <span className="px-2 py-0.5 border border-white/20 bg-white/5 text-white font-bold">
                {task.course || 'COURSEWORK'}
              </span>
              <span className={`px-2 py-0.5 border font-semibold ${
                urgency.isOverdue 
                  ? 'border-red-500 text-red-400 bg-red-500/10'
                  : urgency.hasTimeDeficit 
                    ? 'border-red-500 text-red-400 bg-red-500/10'
                    : 'border-orange-500 text-orange-400 bg-orange-500/10'
              }`}>
                {urgency.label}
              </span>
              <span className="px-2 py-0.5 border border-white/10 text-zinc-400">
                {task.category}
              </span>
            </div>

            <h3 className="font-display text-3xl sm:text-5xl text-white tracking-tight uppercase leading-none pt-1">
              {task.title}
            </h3>

            {task.notes && (
              <p className="font-mono text-xs text-zinc-400 leading-relaxed pt-1">
                // {task.notes}
              </p>
            )}
          </div>

          {/* Strategic Rationale Box */}
          <div className="border border-white/10 bg-black/40 p-5 space-y-3">
            <div className="flex items-center space-x-2 font-mono text-[10px] uppercase tracking-[0.2em] text-orange-400">
              <Target className="w-3.5 h-3.5" />
              <span>TRIAGE RATIONALE // {headline}</span>
            </div>

            <p className="font-mono text-xs sm:text-sm text-zinc-300 leading-relaxed">
              <span className="text-white font-semibold">Why this task first: </span>
              {explanation}
            </p>

            <div className="pt-2 border-t border-white/5 font-mono text-xs text-orange-300/90 flex items-center space-x-2">
              <span className="text-zinc-500">TACTIC:</span>
              <span>{actionAdvice}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Telemetry Specs */}
        <div className="border border-white/10 bg-zinc-950 p-5 flex flex-col justify-between space-y-4 font-mono">
          <div className="space-y-3">
            <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500 block border-b border-white/10 pb-2">
              DIAGNOSTIC MATRIX
            </span>

            <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>DEADLINE:</span>
              </span>
              <span className={`font-semibold ${urgency.isOverdue ? 'text-red-400' : 'text-orange-400'}`}>
                {urgency.relativeTime}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <Hourglass className="w-3.5 h-3.5" />
                <span>EST. EFFORT:</span>
              </span>
              <span className="text-white font-medium">
                {task.estimatedHours} HOUR{task.estimatedHours === 1 ? '' : 'S'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1 border-b border-white/5">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>SAFETY BUFFER:</span>
              </span>
              <span className={`font-semibold ${
                urgency.hasTimeDeficit || urgency.isOverdue 
                  ? 'text-red-400' 
                  : urgency.bufferHours <= 4 
                    ? 'text-orange-400' 
                    : 'text-emerald-400'
              }`}>
                {urgency.isOverdue 
                  ? '0H (OVERDUE)' 
                  : `${urgency.bufferHours > 0 ? '+' : ''}${urgency.bufferHours.toFixed(1)}H`}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-zinc-500 flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>PRIORITY:</span>
              </span>
              <span className="text-white font-bold uppercase tracking-wider">
                {task.priority}
              </span>
            </div>
          </div>

          {/* Key Factor Badges */}
          <div className="pt-3 border-t border-white/10 space-y-1.5">
            <span className="text-[9px] uppercase tracking-widest text-zinc-600 block">FACTORS IDENTIFIED:</span>
            <div className="flex flex-wrap gap-1">
              {keyFactors.map((factor, idx) => (
                <span
                  key={idx}
                  className="text-[9px] px-2 py-0.5 border border-white/10 text-zinc-400 bg-black/40"
                >
                  {factor}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Expandable Priority Backlog */}
      {rankedQueue.length > 1 && (
        <div className="mt-8 pt-4 border-t border-white/10">
          <button
            onClick={() => setShowFullQueue(!showFullQueue)}
            type="button"
            className="w-full flex items-center justify-between font-mono text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-colors py-1 cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <span>EXPAND COMPLETE PRIORITY QUEUE</span>
              <span className="text-orange-400">[{rankedQueue.length} ITEMS RANKED]</span>
            </span>
            {showFullQueue ? (
              <ChevronUp className="w-4 h-4 text-orange-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-orange-400" />
            )}
          </button>

          {showFullQueue && (
            <div className="mt-4 space-y-2">
              <div className="divide-y divide-white/5 border border-white/10 bg-black/30">
                {rankedQueue.map((item, idx) => (
                  <div
                    key={item.task.id}
                    className="p-3 sm:p-4 flex items-center justify-between hover:bg-zinc-900/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 sm:space-x-4 min-w-0">
                      <span className="font-mono text-xs font-bold text-orange-400 shrink-0">
                        [{idx < 9 ? `0${idx + 1}` : idx + 1}]
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold text-white truncate uppercase">
                            {item.task.title}
                          </span>
                          <span className="font-mono text-[10px] px-1.5 py-0.2 border border-white/10 text-zinc-400">
                            {item.task.course}
                          </span>
                        </div>
                        <div className="font-mono text-[11px] text-zinc-500 flex items-center space-x-2 mt-0.5">
                          <span className="text-orange-400/80">{item.urgency.relativeTime}</span>
                          <span>•</span>
                          <span>{item.task.estimatedHours}h effort</span>
                          <span>•</span>
                          <span className="uppercase text-zinc-400">{item.task.priority}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onToggleComplete(item.task.id)}
                      title="Resolve Task"
                      type="button"
                      className="p-2 border border-white/10 hover:border-emerald-500 hover:text-emerald-400 text-zinc-400 transition-colors bg-zinc-900"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
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
