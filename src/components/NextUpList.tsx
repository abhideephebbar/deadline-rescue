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
    <div className="space-y-2.5 font-sans">
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
              className="group rounded-lg border border-white/10 bg-zinc-950/40 hover:bg-zinc-900/60 p-3 sm:px-4 sm:py-3 flex items-center justify-between gap-3 transition-colors"
            >
              {/* Left: Check button & Title */}
              <div className="flex items-center space-x-3 min-w-0">
                <button
                  type="button"
                  onClick={() => onToggleComplete(task.id)}
                  aria-label={`Mark ${task.title} complete`}
                  className="w-5 h-5 rounded border border-white/20 hover:border-emerald-500/80 flex items-center justify-center text-transparent hover:text-emerald-400 transition-colors shrink-0 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>

                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-zinc-300 bg-white/5 border border-white/10 px-1.5 py-0.2 rounded whitespace-nowrap shrink-0">
                      {task.course}
                    </span>
                    <span className="text-sm font-medium text-white truncate">
                      {task.title}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Due Time & Start Button */}
              <div className="flex items-center space-x-3 shrink-0 text-xs">
                <span className="text-zinc-400 hidden sm:inline font-mono text-[11px]">
                  {urgency.relativeTime}
                </span>

                <span className="text-[11px] text-zinc-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded capitalize">
                  {task.estimatedHours}h
                </span>

                <button
                  type="button"
                  onClick={() => onStartTask(task)}
                  aria-label={`Start ${task.title}`}
                  className="p-1.5 rounded border border-white/10 hover:border-orange-500/50 hover:bg-orange-500/10 text-zinc-300 hover:text-orange-400 transition-colors cursor-pointer"
                  title="Start working on this task"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              </div>
            </m.div>
          ))}
        </AnimatePresence>
      </m.div>
    </div>
  );
};
