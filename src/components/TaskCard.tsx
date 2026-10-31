import React from 'react';
import { 
  Check, 
  Clock, 
  Trash2, 
  Edit3, 
  AlertTriangle,
  Mail,
  Hourglass
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
  onEmailInstructor?: (task: Task) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onEdit,
  onDelete,
  now = new Date(),
  capacitySettings,
  remainingEffort,
  onEmailInstructor,
}) => {
  const effort = typeof remainingEffort === 'number' ? remainingEffort : task.estimatedHours;
  const urgency = getUrgencyInfo(task.dueDateTime, effort, now, capacitySettings);

  const priorityBadgeStyles: Record<string, string> = {
    urgent: 'border-red-500/50 text-red-400 bg-red-500/10',
    high: 'border-orange-500/50 text-orange-400 bg-orange-500/10',
    medium: 'border-amber-500/50 text-amber-300 bg-amber-500/10',
    low: 'border-zinc-700 text-zinc-400 bg-zinc-900/60',
  };

  return (
    <article
      className={`rounded-xl border p-4 sm:p-4.5 flex flex-col justify-between transition-colors font-sans shadow-sm ${
        task.completed
          ? 'bg-zinc-950/30 border-white/5 opacity-55'
          : `bg-surface hover:bg-raised border-white/[0.08] hover:border-white/20 ${
              urgency.isOverdue ? 'border-amber-500/30' : ''
            }`
      }`}
    >
      {/* Top Row: Checkbox, Course, Title, Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start space-x-3 min-w-0 flex-1">
          {/* Checkbox button */}
          <button
            onClick={() => onToggleComplete(task.id)}
            type="button"
            aria-label={task.completed ? 'Reactivate task' : 'Mark task complete'}
            className={`mt-0.5 shrink-0 w-5 h-5 rounded flex items-center justify-center border transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
              task.completed
                ? 'bg-emerald-500 border-emerald-500 text-black font-bold'
                : 'border-zinc-600 hover:border-orange-400 bg-black/40 text-transparent hover:text-orange-400'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          </button>

          <div className="min-w-0 flex-1">
            {/* Metadata row */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs mb-1">
              <span className="font-bold text-zinc-200 bg-white/5 border border-white/10 px-1.5 py-0.2 rounded text-[11px] whitespace-nowrap shrink-0">
                {task.course || 'GENERAL'}
              </span>

              {!task.completed ? (
                <span
                  className={`px-1.5 py-0.2 rounded text-[11px] font-medium border ${
                    urgency.isOverdue
                      ? 'border-red-500/40 text-red-400 bg-red-500/10'
                      : urgency.hasTimeDeficit
                      ? 'border-orange-500/40 text-orange-400 bg-orange-500/10'
                      : 'border-white/10 text-zinc-400'
                  }`}
                >
                  {urgency.isOverdue ? 'Past due' : urgency.relativeTime}
                </span>
              ) : (
                <span className="px-1.5 py-0.2 rounded text-[11px] border border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                  Completed
                </span>
              )}

              <span className={`px-1.5 py-0.2 rounded text-[11px] border capitalize ${priorityBadgeStyles[task.priority]}`}>
                {task.priority}
              </span>

              <span className="text-zinc-500 text-[11px] capitalize hidden sm:inline">
                • {task.category}
              </span>

              {task.needsReview && (
                <span
                  className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.2 rounded"
                  title="Imported with uncertainty — review details"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Needs review
                </span>
              )}
            </div>

            {/* Task Title */}
            <h4
              className={`text-sm sm:text-base font-semibold text-white leading-snug break-words ${
                task.completed ? 'line-through text-zinc-500' : ''
              }`}
            >
              {task.title}
            </h4>

            {/* Notes */}
            {task.notes && (
              <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                {task.notes}
              </p>
            )}
          </div>
        </div>

        {/* Edit & Delete Action Icons */}
        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => onEdit(task)}
            type="button"
            aria-label="Edit task"
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(task.id)}
            type="button"
            aria-label="Delete task"
            className="p-1.5 rounded text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Overdue Recovery Guidance */}
      {urgency.isOverdue && !task.completed && (
        <div className="my-2.5 p-2.5 rounded border border-amber-500/30 bg-amber-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <span className="text-amber-200">
            Submit what you have or request a brief extension:
          </span>
          <div className="flex items-center space-x-2 shrink-0">
            {onEmailInstructor && (
              <button
                type="button"
                onClick={() => onEmailInstructor(task)}
                className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500 hover:text-black border border-amber-500/40 text-amber-200 text-xs font-medium transition-colors cursor-pointer flex items-center space-x-1"
              >
                <Mail className="w-3 h-3" />
                <span>Email instructor</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onToggleComplete(task.id)}
              className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500 hover:text-black border border-emerald-500/40 text-emerald-300 text-xs font-medium transition-colors cursor-pointer flex items-center space-x-1"
            >
              <Check className="w-3 h-3" />
              <span>Submit partial</span>
            </button>
          </div>
        </div>
      )}

      {/* Footer Metrics Row */}
      <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-wrap items-center justify-between gap-y-1.5 gap-x-4 text-xs text-zinc-400">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {/* Due date */}
          <div className="flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span className="font-mono text-zinc-300">{urgency.formattedDate}</span>
          </div>

          <span>•</span>

          {/* Effort */}
          <div className="flex items-center space-x-1.5">
            <Hourglass className="w-3.5 h-3.5 text-zinc-500" />
            <span className="font-mono text-zinc-300">
              {typeof remainingEffort === 'number' && remainingEffort !== task.estimatedHours ? (
                <span>
                  <strong className="text-orange-400">{remainingEffort}h</strong> left of {task.estimatedHours}h
                </span>
              ) : (
                <span>{task.estimatedHours}h effort</span>
              )}
            </span>
          </div>

          {/* Buffer / Deficit margin */}
          {!task.completed && (
            <>
              <span>•</span>
              {urgency.hasTimeDeficit || urgency.isOverdue ? (
                <span className="text-orange-400 font-medium flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>
                    {urgency.isOverdue ? 'Overdue' : `${Math.abs(urgency.bufferHours).toFixed(1)}h deficit`}
                  </span>
                </span>
              ) : (
                <span className={urgency.bufferHours <= 4 ? 'text-amber-400' : 'text-zinc-400'}>
                  +{urgency.bufferHours.toFixed(1)}h buffer
                </span>
              )}
            </>
          )}
        </div>
      </div>
    </article>
  );
};
