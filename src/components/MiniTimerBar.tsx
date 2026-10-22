import React from 'react';
import { Play, Pause, Square } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { Task, StopwatchState } from '../types';

interface MiniTimerBarProps {
  activeTask: Task | null;
  status: StopwatchState;
  formattedTime: string;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onScrollToNow?: () => void;
}

export const MiniTimerBar: React.FC<MiniTimerBarProps> = ({
  activeTask,
  status,
  formattedTime,
  onPause,
  onResume,
  onStop,
  onScrollToNow,
}) => {
  const isVisible = status === 'running' || status === 'paused';
  const isRunning = status === 'running';

  return (
    <AnimatePresence>
      {isVisible && (
        <m.aside
          key="mini-timer-bar"
          initial={{ y: 50, opacity: 0, x: '-50%' }}
          animate={{ y: 0, opacity: 1, x: '-50%' }}
          exit={{ y: 50, opacity: 0, x: '-50%' }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          aria-label="Active focus timer"
          className="fixed bottom-4 left-1/2 z-40 w-[calc(100%-2rem)] max-w-md rounded-full border border-orange-500/40 bg-[#141414]/95 backdrop-blur-md px-4 py-2.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] flex items-center justify-between font-sans text-xs"
        >
          {/* Left: Task Info & Jump */}
          <button
            type="button"
            onClick={onScrollToNow}
            className="flex items-center space-x-2.5 min-w-0 text-left hover:opacity-80 transition-opacity cursor-pointer group"
            title="Scroll to current task"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              {isRunning && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
              )}
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
            </span>

            <div className="truncate">
              <span className="font-semibold text-white truncate block">
                {activeTask ? activeTask.title : 'Focus Session'}
              </span>
              {activeTask?.course && (
                <span className="text-[10px] text-zinc-400 block -mt-0.5">
                  {activeTask.course}
                </span>
              )}
            </div>
          </button>

          {/* Right: Elapsed Time & Controls */}
          <div className="flex items-center space-x-2.5 shrink-0 pl-2">
            <span className="font-mono text-sm font-bold text-white tracking-wider">
              {formattedTime}
            </span>

            {isRunning ? (
              <button
                type="button"
                onClick={onPause}
                aria-label="Pause timer"
                className="p-1.5 rounded-full border border-white/20 hover:border-white/40 text-white transition-colors cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onResume}
                aria-label="Resume timer"
                className="p-1.5 rounded-full bg-orange-500 text-black hover:bg-orange-400 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
              </button>
            )}

            <button
              type="button"
              onClick={onStop}
              aria-label="Stop timer"
              className="p-1.5 rounded-full border border-red-500/30 hover:border-red-500/60 text-red-400 transition-colors cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
            </button>
          </div>
        </m.aside>
      )}
    </AnimatePresence>
  );
};
