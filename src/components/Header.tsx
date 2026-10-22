import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Sparkles, 
  MoreHorizontal, 
  Sliders, 
  FileText, 
  RotateCcw, 
  Compass, 
  Database, 
  Trash2 
} from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';

interface HeaderProps {
  onOpenAddTask: () => void;
  onOpenAsk?: () => void;
  onOpenCapacity: () => void;
  onOpenImport: () => void;
  onOpenResetWeek: () => void;
  onTakeTour?: () => void;
  onLoadDemoData: () => void;
  onClearEverything: () => void;
  weeklyCapacityHours?: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAddTask,
  onOpenAsk,
  onOpenCapacity,
  onOpenImport,
  onOpenResetWeek,
  onTakeTour,
  onLoadDemoData,
  onClearEverything,
  weeklyCapacityHours,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="max-w-3xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
        {/* App Title */}
        <div className="flex items-center space-x-2.5">
          <span className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]" />
          <h1 className="text-base font-semibold tracking-tight text-white">
            Deadline Rescue
          </h1>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* Ask Button */}
          <button
            id="tour-ask-button"
            onClick={onOpenAsk}
            type="button"
            aria-label="Ask about schedule"
            className="inline-flex items-center justify-center space-x-1.5 px-3 py-1.5 min-h-[38px] sm:min-h-[36px] rounded-lg border border-white/10 hover:border-white/25 text-zinc-300 hover:text-white text-xs font-medium transition-colors bg-white/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            title="Ask anything about your tasks and schedule"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span className="hidden sm:inline">Ask</span>
          </button>

          {/* Add Task Primary Action */}
          <button
            id="tour-add-task"
            onClick={onOpenAddTask}
            type="button"
            aria-label="Add new task"
            className="inline-flex items-center justify-center space-x-1 px-3.5 py-1.5 min-h-[38px] sm:min-h-[36px] rounded-lg bg-orange-500 hover:bg-orange-400 text-black text-xs font-semibold tracking-wide transition-colors shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Add task</span>
          </button>

          {/* Overflow "..." Menu */}
          <div className="relative" ref={menuRef}>
            <button
              id="tour-menu-button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              type="button"
              aria-label="More options"
              aria-expanded={isMenuOpen}
              aria-haspopup="true"
              className="p-2 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-white/10 hover:border-white/25 text-zinc-300 hover:text-white transition-colors bg-white/5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            <AnimatePresence>
              {isMenuOpen && (
                <m.div
                  role="menu"
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 mt-2 w-56 rounded-md bg-[#161616] border border-white/15 shadow-xl py-1 z-50 text-xs font-sans origin-top-right"
                >
                <button
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenCapacity();
                  }}
                  className="w-full text-left px-3.5 py-2 text-zinc-300 hover:text-white hover:bg-white/10 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center space-x-2">
                    <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Study capacity</span>
                  </span>
                  {weeklyCapacityHours !== undefined && (
                    <span className="text-[11px] text-zinc-500 font-mono">{weeklyCapacityHours}h/wk</span>
                  )}
                </button>

                <button
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenImport();
                  }}
                  className="w-full text-left px-3.5 py-2 text-zinc-300 hover:text-white hover:bg-white/10 flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Paste deadlines</span>
                </button>

                <button
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenResetWeek();
                  }}
                  className="w-full text-left px-3.5 py-2 text-zinc-300 hover:text-white hover:bg-white/10 flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reset my week</span>
                </button>

                {onTakeTour && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onTakeTour();
                    }}
                    className="w-full text-left px-3.5 py-2 text-zinc-300 hover:text-white hover:bg-white/10 flex items-center space-x-2 transition-colors cursor-pointer"
                  >
                    <Compass className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Take a tour</span>
                  </button>
                )}

                <div className="my-1 border-t border-white/10" />

                <button
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onLoadDemoData();
                  }}
                  className="w-full text-left px-3.5 py-2 text-zinc-300 hover:text-white hover:bg-white/10 flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Load demo data</span>
                </button>

                <button
                  role="menuitem"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onClearEverything();
                  }}
                  className="w-full text-left px-3.5 py-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center space-x-2 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear everything</span>
                </button>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};
