import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  Square,
  Check,
  ChevronDown,
  Clock,
  Sparkles,
  Mail,
  ArrowRight,
  BookmarkCheck,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { Recommendation, Task, StopwatchState } from '../types';
import { getStarterStep } from '../utils/starterSteps';
import { Collapse } from './ui/Collapse';

interface HeroCarouselProps {
  recommendations: Recommendation[];
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
    selectedTaskId?: string;
    setSelectedTaskId: (id: string) => void;
    isSaved: boolean;
  };
  onComplete: (taskId: string) => void;
  onNotToday: (task: Task) => void;
  onEmailInstructor?: (task: Task) => void;
  catchUpCount?: number;
  onOpenCatchUp?: () => void;
}

export const HeroCarousel: React.FC<HeroCarouselProps> = ({
  recommendations,
  stopwatch,
  onComplete,
  onNotToday,
  onEmailInstructor,
  catchUpCount = 0,
  onOpenCatchUp,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  // Keep active index within bounds if tasks change
  const totalSlides = Math.min(3, recommendations.length);
  const currentIndex = Math.min(activeIndex, Math.max(0, totalSlides - 1));

  // Arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (totalSlides <= 1) return;
      if (e.key === 'ArrowRight') {
        setActiveIndex((prev) => (prev + 1) % totalSlides);
      } else if (e.key === 'ArrowLeft') {
        setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [totalSlides]);

  if (recommendations.length === 0) {
    return null;
  }

  const rec = recommendations[currentIndex] || recommendations[0];
  const { task, explanation, urgency } = rec;
  const starterStep = getStarterStep(task.category, task.title, task.course);

  // Stopwatch state on active task
  const isTimedOnThisTask = stopwatch.selectedTaskId === task.id;
  const timerActive =
    isTimedOnThisTask && (stopwatch.status === 'running' || stopwatch.status === 'paused');
  const timerStopped = isTimedOnThisTask && stopwatch.status === 'stopped';

  const handleStartTimer = () => {
    stopwatch.setSelectedTaskId(task.id);
    stopwatch.start();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return;
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 45 && totalSlides > 1) {
      if (diff > 0) {
        // Swipe left -> next
        setActiveIndex((prev) => (prev + 1) % totalSlides);
      } else {
        // Swipe right -> prev
        setActiveIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
      }
    }
    setTouchStartX(null);
  };

  return (
    <section
      aria-label="Hero carousel"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className="relative rounded-[28px] border border-white/[0.12] bg-[rgba(10,10,14,0.65)] backdrop-blur-[24px] backdrop-saturate-[140%] p-6 sm:p-10 shadow-[0_12px_44px_0_rgba(0,0,0,0.45)] overflow-hidden transition-all duration-300"
    >
      {/* Background Watermark Course Code (clamped to 12 chars + ellipsis) */}
      <div
        aria-hidden="true"
        className="absolute right-4 sm:right-10 top-2 sm:top-4 font-['Bebas_Neue'] text-[90px] sm:text-[180px] text-white/[0.04] select-none pointer-events-none leading-none -z-0 tracking-wider truncate max-w-[85%]"
      >
        {task.course.length > 12 ? `${task.course.slice(0, 12)}…` : task.course}
      </div>

      <AnimatePresence mode="wait">
        <m.div
          key={task.id}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -12 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 space-y-5"
        >
          {/* Top Label & Urgency Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest font-mono">
                {totalSlides > 1 ? `Focus #${currentIndex + 1} of ${totalSlides}` : 'Priority Focus'}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 rounded-full text-xs font-mono font-medium border border-white/10 bg-white/5 text-zinc-300">
                {urgency.relativeTime}
              </span>
            </div>
          </div>

          {/* Huge Condensed Display Title (Bebas Neue) */}
          <h1
            className="font-['Bebas_Neue'] text-white tracking-wide uppercase leading-[0.92] select-text break-words max-w-2xl"
            style={{ fontSize: 'clamp(56px, 11vw, 120px)' }}
          >
            {task.title}
          </h1>

          {/* Meta Row with Icons */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-zinc-300">
            <span className="px-2.5 py-0.5 rounded-md font-semibold text-white bg-white/10 whitespace-nowrap shrink-0 border border-white/10 font-mono">
              {task.course}
            </span>

            <span className="flex items-center space-x-1 text-zinc-400">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-mono">{task.estimatedHours}h estimated</span>
            </span>

            <span className="text-zinc-600">•</span>

            <span className="capitalize text-zinc-400 flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5 text-orange-400" />
              <span>{task.priority}</span>
            </span>

            <span className="text-zinc-600">•</span>

            <span className="capitalize text-zinc-400 flex items-center space-x-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{task.category}</span>
            </span>
          </div>

          {/* Muted 2-Line Grounded Reason with Tooltip */}
          <p
            className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-xl line-clamp-2"
            title={explanation}
          >
            <span className="font-medium text-zinc-300">Why this one:</span> {explanation}
          </p>

          {/* Actions Row */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* White Pill Start / Stopwatch Controls */}
              <AnimatePresence mode="wait">
                {timerActive ? (
                  <m.div
                    key="timer-active"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center space-x-2 bg-white/10 border border-white/20 rounded-full px-3 py-1.5"
                  >
                    <span className="font-mono text-base sm:text-lg font-bold text-white px-2">
                      {stopwatch.formattedTime}
                    </span>

                    {stopwatch.status === 'running' ? (
                      <button
                        type="button"
                        onClick={stopwatch.pause}
                        className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                        title="Pause"
                      >
                        <Pause className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopwatch.resume}
                        className="p-1.5 rounded-full bg-orange-500 hover:bg-orange-400 text-black transition-colors cursor-pointer"
                        title="Resume"
                      >
                        <Play className="w-4 h-4 fill-current" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={stopwatch.stop}
                      className="p-1.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors cursor-pointer"
                      title="Stop"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  </m.div>
                ) : timerStopped ? (
                  <m.div
                    key="timer-stopped"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center space-x-2"
                  >
                    <span className="font-mono text-xs text-zinc-300">
                      Logged: {stopwatch.formattedTime}
                    </span>
                    {!stopwatch.isSaved ? (
                      <button
                        type="button"
                        onClick={stopwatch.saveSession}
                        className="px-3 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold flex items-center space-x-1 transition-colors cursor-pointer"
                      >
                        <BookmarkCheck className="w-3.5 h-3.5" />
                        <span>Save</span>
                      </button>
                    ) : (
                      <span className="text-xs text-emerald-400 font-semibold px-2">✓ Saved</span>
                    )}
                    <button
                      type="button"
                      onClick={handleStartTimer}
                      className="px-3 py-1.5 rounded-full border border-white/20 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      Restart
                    </button>
                  </m.div>
                ) : (
                  <m.button
                    key="start-btn"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    type="button"
                    onClick={handleStartTimer}
                    className="px-6 py-2.5 rounded-full bg-white hover:bg-zinc-100 text-black text-xs sm:text-sm font-semibold tracking-wide shadow-lg shadow-white/10 flex items-center space-x-2 transition-transform active:scale-95 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start</span>
                  </m.button>
                )}
              </AnimatePresence>

              {/* Glass Secondary Pill ("Done" and "Details" separated by divider) */}
              <div className="bg-[rgba(20,20,26,0.7)] backdrop-blur-[20px] border border-white/[0.15] rounded-full p-1 flex items-center shadow-md">
                <button
                  type="button"
                  onClick={() => onComplete(task.id)}
                  className="px-4 py-1.5 rounded-full hover:bg-white/10 text-xs font-semibold text-zinc-200 hover:text-emerald-400 flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Done</span>
                </button>

                <div className="h-4 w-px bg-white/15" />

                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  aria-expanded={showDetails}
                  className="px-4 py-1.5 rounded-full hover:bg-white/10 text-xs font-semibold text-zinc-200 hover:text-white flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <span>Details</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${
                      showDetails ? 'rotate-180 text-orange-400' : 'text-zinc-400'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Carousel Dots on Bottom Right with >=44px tap targets */}
            {totalSlides > 1 && (
              <div
                aria-label="Slide indicators"
                className="flex items-center -space-x-1 sm:space-x-0.5 self-center ml-auto"
              >
                {Array.from({ length: totalSlides }).map((_, idx) => {
                  const isActive = idx === currentIndex;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveIndex(idx)}
                      aria-label={`Go to slide ${idx + 1}`}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center p-2 cursor-pointer"
                    >
                      <span
                        className={`h-2 rounded-full transition-all duration-300 block ${
                          isActive
                            ? 'w-6 bg-white shadow-sm'
                            : 'w-2 bg-white/20 hover:bg-white/40'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Expandable Details Panel */}
          <Collapse isOpen={showDetails}>
            <div className="pt-4 border-t border-white/10 space-y-4">
              {/* Defer Button */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">Can't work on this today?</span>
                <button
                  type="button"
                  onClick={() => onNotToday(task)}
                  className="text-xs text-zinc-400 hover:text-orange-400 transition-colors cursor-pointer underline decoration-zinc-600 hover:decoration-orange-400"
                >
                  Not today (+24h)
                </button>
              </div>

              {/* 10-Minute Starter Kickoff */}
              <div className="p-3.5 rounded-xl border border-white/10 bg-white/[0.03] space-y-1">
                <div className="flex items-center space-x-1.5 text-xs font-semibold text-orange-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>10-Minute Kickoff</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans">{starterStep}</p>
              </div>

              {/* Notes if present */}
              {task.notes && (
                <div className="p-3 rounded-xl border border-white/5 bg-black/30 text-xs text-zinc-400 space-y-1">
                  <span className="font-semibold text-zinc-300 block">Notes:</span>
                  <p className="leading-relaxed whitespace-pre-wrap">{task.notes}</p>
                </div>
              )}

              {/* Overdue Recovery Guidance if overdue */}
              {urgency.isOverdue && (
                <div className="p-3.5 rounded-xl border border-orange-500/30 bg-orange-950/20 text-xs space-y-2">
                  <span className="font-semibold text-orange-300 block">Overdue Recovery:</span>
                  <p className="text-zinc-300 leading-relaxed">
                    Turn in what you have for partial credit, or outreach your professor for an
                    extension.
                  </p>
                  {onEmailInstructor && (
                    <button
                      type="button"
                      onClick={() => onEmailInstructor(task)}
                      className="px-3 py-1.5 rounded-lg border border-orange-500/40 hover:bg-orange-500/20 text-orange-300 text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email instructor</span>
                    </button>
                  )}
                </div>
              )}

              {/* Catch-Up Notice if overdue > 24h exist */}
              {catchUpCount > 0 && onOpenCatchUp && (
                <div className="flex items-center justify-between text-xs p-3 rounded-xl border border-white/5 bg-white/[0.02]">
                  <span className="text-zinc-400">
                    {catchUpCount} older item{catchUpCount === 1 ? '' : 's'} need attention
                  </span>
                  <button
                    type="button"
                    onClick={onOpenCatchUp}
                    className="text-orange-400 hover:text-orange-300 font-medium flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Catch up</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </Collapse>
        </m.div>
      </AnimatePresence>
    </section>
  );
};
