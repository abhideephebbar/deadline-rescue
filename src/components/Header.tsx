import React, { useState, useEffect } from 'react';
import { RotateCcw, Plus, Radio } from 'lucide-react';
import { SplitFlapMuteToggle } from './SplitFlapText';
import { ScrambleTextOnHover } from './ScrambleText';
import { BitmapChevron } from './BitmapChevron';

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
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0c0c0c]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left Brand Telemetry */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
              </span>
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-white font-semibold">
                DEADLINE // RESCUE
              </span>
            </div>
            <span className="hidden lg:inline-block font-mono text-[10px] text-zinc-500 tracking-widest border-l border-white/10 pl-3">
              ACADEMIC TRIAGE PROTOCOL v.02
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Split Flap Sound Mute */}
            <div className="hidden sm:flex items-center border border-white/10 px-2.5 py-1 bg-black/40">
              <SplitFlapMuteToggle />
            </div>

            {/* Telemetry Clock */}
            <div className="hidden md:flex items-center space-x-1.5 font-mono text-xs text-zinc-400 border border-white/10 px-2.5 py-1 bg-black/40">
              <Radio className="w-3 h-3 text-orange-500" />
              <span>UTC {currentTime || '--:--:--'}</span>
            </div>

            {/* Reset Samples */}
            <button
              onClick={onResetSamples}
              type="button"
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 border border-white/10 hover:border-white/30 text-zinc-400 hover:text-white font-mono text-[11px] uppercase tracking-wider transition-colors bg-black/20"
              title="Reset sample college tasks"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            {/* Add Task Primary Action */}
            <button
              onClick={onOpenAddTask}
              type="button"
              className="group inline-flex items-center space-x-2 border border-orange-500 bg-orange-500 text-black hover:bg-orange-400 font-mono text-xs uppercase tracking-widest px-3.5 py-1.5 font-semibold transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <ScrambleTextOnHover text="New Task" as="span" duration={0.3} />
              <BitmapChevron className="transition-transform duration-200 group-hover:rotate-45" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
