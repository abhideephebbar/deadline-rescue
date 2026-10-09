import React, { useState, useMemo } from 'react';
import { 
  Search, 
  SlidersHorizontal, 
  Filter, 
  FolderPlus, 
  CheckCircle2, 
  RotateCcw
} from 'lucide-react';
import { Task, TaskFilter, TaskSort } from '../types';
import { TaskCard } from './TaskCard';
import { getUrgencyInfo } from '../utils/date';
import { calculateTaskScore } from '../utils/ranking';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onOpenAddTask: () => void;
  onResetSamples: () => void;
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleComplete,
  onEdit,
  onDelete,
  onOpenAddTask,
  onResetSamples,
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

  // Priority ordering map
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

      const urgency = getUrgencyInfo(task.dueDateTime, task.estimatedHours);
      if (filter === 'overdue') return !task.completed && urgency.isOverdue;
      if (filter === 'due-today') return !task.completed && urgency.hoursRemaining <= 24 && !urgency.isOverdue;

      return true;
    }).sort((a, b) => {
      // Completed tasks always settle to the bottom in general views
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      if (sortBy === 'smart') {
        const scoreA = calculateTaskScore(a).score;
        const scoreB = calculateTaskScore(b).score;
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
  }, [tasks, filter, selectedCourse, searchQuery, sortBy]);

  const activeCount = tasks.filter((t) => !t.completed).length;
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="space-y-5">
      {/* Search & Filter Controls Toolbar */}
      <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 backdrop-blur-sm space-y-3.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Search assignments, course codes, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-zinc-950 border border-zinc-800 focus:border-brand-500 text-white text-xs sm:text-sm placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort Selector */}
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs text-zinc-400 flex items-center space-x-1 hidden sm:flex">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Sort:</span>
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as TaskSort)}
              className="px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-zinc-200 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="smart">🎯 Smart Rescue Priority</option>
              <option value="deadline">⏱ Deadline (Soonest first)</option>
              <option value="priority">🔥 Priority (Urgent first)</option>
              <option value="effort-asc">⚡ Effort (Shortest / Quick Win)</option>
              <option value="effort-desc">📚 Effort (Longest first)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-800/60">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === 'all'
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                  : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              All ({tasks.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === 'active'
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                  : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              Pending ({activeCount})
            </button>
            <button
              onClick={() => setFilter('due-today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === 'due-today'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              Due Today (&lt;24h)
            </button>
            <button
              onClick={() => setFilter('overdue')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === 'overdue'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                  : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              Overdue
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === 'completed'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              Completed ({completedCount})
            </button>
          </div>

          {/* Filter by course if multiple courses exist */}
          {uniqueCourses.length > 0 && (
            <div className="flex items-center space-x-1.5">
              <span className="text-[11px] text-zinc-500">Course:</span>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 focus:outline-none"
              >
                <option value="all">All Courses</option>
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

      {/* Task List Grid / Empty States */}
      {filteredTasks.length > 0 ? (
        <div className="grid grid-cols-1 gap-3.5">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggleComplete={onToggleComplete}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        /* Empty State (Fulfills Feature #7) */
        <div className="p-8 sm:p-12 text-center rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
          {tasks.length === 0 ? (
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
                <FolderPlus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">No Coursework Tracked</h3>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1">
                  Start by adding your current college assignments or load the sample tasks to test the triage engine.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={onOpenAddTask}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-brand-950/40"
                >
                  Add Your First Task
                </button>
                <button
                  onClick={onResetSamples}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs sm:text-sm font-medium transition-all"
                >
                  Load Sample Tasks
                </button>
              </div>
            </div>
          ) : filter === 'active' && activeCount === 0 ? (
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-white">All Pending Deadlines Completed!</h3>
              <p className="text-xs sm:text-sm text-zinc-400">
                Outstanding job! You've cleared every single pending assignment on your radar.
              </p>
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-800 flex items-center justify-center text-zinc-400">
                <Filter className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">No Matching Tasks Found</h3>
              <p className="text-xs sm:text-sm text-zinc-400">
                No items match your active search or filter criteria. Try clearing search filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilter('all');
                  setSelectedCourse('all');
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Filters</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
