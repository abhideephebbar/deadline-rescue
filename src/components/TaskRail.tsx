import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Task, StopwatchSession } from '../types';
import { getTaskLoggedHours } from '../utils/stopwatchIntegration';
import { formatRelativeTime } from '../utils/date';

interface TaskRailProps {
  title: string;
  subtitle?: string;
  tasks: Task[];
  sessions: StopwatchSession[];
  onSelectTask?: (task: Task) => void;
  onStartTask?: (task: Task) => void;
}

export const TaskRail: React.FC<TaskRailProps> = ({
  title,
  subtitle,
  tasks,
  sessions,
  onSelectTask,
  onStartTask,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  if (tasks.length === 0) {
    return null;
  }

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  return (
    <section className="relative my-8" aria-label={title}>
      {/* Rail Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-baseline space-x-2">
          <h2 className="font-['Bebas_Neue'] text-2xl sm:text-3xl tracking-wide text-white uppercase">
            {title}
          </h2>
          {subtitle && (
            <span className="text-xs text-zinc-400 font-sans tracking-normal font-normal">
              {subtitle}
            </span>
          )}
          <span className="text-xs font-mono text-zinc-400 font-medium">
            ({tasks.length})
          </span>
        </div>

        {/* Scroll buttons for desktop */}
        <div className="hidden sm:flex items-center space-x-1">
          <button
            type="button"
            onClick={() => scroll('left')}
            aria-label={`Scroll ${title} left`}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            aria-label={`Scroll ${title} right`}
            className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Relative container with edge fades */}
      <div className="relative group">
        {/* Left edge fade */}
        <div
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-r from-[#09090b] via-[#09090b]/60 to-transparent z-10 opacity-70 group-hover:opacity-90 transition-opacity"
          aria-hidden="true"
        />

        {/* Right edge fade */}
        <div
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-[#09090b] via-[#09090b]/60 to-transparent z-10 opacity-70 group-hover:opacity-90 transition-opacity"
          aria-hidden="true"
        />

        {/* Horizontal scroll container */}
        <div
          ref={scrollContainerRef}
          tabIndex={0}
          role="region"
          aria-label={`${title} scrollable list`}
          className="flex space-x-3 sm:space-x-4 overflow-x-auto snap-x snap-mandatory scrollbar-none py-2 px-1 focus-visible:ring-1 focus-visible:ring-orange-500 rounded-2xl"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {tasks.map((task) => (
            <TaskRailCard
              key={task.id}
              task={task}
              sessions={sessions}
              onSelect={() => onSelectTask?.(task)}
              onStart={() => onStartTask?.(task)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

interface TaskRailCardProps {
  task: Task;
  sessions: StopwatchSession[];
  onSelect: () => void;
  onStart: () => void;
}

const TaskRailCard: React.FC<TaskRailCardProps> = ({
  task,
  sessions,
  onSelect,
  onStart,
}) => {
  const loggedHours = getTaskLoggedHours(task.id, sessions);
  const now = new Date();
  const dueDate = new Date(task.dueDateTime);
  const hoursRemaining = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isOverdue = hoursRemaining < 0;

  // Progress ring math
  const estimatedHours = Math.max(0.1, task.estimatedHours);
  const progressRatio = Math.min(1, loggedHours / estimatedHours);
  const progressPercent = Math.round(progressRatio * 100);

  // SVG ring properties
  const radius = 14;
  const stroke = 3;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (circumference * progressRatio);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      className="w-[260px] shrink-0 snap-start rounded-2xl p-4 bg-[#141419]/90 border border-white/10 hover:border-white/25 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 select-none"
    >
      <div>
        {/* Top meta row: Course chip + progress ring */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-white/10 text-zinc-200 border border-white/10 truncate max-w-[150px]">
            {task.course}
          </span>

          {/* Circular SVG Progress Ring */}
          <div
            className="relative flex items-center justify-center shrink-0"
            title={`${loggedHours}h logged of ${task.estimatedHours}h estimated (${progressPercent}%)`}
            aria-label={`${progressPercent}% completed based on logged hours`}
          >
            <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
              {/* Background Track */}
              <circle
                cx="18"
                cy="18"
                r={radius}
                className="stroke-white/10"
                strokeWidth={stroke}
                fill="none"
              />
              {/* Animated Progress Circle */}
              <circle
                cx="18"
                cy="18"
                r={radius}
                className={progressPercent >= 100 ? 'stroke-emerald-400' : 'stroke-orange-500'}
                strokeWidth={stroke}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                style={{ transition: 'stroke-dashoffset 0.35s ease' }}
              />
            </svg>
            <span className="absolute text-[10px] font-mono font-medium text-zinc-300">
              {progressPercent}%
            </span>
          </div>
        </div>

        {/* Task Title (2 lines clamp) */}
        <h3 className="text-sm font-medium text-white line-clamp-2 leading-snug group-hover:text-orange-200 transition-colors mb-2">
          {task.title}
        </h3>
      </div>

      {/* Bottom meta row: Due date + start quick button */}
      <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5 truncate">
          <Clock className={`w-3.5 h-3.5 shrink-0 ${isOverdue ? 'text-rose-400' : 'text-zinc-400'}`} />
          <span
            className={`truncate font-medium ${
              isOverdue ? 'text-rose-400' : 'text-zinc-300'
            }`}
          >
            {formatRelativeTime(hoursRemaining)}
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStart();
          }}
          aria-label={`Start timer for ${task.title}`}
          className="text-xs px-2.5 py-1 rounded-full bg-white/10 hover:bg-white text-white hover:text-black font-medium transition-colors cursor-pointer shrink-0 ml-2"
        >
          Start
        </button>
      </div>
    </div>
  );
};
