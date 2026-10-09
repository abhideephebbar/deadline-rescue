import React, { useState, useEffect } from 'react';
import { Flame, Plus, RotateCcw, Clock } from 'lucide-react';

interface HeaderProps {
  onOpenAddTask: () => void;
  onResetSamples: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddTask,
  onResetSamples,
}) => {
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3.5">
            <div className="relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-900 border border-brand-400/30 shadow-lg shadow-brand-500/20">
              <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-amber-300 animate-pulse" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-zinc-950" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  Deadline Rescue
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-brand-500/10 text-brand-300 border border-brand-500/20">
                  College Edition
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-medium hidden sm:block">
                Intelligent triage for upcoming assignments, labs & exams
              </p>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Live Clock Pill */}
            <div className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 font-mono">
              <Clock className="w-3.5 h-3.5 text-zinc-400" />
              <span>{currentTime || 'Loading...'}</span>
            </div>

            {/* Reset Samples Button */}
            <button
              onClick={onResetSamples}
              title="Reset to sample college tasks"
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-700 text-xs sm:text-sm font-medium transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Reset Samples</span>
            </button>

            {/* Add Task Button */}
            <button
              onClick={onOpenAddTask}
              className="inline-flex items-center space-x-1.5 px-3.5 sm:px-4 py-2 rounded-lg bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm shadow-md shadow-brand-600/30 border border-brand-400/30 transition-all transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
