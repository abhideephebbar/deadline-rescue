import React from 'react';
import { 
  Check, 
  Clock, 
  Hourglass, 
  Trash2, 
  Edit3, 
  AlertTriangle,
  Zap
} from 'lucide-react';
import { Task, CapacitySettings } from '../types';
import { getUrgencyInfo } from '../utils/date';

interface TaskCardProps {
  task: Task;
  index: number;
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  now?: Date;
  capacitySettings?: CapacitySettings;
  remainingEffort?: number;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  index,
  onToggleComplete,
  onEdit,
  onDelete,
  now = new Date(),
  capacitySettings,
  remainingEffort,
}) => {
  const effort = typeof remainingEffort === 'number' ? remainingEffort : task.estimatedHours;
  const urgency = getUrgencyInfo(task.dueDateTime, effort, now, capacitySettings);

  // Technical priority color styles
  const priorityBadgeStyles: Record<string, string> = {
    urgent: 'border-red-500/60 text-red-400 bg-red-500/10',
    high: 'border-orange-500/60 text-orange-400 bg-orange-500/10',
    medium: 'border-amber-500/60 text-amber-400 bg-amber-500/10',
    low: 'border-zinc-700 text-zinc-400 bg-zinc-900',
  };

  return (
    <article
      className={`group relative border transition-all duration-300 p-4 sm:p-5 flex flex-col justify-between ${
        task.completed
          ? 'bg-black/30 border-white/5 opacity-50'
          : `bg-zinc-950 border-white/10 hover:border-orange-500/60 ${
              urgency.isOverdue
                ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                : urgency.hasTimeDeficit
                  ? 'border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.08)]'
                  : urgency.hoursRemaining <= 24
                    ? 'border-orange-500/40'
                    : ''
            }`
      }`}
    >
      {/* Subtle hover background layer matching template */}
      <div className="absolute inset-0 bg-orange-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Top Header Row */}
      <div className="relative z-10 flex items-start justify-between gap-3">
        {/* Left: Square Checkbox & Metadata */}
        <div className="flex items-start space-x-3 min-w-0">
          <button
            onClick={() => onToggleComplete(task.id)}
            type="button"
            aria-label={task.completed ? 'Reactivate task' : 'Mark task complete'}
            className={`mt-0.5 shrink-0 w-5 h-5 rounded-none flex items-center justify-center border transition-all cursor-pointer ${
              task.completed
                ? 'bg-emerald-500 border-emerald-500 text-black font-bold'
                : 'border-zinc-700 group-hover:border-orange-500 bg-black/40 text-transparent hover:text-orange-400'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </button>

          <div className="min-w-0">
            {/* Index, Course, Urgency Badge Row */}
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider mb-1.5">
              <span className="text-zinc-600 font-semibold">
                [{index < 9 ? `0${index + 1}` : index + 1}]
              </span>

              <span className="px-1.5 py-0.2 border border-white/15 bg-white/5 text-zinc-200 font-bold">
                {task.course || 'GENERAL'}
              </span>

              {!task.completed ? (
                <span
                  className={`px-1.5 py-0.2 border font-semibold ${
                    urgency.isOverdue
                      ? 'border-red-500 text-red-400 bg-red-500/10'
                      : urgency.hasTimeDeficit
                        ? 'border-red-500 text-red-400 bg-red-500/10 animate-pulse'
                        : urgency.hoursRemaining <= 24
                          ? 'border-orange-500 text-orange-400 bg-orange-500/10'
                          : 'border-white/10 text-zinc-400'
                  }`}
                >
                  {urgency.label}
                </span>
              ) : (
                <span className="px-1.5 py-0.2 border border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                  RESOLVED
                </span>
              )}

              <span
                className={`px-1.5 py-0.2 border ${
                  priorityBadgeStyles[task.priority]
                }`}
              >
                {task.priority}
              </span>

              <span className="text-zinc-500 hidden sm:inline">
                // {task.category}
              </span>
            </div>

            {/* Task Title */}
            <h4
              className={`font-mono text-sm sm:text-base font-bold text-white uppercase tracking-tight leading-snug break-words ${
                task.completed ? 'line-through text-zinc-500' : ''
              }`}
            >
              {task.title}
            </h4>

            {/* Notes */}
            {task.notes && (
              <p className="mt-1 font-mono text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                // {task.notes}
              </p>
            )}
          </div>
        </div>

        {/* Right Action Icons */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => onEdit(task)}
            type="button"
            aria-label="Edit task"
            className="p-1.5 border border-transparent hover:border-white/10 text-zinc-500 hover:text-white transition-colors bg-transparent"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            type="button"
            aria-label="Delete task"
            className="p-1.5 border border-transparent hover:border-red-500/40 text-zinc-500 hover:text-red-400 transition-colors bg-transparent"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Footer Metrics Row */}
      <div className="relative z-10 mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-y-2 gap-x-4 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-400">
          {/* Deadline Countdown */}
          <div className="flex items-center space-x-1.5">
            <Clock className="w-3 h-3 text-zinc-500" />
            <span
              className={`font-medium ${
                task.completed
                  ? 'text-zinc-600'
                  : urgency.isOverdue
                    ? 'text-red-400 font-bold'
                    : urgency.hoursRemaining <= 24
                      ? 'text-orange-400 font-bold'
                      : 'text-zinc-300'
              }`}
            >
              {task.completed ? 'RESOLVED' : urgency.relativeTime}
            </span>
            <span className="text-zinc-600 hidden md:inline">({urgency.formattedDate})</span>
          </div>

          <span>/</span>

          {/* Effort */}
          <div className="flex items-center space-x-1">
            <Hourglass className="w-3 h-3 text-zinc-500" />
            <span>
              {typeof remainingEffort === 'number' && remainingEffort !== task.estimatedHours ? (
                <span>
                  <strong className="text-orange-400">{remainingEffort}H LEFT</strong> ({task.estimatedHours}H EST)
                </span>
              ) : (
                <span>{task.estimatedHours}H EFFORT</span>
              )}
            </span>
          </div>

          {/* Buffer margin */}
          {!task.completed && (
            <>
              <span>/</span>
              <div className="flex items-center space-x-1">
                <Zap className="w-3 h-3 text-zinc-500" />
                {urgency.hasTimeDeficit || urgency.isOverdue ? (
                  <span className="text-red-400 font-semibold flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>
                      {urgency.isOverdue ? 'LATE' : `DEFICIT -${Math.abs(urgency.bufferHours).toFixed(1)}H`}
                    </span>
                  </span>
                ) : (
                  <span
                    className={
                      urgency.bufferHours <= 4 ? 'text-orange-400 font-medium' : 'text-zinc-400'
                    }
                  >
                    BUFFER +{urgency.bufferHours.toFixed(1)}H
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </article>
  );
};
