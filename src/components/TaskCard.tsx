import React from 'react';
import { 
  Check, 
  Clock, 
  Hourglass, 
  Trash2, 
  Edit3, 
  AlertTriangle
} from 'lucide-react';
import { Task } from '../types';
import { getUrgencyInfo } from '../utils/date';

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
}) => {
  const urgency = getUrgencyInfo(task.dueDateTime, task.estimatedHours);

  // Priority badge styling
  const priorityStyles: Record<string, string> = {
    urgent: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
    high: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    medium: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    low: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  };

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border p-4 sm:p-5 transition-all duration-200 ${
        task.completed
          ? 'bg-zinc-950/40 border-zinc-900 opacity-60'
          : `bg-zinc-900/80 hover:bg-zinc-900 border-zinc-800 hover:border-zinc-700 shadow-lg ${urgency.borderClass}`
      }`}
    >
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        {/* Left Side: Complete Checkbox */}
        <button
          onClick={() => onToggleComplete(task.id)}
          aria-label={task.completed ? 'Mark incomplete' : 'Mark completed'}
          className={`mt-1 shrink-0 w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
            task.completed
              ? 'bg-emerald-500 border-emerald-500 text-zinc-950 shadow-sm shadow-emerald-500/30'
              : 'border-zinc-700 hover:border-brand-500 bg-zinc-950 hover:bg-zinc-900 text-transparent hover:text-zinc-600'
          }`}
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </button>

        {/* Middle: Content */}
        <div className="flex-1 min-w-0">
          {/* Header Row: Course, Urgency Badge, Priority */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
            {/* Course Code */}
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-zinc-800 text-zinc-200 border border-zinc-700/80">
              {task.course || 'GENERAL'}
            </span>

            {/* Urgency Badge (Only for incomplete tasks) */}
            {!task.completed && (
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${urgency.badgeClass}`}>
                {urgency.label}
              </span>
            )}

            {/* Completed badge */}
            {task.completed && (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
                COMPLETED
              </span>
            )}

            {/* Priority Badge */}
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                priorityStyles[task.priority]
              }`}
            >
              {task.priority}
            </span>

            {/* Category */}
            <span className="text-[11px] text-zinc-400 capitalize hidden sm:inline">
              • {task.category}
            </span>
          </div>

          {/* Title */}
          <h4
            className={`text-base font-bold tracking-tight text-white leading-snug break-words ${
              task.completed ? 'line-through text-zinc-400' : ''
            }`}
          >
            {task.title}
          </h4>

          {/* Notes */}
          {task.notes && (
            <p className="mt-1.5 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
              {task.notes}
            </p>
          )}

          {/* Footer Metadata: Countdown, Effort, Safety Buffer */}
          <div className="mt-3.5 pt-3 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-xs">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-zinc-400">
              {/* Deadline & Relative Time */}
              <div className="flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span className={`font-semibold ${
                  task.completed 
                    ? 'text-zinc-500' 
                    : urgency.isOverdue 
                      ? 'text-rose-400 font-bold' 
                      : urgency.hoursRemaining <= 24 
                        ? 'text-amber-300 font-bold' 
                        : 'text-zinc-300'
                }`}>
                  {task.completed ? 'Deadline was ' + urgency.formattedDate : urgency.relativeTime}
                </span>
                <span className="text-zinc-600 hidden md:inline">({urgency.formattedDate})</span>
              </div>

              <span>•</span>

              {/* Effort */}
              <div className="flex items-center space-x-1">
                <Hourglass className="w-3.5 h-3.5 text-zinc-500" />
                <span>{task.estimatedHours}h effort</span>
              </div>

              {/* Buffer indicator (for incomplete tasks) */}
              {!task.completed && (
                <>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    {urgency.hasTimeDeficit || urgency.isOverdue ? (
                      <span className="text-rose-400 font-semibold flex items-center space-x-1">
                        <AlertTriangle className="w-3 h-3 text-rose-400" />
                        <span>
                          {urgency.isOverdue ? 'Overdue' : `${Math.abs(urgency.bufferHours).toFixed(1)}h Deficit!`}
                        </span>
                      </span>
                    ) : (
                      <span className={`font-medium ${urgency.bufferHours <= 4 ? 'text-amber-400' : 'text-zinc-400'}`}>
                        {urgency.bufferHours.toFixed(1)}h buffer
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Card Action Buttons */}
            <div className="flex items-center space-x-1 ml-auto">
              <button
                onClick={() => onEdit(task)}
                aria-label="Edit task"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(task.id)}
                aria-label="Delete task"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
