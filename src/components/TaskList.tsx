import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ChevronDown, 
  RotateCcw,
  Plus
} from 'lucide-react';
import { Task, TaskFilter, TaskSort, CapacitySettings } from '../types';
import { TaskCard } from './TaskCard';
import { getUrgencyInfo } from '../utils/date';
import { calculateTaskScore } from '../utils/ranking';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onOpenAddTask: () => void;
  now?: Date;
  capacitySettings?: CapacitySettings;
  remainingEffortMap?: Record<string, number>;
  onEmailInstructor?: (task: Task) => void;
  onOpenImport?: () => void;
  isInitiallyExpanded?: boolean;
  catchUpTasks?: Task[];
}

export const TaskList: React.FC<TaskListProps> = ({
  tasks,
  onToggleComplete,
  onEdit,
  onDelete,
  onOpenAddTask,
  now = new Date(),
  capacitySettings,
  remainingEffortMap,
  onEmailInstructor,
  isInitiallyExpanded = false,
  catchUpTasks = [],
}) => {
  const [isExpanded, setIsExpanded] = useState(isInitiallyExpanded);
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

  return (
    <div id="section-all-tasks" className="space-y-4 font-sans">
      {/* Collapsible Control Button */}
      <div className="flex items-center justify-between border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          className="inline-flex items-center space-x-2 text-sm font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded py-1 px-1.5 -ml-1.5"
        >
          <span>{isExpanded ? 'Hide all tasks' : `Show all tasks (${tasks.length})`}</span>
          <ChevronDown
            className={`w-4 h-4 text-zinc-400 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isExpanded && (
          <button
            type="button"
            onClick={onOpenAddTask}
            className="text-xs text-orange-400 hover:text-orange-300 flex items-center space-x-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add task</span>
          </button>
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="space-y-4 animate-fade-in">
          {/* Catch-Up Older Items Banner (if any) */}
          {catchUpTasks.length > 0 && (
            <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-950/20 space-y-2 text-xs">
              <span className="font-semibold text-amber-300 block">
                Catch up ({catchUpTasks.length} older items need resolution)
              </span>
              <div className="space-y-1.5">
                {catchUpTasks.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-zinc-300">
                    <span className="truncate">{t.title}</span>
                    <button
                      type="button"
                      onClick={() => onToggleComplete(t.id)}
                      className="text-xs text-orange-400 hover:text-white underline cursor-pointer shrink-0 ml-2"
                    >
                      Resolve
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Search and Filters Bar */}
          <div className="rounded-lg border border-white/10 bg-zinc-950/60 p-3 space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search tasks by title, course, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-14 py-2 bg-black border border-white/10 rounded-md text-white text-xs placeholder-zinc-500 focus:outline-none focus:border-orange-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Filter Pills & Dropdown */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5 text-xs">
              {/* Status Filters */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(['all', 'active', 'due-today', 'completed'] as TaskFilter[]).map((f) => {
                  const isSelected = filter === f;
                  const labels: Record<TaskFilter, string> = {
                    all: 'All',
                    active: 'Pending',
                    'due-today': 'Due today',
                    completed: 'Completed',
                    overdue: 'Overdue',
                  };
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 font-medium'
                          : 'bg-white/5 text-zinc-400 hover:text-white border border-transparent'
                      }`}
                    >
                      {labels[f]}
                    </button>
                  );
                })}
              </div>

              {/* Sort & Course dropdowns */}
              <div className="flex items-center space-x-2">
                {uniqueCourses.length > 0 && (
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    aria-label="Filter by course"
                    className="px-2 py-1 bg-black border border-white/10 rounded text-xs text-zinc-300 focus:outline-none"
                  >
                    <option value="all">All courses</option>
                    {uniqueCourses.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as TaskSort)}
                  aria-label="Sort tasks by"
                  className="px-2 py-1 bg-black border border-white/10 rounded text-xs text-zinc-300 focus:outline-none"
                >
                  <option value="smart">Smart order</option>
                  <option value="deadline">Soonest deadline</option>
                  <option value="priority">Priority</option>
                  <option value="effort-asc">Shortest effort</option>
                </select>
              </div>
            </div>
          </div>

          {/* Task Cards List */}
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
                  onEmailInstructor={onEmailInstructor}
                />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center rounded-lg border border-white/10 bg-zinc-950/40 space-y-2 text-xs">
              <p className="text-zinc-400">
                {searchQuery || filter !== 'all' || selectedCourse !== 'all'
                  ? 'No tasks match your current filter.'
                  : 'No tasks tracked yet.'}
              </p>
              {(searchQuery || filter !== 'all' || selectedCourse !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFilter('all');
                    setSelectedCourse('all');
                  }}
                  className="inline-flex items-center space-x-1 text-orange-400 hover:text-white pt-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear filters</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
