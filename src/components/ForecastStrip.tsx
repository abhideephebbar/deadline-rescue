import React, { useState } from 'react';
import { Calendar, Check, Sparkles } from 'lucide-react';
import { Task, CapacitySettings } from '../types';
import { calculateDailyLoads } from '../utils/capacity';
import { simulateTaskDelay } from '../utils/forecast';

interface ForecastStripProps {
  tasks: Task[];
  capacitySettings: CapacitySettings;
  now?: Date;
  onUpdateTaskDueDate?: (taskId: string, newDueDateIso: string) => void;
}

export const ForecastStrip: React.FC<ForecastStripProps> = ({
  tasks,
  capacitySettings,
  now = new Date(),
  onUpdateTaskDueDate,
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [simulatedTaskId, setSimulatedTaskId] = useState<string | null>(null);
  const [delayDays, setDelayDays] = useState<number>(1);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);

  const baseLoads = calculateDailyLoads(tasks, capacitySettings, now, 7);

  const incompleteTasks = tasks.filter((t) => !t.completed);
  const taskToSimulate = incompleteTasks.find((t) => t.id === simulatedTaskId) || null;

  // Compute live simulation if a task is selected
  const simulation = taskToSimulate
    ? simulateTaskDelay(taskToSimulate, delayDays, tasks, capacitySettings, now)
    : null;

  // Use simulated loads if simulation is active, otherwise base loads
  const displayLoads = simulation ? simulation.simulatedLoads : baseLoads;

  const isExpanded = selectedDayIndex !== null;
  const selectedDay = selectedDayIndex !== null ? displayLoads[selectedDayIndex] : null;
  const tasksDrivingSelectedDay = selectedDay
    ? incompleteTasks.filter((t) => selectedDay.taskIds.includes(t.id))
    : [];

  const handleDayClick = (idx: number) => {
    if (selectedDayIndex === idx) {
      setSelectedDayIndex(null); // toggle closed
      setSimulatedTaskId(null);
    } else {
      setSelectedDayIndex(idx);
    }
  };

  const handleApplyShift = () => {
    if (!taskToSimulate || !simulation || !onUpdateTaskDueDate) return;

    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + simulation.targetDayIndex);
    targetDate.setHours(23, 59, 0, 0);

    onUpdateTaskDueDate(taskToSimulate.id, targetDate.toISOString());

    setApplySuccessMessage(`Rescheduled "${taskToSimulate.title}" to ${simulation.targetDayLabel}`);
    setTimeout(() => {
      setApplySuccessMessage(null);
      setSimulatedTaskId(null);
    }, 2500);
  };

  return (
    <section aria-label="7-day workload forecast" className="space-y-3 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
          This week
        </h3>
        <span className="text-xs text-zinc-500">
          Tap a day to see tasks
        </span>
      </div>

      {/* 7-Day Strip */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {displayLoads.map((day, idx) => {
          const isSelected = selectedDayIndex === idx;
          const percent = day.capacityHours > 0 ? Math.min(100, Math.round((day.demandHours / day.capacityHours) * 100)) : 0;

          // Status label
          const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
            clear: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
            filling: { bg: 'bg-amber-500/10', text: 'text-amber-300', dot: 'bg-amber-400' },
            overloaded: { bg: 'bg-orange-500/15', text: 'text-orange-400', dot: 'bg-orange-500' },
          };
          const colors = statusColors[day.status] || statusColors.clear;

          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => handleDayClick(idx)}
              aria-expanded={isSelected}
              className={`p-2 sm:p-3 rounded-lg border text-left transition-colors cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'border-orange-500 bg-orange-950/20'
                  : 'border-white/10 hover:border-white/20 bg-zinc-950/60'
              }`}
            >
              {/* Day Name */}
              <div className="flex items-center justify-between text-xs">
                <span className={`font-semibold ${isSelected ? 'text-orange-400' : 'text-zinc-200'}`}>
                  {idx === 0 ? 'Today' : day.dayLabel.split(' ')[0]}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
              </div>

              {/* Hours */}
              <div className="mt-2 text-xs">
                <div className="font-mono text-xs font-semibold text-white">
                  {day.demandHours}h
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  of {day.capacityHours}h
                </div>
              </div>

              {/* Mini fill bar */}
              <div className="mt-1.5 w-full h-1 bg-black/60 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    day.status === 'overloaded'
                      ? 'bg-orange-500'
                      : day.status === 'filling'
                      ? 'bg-amber-400'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Expanded Day Details & What-If Delay Simulator */}
      {isExpanded && selectedDay && (
        <div className="rounded-lg border border-white/15 bg-zinc-950 p-4 space-y-4 animate-fade-in text-xs">
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center space-x-2">
              <Calendar className="w-3.5 h-3.5 text-orange-400" />
              <span className="font-semibold text-white">
                {selectedDay.dayLabel}
              </span>
              <span className="text-zinc-500">
                ({selectedDay.demandHours}h planned vs {selectedDay.capacityHours}h study hours)
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSelectedDayIndex(null)}
              className="text-zinc-400 hover:text-white"
            >
              Close
            </button>
          </div>

          {/* Tasks scheduled on this day */}
          {tasksDrivingSelectedDay.length > 0 ? (
            <div className="space-y-2">
              {tasksDrivingSelectedDay.map((task) => {
                const isSimulated = simulatedTaskId === task.id;
                return (
                  <div
                    key={task.id}
                    className={`p-3 rounded border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors ${
                      isSimulated
                        ? 'border-orange-500 bg-orange-950/20'
                        : 'border-white/10 bg-black/40 hover:border-white/20'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-zinc-300 text-[11px] bg-white/5 border border-white/10 px-1.5 py-0.2 rounded whitespace-nowrap shrink-0">
                          {task.course}
                        </span>
                        <span className="font-medium text-white truncate text-xs">
                          {task.title}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {task.estimatedHours}h effort • {task.priority} priority
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isSimulated ? (
                        <button
                          onClick={() => setSimulatedTaskId(null)}
                          type="button"
                          className="px-2.5 py-1 text-xs border border-white/20 rounded text-zinc-300 hover:text-white"
                        >
                          Cancel
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSimulatedTaskId(task.id);
                            setDelayDays(1);
                          }}
                          type="button"
                          className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs rounded border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>What if I move this?</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-zinc-500 py-2">
              No tasks scheduled for {selectedDay.dayLabel}. This day is clear.
            </p>
          )}

          {/* Simulation Box */}
          {simulation && taskToSimulate && (
            <div className="p-3.5 rounded-lg border border-orange-500/40 bg-orange-950/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-orange-300">
                  Delay consequence preview
                </span>

                <div className="flex items-center space-x-1.5">
                  <span className="text-zinc-400 text-[11px]">Move by:</span>
                  {[1, 2, 3].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDelayDays(d)}
                      className={`px-2 py-0.5 rounded text-xs transition-colors cursor-pointer ${
                        delayDays === d
                          ? 'bg-orange-500 text-black font-semibold'
                          : 'bg-white/10 text-zinc-300 hover:text-white'
                      }`}
                    >
                      +{d}d
                    </button>
                  ))}
                </div>
              </div>

              <p className="text-zinc-200 leading-relaxed">
                {simulation.consequenceSentence}
              </p>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setSimulatedTaskId(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  Clear preview
                </button>

                {onUpdateTaskDueDate && (
                  <button
                    type="button"
                    onClick={handleApplyShift}
                    className="px-3 py-1.5 rounded bg-orange-500 hover:bg-orange-400 text-black font-semibold text-xs transition-colors cursor-pointer"
                  >
                    Reschedule task
                  </button>
                )}
              </div>
            </div>
          )}

          {applySuccessMessage && (
            <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{applySuccessMessage}</span>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
