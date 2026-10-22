import React from 'react';
import { Play, Check } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { Recommendation, Task } from '../types';

interface NextUpListProps {
  recommendations: Recommendation[];
  onStartTask: (task: Task) => void;
  onToggleComplete: (id: string) => void;
}

export const NextUpList: React.FC<NextUpListProps> = ({
  recommendations,
  onStartTask,
  onToggleComplete,
}) => {
  if (recommendations.length === 0) return null;

  return (
    <div className="space-y-3 font-sans">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider px-1">
        Next up
      </h3>

      <m.div layout className="space-y-2">
        <AnimatePresence initial={false}>
          {recommendations.map(({ task, urgency }) => (
            <m.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="group min-h-[56px] rounded-xl border border-white/[0.08] bg-surface hover:bg-raised px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors shadow-sm"
            >
              {/* Left: Check button */}
              <div className="flex items-center space-x-3 min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onToggleComplete(task.id)}
                  aria-label={`Mark ${task.title} complete`}
                  className="w-8 h-8 sm:w-7 sm:h-7 rounded-lg border border-white/20 hover:border-emerald-500/80 flex items-center justify-center text-transparent hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                </button>

                {/* 2-Line Task Details */}
                <div className="min-w-0 flex-1 space-y-0.5">
                  {/* Line 1: Title with ellipsis */}
                  <div className="text-sm font-medium text-white truncate">
                    {task.title}
                  </div>

                  {/* Line 2: Course chip, Due time, Hours in muted text */}
                  <div className="flex items-center space-x-2 text-xs text-muted">
                    <span className="text-[11px] font-semibold text-zinc-300 bg-white/5 border border-white/10 px-1.5 py-0.2 rounded whitespace-nowrap shrink-0">
                      {task.course}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-xs text-zinc-400">
                      {urgency.relativeTime}
                    </span>
                    <span>•</span>
                    <span className="text-xs text-zinc-400">
                      {task.estimatedHours}h
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Small Play button */}
              <div className="shrink-0 pl-1">
                <button
                  type="button"
                  onClick={() => onStartTask(task)}
                  aria-label={`Start ${task.title}`}
                  className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg border border-white/10 hover:border-orange-500/50 hover:bg-orange-500/10 text-zinc-400 hover:text-orange-400 flex items-center justify-center transition-colors cursor-pointer"
                  title="Start working on this task"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                </button>
              </div>
            </m.div>
          ))}
        </AnimatePresence>
      </m.div>
    </div>
  );
};
