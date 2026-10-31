import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Check,
  Clock,
  Edit3,
  Trash2,
  Mail,
  Filter,
  ArrowUpDown,
} from 'lucide-react';
import { Task, TaskFilter, TaskSort, CapacitySettings } from '../types';
import { Glass } from './ui/Glass';
import { getUrgencyInfo } from '../utils/date';
import { calculateTaskScore } from '../utils/ranking';

interface AllTasksViewProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onOpenAddTask: () => void;
  now?: Date;
  capacitySettings?: CapacitySettings;
  remainingEffortMap?: Record<string, number>;
  onEmailInstructor?: (task: Task) => void;
}

export const AllTasksView: React.FC<AllTasksViewProps> = ({
  tasks,
  onToggleComplete,
  onEdit,
  onDelete,
  onOpenAddTask,
  now = new Date(),
  capacitySettings,
  remainingEffortMap,
  onEmailInstructor,
}) => {
  const [filter, setFilter] = useState<TaskFilter>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<TaskSort>('smart');

  // Unique list of courses with their task counts
  const coursesWithCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach((t) => {
      const course = t.course?.trim() || 'General';
      counts[course] = (counts[course] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tasks]);

  const priorityOrder: Record<string, number> = {
    urgent: 4,
    high: 3,
    medium: 2,
    low: 1,
  };

  // Filter and sort all tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesCourse = (task.course || '').toLowerCase().includes(query);
        const matchesNotes = (task.notes || '').toLowerCase().includes(query);
        if (!matchesTitle && !matchesCourse && !matchesNotes) return false;
      }

      // 2. Course Filter
      if (selectedCourse !== 'all') {
        const taskCourse = task.course?.trim() || 'General';
        if (taskCourse !== selectedCourse) return false;
      }

      // 3. Status Filter
      if (filter === 'active') return !task.completed && !task.dropped;
      if (filter === 'completed') return task.completed;

      const urgency = getUrgencyInfo(task.dueDateTime, task.estimatedHours, now, capacitySettings);
      if (filter === 'overdue') return !task.completed && !task.dropped && urgency.isOverdue;
      if (filter === 'due-today') {
        return !task.completed && !task.dropped && urgency.hoursRemaining <= 24 && !urgency.isOverdue;
      }

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

  // Group filtered tasks by course
  const groupedTasksByCourse = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    filteredTasks.forEach((task) => {
      const course = task.course?.trim() || 'General';
      if (!groups[course]) {
        groups[course] = [];
      }
      groups[course].push(task);
    });
    return groups;
  }, [filteredTasks]);

  const courseNames = Object.keys(groupedTasksByCourse).sort();

  return (
    <div className="space-y-6 sm:space-y-8 font-sans max-w-5xl mx-auto py-2 pb-28 sm:pb-8">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
        <div>
          <h1 className="font-['Bebas_Neue'] text-4xl sm:text-5xl tracking-wide uppercase text-white leading-none">
            All Tasks
          </h1>
          <p className="text-sm text-zinc-300 mt-1">
            {tasks.filter((t) => !t.completed).length} active coursework assignments across {coursesWithCounts.length} {coursesWithCounts.length === 1 ? 'course' : 'courses'}.
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAddTask}
          className="self-start sm:self-auto inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-400 text-black text-sm font-semibold transition-colors cursor-pointer shadow-sm active:scale-95"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add a task</span>
        </button>
      </div>

      {/* Search and Filters Glass Card */}
      <Glass className="p-4 sm:p-5 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by assignment title, course, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-16 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white text-sm placeholder-zinc-400 focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              type="button"
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Course Filter Chips */}
        <div className="space-y-1.5">
          <div className="text-xs text-zinc-400 font-medium flex items-center space-x-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <span>Filter by Course</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCourse('all')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                selectedCourse === 'all'
                  ? 'bg-orange-500 text-black font-semibold'
                  : 'bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
              }`}
            >
              All Courses ({tasks.length})
            </button>
            {coursesWithCounts.map(([course, count]) => (
              <button
                key={course}
                type="button"
                onClick={() => setSelectedCourse(course)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer uppercase ${
                  selectedCourse === course
                    ? 'bg-orange-500 text-black font-semibold'
                    : 'bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10'
                }`}
              >
                {course} ({count})
              </button>
            ))}
          </div>
        </div>

        {/* Status filters and Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
          {/* Status filters */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'All' },
              { id: 'active', label: 'Active' },
              { id: 'due-today', label: 'Due Today' },
              { id: 'completed', label: 'Completed' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id as TaskFilter)}
                className={`px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
                  filter === f.id
                    ? 'bg-white/20 text-white font-medium border border-white/30'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort selector */}
          <div className="flex items-center space-x-2 text-xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-zinc-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as TaskSort)}
              aria-label="Sort tasks by"
              className="bg-black/40 border border-white/15 rounded-lg text-zinc-200 text-xs px-2.5 py-1 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="smart">Triage Priority (Smart)</option>
              <option value="deadline">Closest Deadline</option>
              <option value="priority">Highest Priority</option>
              <option value="effort-asc">Shortest Effort</option>
              <option value="effort-desc">Longest Effort</option>
            </select>
          </div>
        </div>
      </Glass>

      {/* Tasks Grouped by Course */}
      {courseNames.length > 0 ? (
        <div className="space-y-6">
          {courseNames.map((courseName) => {
            const courseTasks = groupedTasksByCourse[courseName] || [];
            return (
              <div key={courseName} className="space-y-2.5">
                {/* Course Group Header */}
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-['Bebas_Neue'] text-xl sm:text-2xl tracking-wide uppercase text-white">
                      {courseName}
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">
                      ({courseTasks.length} {courseTasks.length === 1 ? 'task' : 'tasks'})
                    </span>
                  </div>
                </div>

                {/* Glass Rows Container */}
                <div className="space-y-2">
                  {courseTasks.map((task) => (
                    <TaskGlassRow
                      key={task.id}
                      task={task}
                      now={now}
                      capacitySettings={capacitySettings}
                      remainingEffort={remainingEffortMap ? remainingEffortMap[task.id] : undefined}
                      onToggleComplete={() => onToggleComplete(task.id)}
                      onEdit={() => onEdit(task)}
                      onDelete={() => onDelete(task.id)}
                      onEmailInstructor={onEmailInstructor ? () => onEmailInstructor(task) : undefined}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Glass className="p-8 text-center space-y-2">
          <p className="text-base font-semibold text-white">No tasks match your filters</p>
          <p className="text-xs text-zinc-400">Try clearing your search query or switching to another filter.</p>
        </Glass>
      )}
    </div>
  );
};

interface TaskGlassRowProps {
  task: Task;
  now: Date;
  capacitySettings?: CapacitySettings;
  remainingEffort?: number;
  onToggleComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEmailInstructor?: () => void;
}

const TaskGlassRow: React.FC<TaskGlassRowProps> = ({
  task,
  now,
  capacitySettings,
  remainingEffort,
  onToggleComplete,
  onEdit,
  onDelete,
  onEmailInstructor,
}) => {
  const effort = typeof remainingEffort === 'number' ? remainingEffort : task.estimatedHours;
  const urgency = getUrgencyInfo(task.dueDateTime, effort, now, capacitySettings);

  const priorityStyles: Record<string, string> = {
    urgent: 'border-red-500/40 text-red-400 bg-red-500/10',
    high: 'border-orange-500/40 text-orange-400 bg-orange-500/10',
    medium: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
    low: 'border-zinc-700 text-zinc-400 bg-zinc-900/60',
  };

  return (
    <div
      className={`rounded-2xl border p-3.5 sm:p-4 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        task.completed
          ? 'bg-zinc-950/40 border-white/5 opacity-60'
          : 'bg-[#141419]/90 border-white/10 hover:border-white/20 hover:bg-[#181820]'
      }`}
    >
      {/* Left side: Checkbox + Title + Meta */}
      <div className="flex items-start space-x-3 min-w-0 flex-1">
        {/* Toggle Complete Button */}
        <button
          type="button"
          onClick={onToggleComplete}
          aria-label={task.completed ? 'Reopen task' : 'Complete task'}
          className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
            task.completed
              ? 'bg-emerald-500 border-emerald-500 text-black'
              : 'border-zinc-500 hover:border-orange-400 bg-black/40 text-transparent hover:text-orange-400'
          }`}
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </button>

        {/* Task Details */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {/* Urgency Badge */}
            {!task.completed ? (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                  urgency.isOverdue
                    ? 'border-red-500/40 text-red-400 bg-red-500/15'
                    : urgency.hasTimeDeficit
                    ? 'border-orange-500/40 text-orange-400 bg-orange-500/15'
                    : 'border-white/10 text-zinc-300 bg-white/5'
                }`}
              >
                {urgency.isOverdue ? 'Overdue' : urgency.relativeTime}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium border border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                Done
              </span>
            )}

            {/* Priority Badge */}
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium border uppercase ${priorityStyles[task.priority]}`}
            >
              {task.priority}
            </span>

            {/* Category */}
            <span className="px-2 py-0.5 rounded-full text-[10px] text-zinc-400 bg-white/5 border border-white/5 capitalize">
              {task.category}
            </span>
          </div>

          <h3
            className={`text-sm font-medium leading-snug truncate ${
              task.completed ? 'line-through text-zinc-400' : 'text-white'
            }`}
          >
            {task.title}
          </h3>

          {task.notes && (
            <p className="text-xs text-zinc-400 truncate mt-0.5 max-w-xl">
              {task.notes}
            </p>
          )}
        </div>
      </div>

      {/* Right side: Hours & Actions */}
      <div className="flex items-center justify-between sm:justify-end space-x-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5 shrink-0">
        <div className="text-xs text-zinc-400 flex items-center space-x-1.5 font-mono">
          <Clock className="w-3.5 h-3.5 text-zinc-400" />
          <span>{effort}h remaining</span>
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-1">
          {onEmailInstructor && (urgency.isOverdue || urgency.hasTimeDeficit) && !task.completed && (
            <button
              type="button"
              onClick={onEmailInstructor}
              title="Draft email to professor"
              aria-label="Email professor"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4 text-orange-400" />
            </button>
          )}

          <button
            type="button"
            onClick={onEdit}
            title="Edit task"
            aria-label="Edit task"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onDelete}
            title="Delete task"
            aria-label="Delete task"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
