import React, { useState, useRef, useEffect } from 'react';
import { m, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Sliders,
  FileText,
  RotateCcw,
  Compass,
  Database,
  Trash2,
  Plus,
  MoreHorizontal,
  Flame,
  Check,
} from 'lucide-react';

export type ActiveTab = 'today' | 'week' | 'tasks';

interface FloatingNavProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenAsk: () => void;
  onOpenCapacity: () => void;
  onOpenImport: () => void;
  onOpenResetWeek: () => void;
  onTakeTour: () => void;
  onLoadDemoData: () => void;
  onClearEverything: () => void;
  reduceEffects: boolean;
  onToggleReduceEffects: () => void;
  onOpenAddTask: () => void;
}

export const FloatingNav: React.FC<FloatingNavProps> = ({
  activeTab,
  onTabChange,
  onOpenAsk,
  onOpenCapacity,
  onOpenImport,
  onOpenResetWeek,
  onTakeTour,
  onLoadDemoData,
  onClearEverything,
  reduceEffects,
  onToggleReduceEffects,
  onOpenAddTask,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isMenuOpen]);

  const tabs: Array<{ id: ActiveTab; label: string }> = [
    { id: 'today', label: 'Today' },
    { id: 'week', label: 'Week' },
    { id: 'tasks', label: 'Tasks' },
  ];

  return (
    <>
      {/* Top Header Row (Logo Left, Floating Glass Pill Right) */}
      <header className="sticky top-0 z-30 pt-4 pb-2 px-5 sm:px-6 pointer-events-none">
        <div className="max-w-5xl mx-auto flex items-center justify-between pointer-events-auto">
          {/* Logo Left */}
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Flame className="w-5 h-5 text-black" />
            </div>
            <span className="font-['Bebas_Neue'] text-2xl sm:text-3xl tracking-wider text-white select-none">
              DEADLINE RESCUE
            </span>
          </div>

          {/* Desktop Floating Glass Pill Nav */}
          <div className="hidden sm:flex items-center space-x-2">
            <nav
              aria-label="Main Navigation"
              className="bg-[rgba(12,12,16,0.65)] backdrop-blur-[20px] backdrop-saturate-[140%] border border-white/[0.12] rounded-full p-1.5 flex items-center space-x-1 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]"
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => onTabChange(tab.id)}
                    className={`relative px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer select-none ${
                      isActive ? 'text-black font-semibold' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <m.div
                        layoutId="activeNavIndicator"
                        className="absolute inset-0 bg-white rounded-full shadow-md -z-10"
                        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                      />
                    )}
                    <span>{tab.label}</span>
                  </button>
                );
              })}

              <div className="h-4 w-px bg-white/10 mx-1" />

              {/* Ask Pill Button */}
              <button
                type="button"
                onClick={onOpenAsk}
                title="Ask Rescue Assistant"
                className="p-1.5 rounded-full text-orange-400 hover:text-orange-300 hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center"
              >
                <Sparkles className="w-4 h-4" />
              </button>

              {/* Settings Dropdown Trigger */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  aria-label="Settings and actions"
                  aria-expanded={isMenuOpen}
                  className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer flex items-center justify-center"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>

                {/* Settings Glass Dropdown */}
                <AnimatePresence>
                  {isMenuOpen && (
                    <m.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute right-0 top-full mt-2 w-56 rounded-2xl p-1.5 bg-[rgba(14,14,18,0.92)] backdrop-blur-[24px] border border-white/[0.14] shadow-2xl z-50 text-xs font-medium text-zinc-300"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenCapacity();
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                      >
                        <Sliders className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span>Study capacity</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenImport();
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span>Paste deadlines</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenResetWeek();
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span>Reset my week</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onTakeTour();
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                      >
                        <Compass className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span>Take a tour</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onToggleReduceEffects();
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center space-x-2.5">
                          <Sparkles className="w-4 h-4 text-zinc-400 shrink-0" />
                          <span>Reduce effects</span>
                        </div>
                        {reduceEffects && <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onLoadDemoData();
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors cursor-pointer"
                      >
                        <Database className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span>Load demo tasks</span>
                      </button>

                      <div className="my-1 border-t border-white/10" />

                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onClearEverything();
                        }}
                        className="w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-red-500/20 text-red-400 hover:text-red-300 text-left transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 shrink-0" />
                        <span>Clear all data</span>
                      </button>
                    </m.div>
                  )}
                </AnimatePresence>
              </div>
            </nav>

            {/* Primary Add Task Button */}
            <button
              type="button"
              onClick={onOpenAddTask}
              className="px-3.5 py-2 rounded-full bg-orange-500 hover:bg-orange-400 text-black text-xs font-semibold shadow-lg shadow-orange-500/20 transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add task</span>
            </button>
          </div>

          {/* Mobile Right Quick Controls */}
          <div className="sm:hidden flex items-center space-x-2">
            <button
              type="button"
              onClick={onOpenAsk}
              title="Ask Rescue Assistant"
              className="p-2 rounded-full bg-[rgba(12,12,16,0.65)] backdrop-blur-[20px] border border-white/[0.12] text-orange-400"
            >
              <Sparkles className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onOpenAddTask}
              className="p-2 rounded-full bg-orange-500 text-black font-semibold shadow-md"
            >
              <Plus className="w-4 h-4" />
            </button>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-2 rounded-full bg-[rgba(12,12,16,0.65)] backdrop-blur-[20px] border border-white/[0.12] text-zinc-300"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {/* Mobile Settings Glass Dropdown */}
              <AnimatePresence>
                {isMenuOpen && (
                  <m.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute right-0 top-full mt-2 w-52 rounded-2xl p-1.5 bg-[rgba(14,14,18,0.95)] backdrop-blur-[24px] border border-white/[0.14] shadow-2xl z-50 text-xs font-medium text-zinc-300"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenCapacity();
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors"
                    >
                      <Sliders className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span>Study capacity</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenImport();
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors"
                    >
                      <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span>Paste deadlines</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenResetWeek();
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors"
                    >
                      <RotateCcw className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span>Reset week</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onTakeTour();
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors"
                    >
                      <Compass className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span>Take tour</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleReduceEffects()}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Sparkles className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span>Reduce effects</span>
                      </div>
                      {reduceEffects && <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onLoadDemoData();
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-white/10 text-left transition-colors"
                    >
                      <Database className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span>Demo tasks</span>
                    </button>

                    <div className="my-1 border-t border-white/10" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onClearEverything();
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl hover:bg-red-500/20 text-red-400 text-left transition-colors"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" />
                      <span>Clear all data</span>
                    </button>
                  </m.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Floating Bottom Navigation Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] flex justify-center pointer-events-none">
        <nav
          aria-label="Mobile Navigation"
          className="pointer-events-auto bg-[rgba(12,12,16,0.85)] backdrop-blur-[24px] backdrop-saturate-[140%] border border-white/[0.14] rounded-full p-1.5 flex items-center space-x-1 shadow-[0_8px_32px_0_rgba(0,0,0,0.45)]"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`relative px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer select-none ${
                  isActive ? 'text-black font-semibold' : 'text-zinc-400 hover:text-white'
                }`}
              >
                {isActive && (
                  <m.div
                    layoutId="activeNavIndicatorMobile"
                    className="absolute inset-0 bg-white rounded-full shadow-md -z-10"
                    transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                  />
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </>
  );
};
