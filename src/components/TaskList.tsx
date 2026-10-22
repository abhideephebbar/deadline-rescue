import React, { useState, useMemo } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  RotateCcw
} from 'lucide-react';
import { Task, TaskFilter, TaskSort, CapacitySettings } from '../types';
import { TaskCard } from './TaskCard';
import { getUrgencyInfo } from '../utils/date';
import { calculateTaskScore } from '../utils/ranking';
import { BitmapChevron } from './BitmapChevron';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onOpenAddTask: () => void;
  onResetSamples: () => void;
  now?: Date;
  capacitySettings?: CapacitySettings;
  remainingEffortMap?: Record<string, number>;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleComplete,
  onEdit,
  onDelete,
  onOpenAddTask,
  onResetSamples,
  now = new Date(),
  capacitySettings,
  remainingEffortMap,
}) => {
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<TaskSort>('smart');

  // Distinct courses for filter dropdown
  const uniqueCourses = useMemo(() => {
    const courses = new Set<string>();
    tasks.forEach((t) => {
      if (t.course) courses.add(t.course);
    });
    return Array.from(courses).sort();
  }, [tasks]);

  const priorityOrder: Record<string, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  // Filtered & Sorted Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesCourse = task.course.toLowerCase().includes(query);
        const matchesNotes = task.notes?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesCourse && !matchesNotes) return false;
      }

      // 2. Course Filter
      if (selectedCourse !== 'all' && task.course !== selectedCourse) {
        return false;
      }

      // 3. Status/Urgency Filter
      if (filter === 'active') return !task.completed;
      if (filter === 'completed') return task.completed;

      const urgency = getUrgencyInfo(task.dueDateTime, task.estimatedHours, now, capacitySettings);
      if (filter === 'overdue') return !task.completed && urgency.isOverdue;
      if (filter === 'due-today') return !task.completed && urgency.hoursRemaining <= 24 && !urgency.isOverdue;

      return true;
    }).sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      if (sortBy === 'smart') {
        const effortA = remainingEffortMap ? remainingEffortMap[a.id] : undefined;
        const effortB = remainingEffortMap ? remainingEffortMap[b.id] : undefined;
        const scoreA = calculateTaskScore(a, now, effortA, capacitySettings).score;
        const scoreB = calculateTaskScore(b, now, effortB, capacitySettings).score;
        return scoreB - scoreA;
      }

      if (sortBy === 'deadline') {
        return new Date(a.dueDateTime).getTime() - new Date(b.dueDateTime).getTime();
      }

      if (sortBy === 'priority') {
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      }

      if (sortBy === 'effort-asc') {
        return a.estimatedHours - b.estimatedHours;
      }

      if (sortBy === 'effort-desc') {
        return b.estimatedHours - a.estimatedHours;
      }

      return 0;
    });
  }, [tasks, filter, selectedCourse, searchQuery, sortBy, now, capacitySettings, remainingEffortMap]);

  const activeCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div id="section-radar" className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/10 pb-3 gap-2">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-orange-400 block">
            04 // RADAR QUEUE
          </span>
          <h2 className="font-display text-3xl sm:text-4xl text-white tracking-tight uppercase">
            ACTIVE COURSEWORK DEADLINES
          </h2>
        </div>
        <p className="font-mono text-xs text-zinc-500 text-left sm:text-right">
          TRIAGED VIA TIME PROXIMITY & ESTIMATED EFFORT
        </p>
      </div>

      {/* Control Bar */}
      <div className="border border-white/10 bg-zinc-950 p-3 sm:p-4 space-y-3 font-mono">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Field */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="SEARCH RADAR BY TITLE, COURSE OR NOTE..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-14 py-2 bg-black border border-white/10 text-white text-xs placeholder-zinc-600 focus:outline-none focus:border-orange-500 uppercase tracking-wider"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-zinc-400 hover:text-white"
              >
                [CLR]
              </button>
            )}
          </div>

          {/* Sort Menu */}
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-[10px] text-zinc-500 flex items-center space-x-1 hidden sm:flex">
              <SlidersHorizontal className="w-3 h-3" />
              <span>SORT:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as TaskSort)}
              className="px-2.5 py-1.5 bg-black border border-white/10 text-xs text-zinc-200 focus:border-orange-500 focus:outline-none uppercase tracking-wider"
            >
              <option value="smart">🎯 SMART TRIAGE RANK</option>
              <option value="deadline">⏱ DEADLINE (SOONEST)</option>
              <option value="priority">🔥 PRIORITY (URGENT)</option>
              <option value="effort-asc">⚡ EFFORT (QUICK WIN)</option>
              <option value="effort-desc">📚 EFFORT (HEAVY LIFT)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: `ALL [${tasks.length}]` },
              { id: 'active', label: `PENDING [${activeCount}]` },
              { id: 'due-today', label: `DUE TODAY (<24H)` },
              { id: 'overdue', label: `OVERDUE` },
              { id: 'completed', label: `RESOLVED [${completedCount}]` },
            ].map(({ id, label }) => {
              const isSelected = filter === id;
              return (
                <button
                  key={id}
                  onClick={() => setFilter(id as TaskFilter)}
                  type="button"
                  className={`px-2.5 py-1 text-[11px] uppercase tracking-wider transition-all border ${
                    isSelected
                      ? 'border-orange-500 bg-orange-500/10 text-orange-400 font-bold'
                      : 'border-white/10 hover:border-white/20 text-zinc-400 hover:text-white bg-black/40'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Course filter */}
          {uniqueCourses.length > 0 && (
            <div className="flex items-center space-x-1.5 text-[11px]">
              <span className="text-zinc-600">COURSE:</span>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="px-2 py-1 bg-black border border-white/10 text-zinc-300 focus:outline-none uppercase"
              >
                <option value="all">ALL COURSES</option>
                {uniqueCourses.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Task Cards Stack */}
      {filteredTasks.length > 0 ? (
        <div className="space-y-3">
          {filteredTasks.map((task, idx) => (
            <TaskCard
              key={task.id}
              task={task}
              index={idx}
              onToggleComplete={onToggleComplete}
              onEdit={onEdit}
              onDelete={onDelete}
              now={now}
              capacitySettings={capacitySettings}
              remainingEffort={remainingEffortMap ? remainingEffortMap[task.id] : undefined}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="p-8 sm:p-12 text-center border border-white/10 bg-zinc-950/60 font-mono">
          {tasks.length === 0 ? (
            <div className="max-w-md mx-auto space-y-3">
              <span className="text-xs uppercase tracking-[0.25em] text-orange-400 block">
                SIGNAL // EMPTY
              </span>
              <h3 className="font-display text-3xl sm:text-4xl text-white uppercase tracking-tight">
                No Tracked Coursework
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Your priority radar is currently clear. Add a new deadline or load demo coursework to test the triage engine.
              </p>
              <div className="flex items-center justify-center gap-3 pt-3">
                <button
                  onClick={onOpenAddTask}
                  type="button"
                  className="inline-flex items-center gap-2 border border-orange-500 bg-orange-500 text-black px-4 py-2 text-xs uppercase tracking-widest font-bold hover:bg-orange-400 transition-colors cursor-pointer"
                >
                  <span>Add First Task</span>
                  <BitmapChevron />
                </button>
                <button
                  onClick={onResetSamples}
                  type="button"
                  className="border border-white/10 px-4 py-2 text-xs uppercase tracking-widest text-zinc-300 hover:text-white hover:border-white/30 transition-colors"
                >
                  Load Sample Data
                </button>
              </div>
            </div>
          ) : filter === 'active' && activeCount === 0 ? (
            <div className="max-w-md mx-auto space-y-2">
              <span className="text-xs uppercase tracking-[0.25em] text-emerald-400 block">
                STATUS // NOMINAL
              </span>
              <h3 className="font-display text-3xl sm:text-4xl text-white uppercase tracking-tight">
                All Deadlines Conquered
              </h3>
              <p className="text-xs text-zinc-400">
                Outstanding execution. Every assignment on your radar has been resolved.
              </p>
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-3">
              <span className="text-xs uppercase tracking-[0.25em] text-zinc-500 block">
                FILTER // NO MATCH
              </span>
              <h3 className="font-display text-2xl sm:text-3xl text-white uppercase tracking-tight">
                Zero Items Matching Query
              </h3>
              <p className="text-xs text-zinc-500">
                No coursework matches your active filter or search keywords.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilter('all');
                  setSelectedCourse('all');
                }}
                type="button"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 border border-white/20 text-xs text-zinc-300 hover:text-white transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Radar Filters</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
