import React, { useState } from 'react';
import { Calendar, Check, Sparkles, ArrowRight, Clock } from 'lucide-react';
import { Task, CapacitySettings } from '../types';
import { calculateDailyLoads } from '../utils/capacity';
import { simulateTaskDelay } from '../utils/forecast';
import { Glass } from './ui/Glass';
import { Collapse } from './ui/Collapse';

interface WeekForecastViewProps {
  tasks: Task[];
  capacitySettings: CapacitySettings;
  now?: Date;
  onUpdateTaskDueDate?: (taskId: string, newDueDateIso: string) => void;
  onOpenCapacitySettings?: () => void;
}

export const WeekForecastView: React.FC<WeekForecastViewProps> = ({
  tasks,
  capacitySettings,
  now = new Date(),
  onUpdateTaskDueDate,
  onOpenCapacitySettings,
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(0);
  const [simulatedTaskId, setSimulatedTaskId] = useState<string | null>(null);
  const [delayDays, setDelayDays] = useState<number>(1);
  const [applySuccessMessage, setApplySuccessMessage] = useState<string | null>(null);

  const baseLoads = calculateDailyLoads(tasks, capacitySettings, now, 7);
  const incompleteTasks = tasks.filter((t) => !t.completed && !t.dropped);
  const taskToSimulate = incompleteTasks.find((t) => t.id === simulatedTaskId) || null;

  // Compute live simulation if a task is selected
  const simulation = taskToSimulate
    ? simulateTaskDelay(taskToSimulate, delayDays, tasks, capacitySettings, now)
    : null;

  // Use simulated loads if simulation is active, otherwise base loads
  const displayLoads = simulation ? simulation.simulatedLoads : baseLoads;

  const selectedDay = selectedDayIndex !== null ? displayLoads[selectedDayIndex] : null;
  const tasksDrivingSelectedDay = selectedDay
    ? incompleteTasks.filter((t) => selectedDay.taskIds.includes(t.id))
    : [];

  // Summary stats over next 7 days
  const total7DayDemand = Math.round(displayLoads.reduce((sum, d) => sum + d.demandHours, 0) * 10) / 10;
  const total7DayCapacity = Math.round(displayLoads.reduce((sum, d) => sum + d.capacityHours, 0) * 10) / 10;
  const overloadedDaysCount = displayLoads.filter((d) => d.status === 'overloaded').length;

  const handleDayClick = (idx: number) => {
    if (selectedDayIndex === idx) {
      // Keep selected or toggle
      setSelectedDayIndex(idx);
    } else {
      setSelectedDayIndex(idx);
      setSimulatedTaskId(null);
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
    <div className="space-y-6 sm:space-y-8 font-sans max-w-5xl mx-auto py-2">
      {/* Title & Overview */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 px-1">
        <div>
          <h1 className="font-['Bebas_Neue'] text-4xl sm:text-5xl tracking-wide uppercase text-white leading-none">
            Weekly Forecast
          </h1>
          <p className="text-sm text-zinc-300 mt-1 max-w-xl">
            {total7DayDemand}h planned against {total7DayCapacity}h study capacity this week.
            {overloadedDaysCount > 0 ? (
              <span className="text-orange-400 font-medium">
                {' '}
                {overloadedDaysCount} day{overloadedDaysCount > 1 ? 's' : ''} {overloadedDaysCount === 1 ? 'exceeds' : 'exceed'} planned hours.
              </span>
            ) : (
              <span className="text-emerald-400 font-medium"> Workload looks balanced across all 7 days.</span>
            )}
          </p>
        </div>

        {onOpenCapacitySettings && (
          <button
            type="button"
            onClick={onOpenCapacitySettings}
            className="self-start sm:self-auto text-xs px-3.5 py-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-zinc-200 hover:text-white transition-colors cursor-pointer shrink-0"
          >
            Adjust study capacity
          </button>
        )}
      </div>

      {/* Large Glass Panel */}
      <Glass className="p-5 sm:p-7 space-y-6">
        {/* 7-Day Columns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
          {displayLoads.map((day, idx) => {
            const isSelected = selectedDayIndex === idx;
            const percent =
              day.capacityHours > 0
                ? Math.min(100, Math.round((day.demandHours / day.capacityHours) * 100))
                : 0;

            const statusConfig = {
              clear: {
                label: 'Clear',
                badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
                bar: 'bg-emerald-500',
              },
              filling: {
                label: 'Balanced',
                badge: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
                bar: 'bg-amber-400',
              },
              overloaded: {
                label: 'Heavy',
                badge: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
                bar: 'bg-orange-500',
              },
            }[day.status] || {
              label: 'Clear',
              badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
              bar: 'bg-emerald-500',
            };

            const isToday = idx === 0;

            return (
              <button
                key={day.dateStr}
                type="button"
                onClick={() => handleDayClick(idx)}
                aria-pressed={isSelected}
                className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between select-none ${
                  isSelected
                    ? 'border-white/40 bg-white/10 ring-2 ring-orange-500/60 shadow-lg'
                    : 'border-white/10 hover:border-white/20 bg-black/40 hover:bg-black/60'
                }`}
              >
                {/* Day Header */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span
                      className={`font-semibold tracking-tight ${
                        isSelected ? 'text-white' : 'text-zinc-200'
                      }`}
                    >
                      {isToday ? 'Today' : day.dayLabel.split(' ')[0]}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {day.dayLabel.split(' ')[1] || ''}
                    </span>
                  </div>

                  <span
                    className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${statusConfig.badge}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>

                {/* Hours & Meter */}
                <div className="mt-4 pt-2 border-t border-white/5 space-y-2">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="font-mono font-semibold text-white text-sm">
                      {day.demandHours}h
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono">
                      / {day.capacityHours}h
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${statusConfig.bar} rounded-full transition-all duration-300`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {/* Task count */}
                  <div className="text-[11px] text-zinc-400 flex items-center justify-between">
                    <span>{day.taskIds.length} {day.taskIds.length === 1 ? 'task' : 'tasks'}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Day Details & Delay Simulator */}
        {selectedDay && (
          <div className="mt-6 pt-6 border-t border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-orange-400" />
                <h3 className="text-base font-semibold text-white">
                  {selectedDayIndex === 0 ? 'Today' : selectedDay.dayLabel} Workload
                </h3>
                <span className="text-xs text-zinc-400 font-mono">
                  ({selectedDay.demandHours}h demand • {selectedDay.capacityHours}h capacity)
                </span>
              </div>
            </div>

            {/* Tasks list driving selected day */}
            {tasksDrivingSelectedDay.length > 0 ? (
              <div className="space-y-2.5">
                {tasksDrivingSelectedDay.map((task) => {
                  const isSimulated = simulatedTaskId === task.id;
                  return (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                        isSimulated
                          ? 'border-orange-500/60 bg-orange-950/20'
                          : 'border-white/10 bg-black/30 hover:border-white/20'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-white/10 border border-white/10 text-zinc-200 uppercase tracking-wider shrink-0">
                            {task.course}
                          </span>
                          <span className="font-medium text-sm text-white truncate">
                            {task.title}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 mt-1 flex items-center space-x-3">
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{task.estimatedHours}h effort</span>
                          </span>
                          <span>•</span>
                          <span className="capitalize">{task.priority} priority</span>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center space-x-2">
                        {isSimulated ? (
                          <button
                            type="button"
                            onClick={() => setSimulatedTaskId(null)}
                            className="px-3 py-1 rounded-full text-xs border border-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSimulatedTaskId(task.id);
                              setDelayDays(1);
                            }}
                            className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full border border-orange-500/40 text-orange-400 hover:bg-orange-500/10 text-xs font-medium transition-colors cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>What if I move this?</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 rounded-2xl border border-white/10 bg-black/20 text-center space-y-1">
                <p className="text-sm font-medium text-white">No tasks scheduled for this day</p>
                <p className="text-xs text-zinc-400">Your study hours on this day are completely open.</p>
              </div>
            )}

            {/* Delay Simulation Panel */}
            <Collapse isOpen={!!(simulation && taskToSimulate)}>
              {simulation && taskToSimulate && (
                <div className="p-4 sm:p-5 rounded-2xl border border-orange-500/40 bg-orange-950/20 space-y-4 shadow-inner mt-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-orange-500/20 pb-3">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-orange-400" />
                      <span className="text-sm font-semibold text-orange-300">
                        Reschedule consequence simulation
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-zinc-400 text-xs">Simulate shift:</span>
                      {[1, 2, 3].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setDelayDays(d)}
                          className={`px-2.5 py-1 rounded-full text-xs transition-colors cursor-pointer ${
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

                  <div className="flex items-start space-x-3 text-sm text-zinc-100">
                    <ArrowRight className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      {simulation.consequenceSentence}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setSimulatedTaskId(null)}
                      className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    >
                      Clear preview
                    </button>

                    {onUpdateTaskDueDate && (
                      <button
                        type="button"
                        onClick={handleApplyShift}
                        className="px-4 py-1.5 rounded-full bg-orange-500 hover:bg-orange-400 text-black font-semibold text-xs transition-colors cursor-pointer shadow-sm active:scale-95"
                      >
                        Reschedule task
                      </button>
                    )}
                  </div>
                </div>
              )}
            </Collapse>

            {/* Success toast */}
            {applySuccessMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{applySuccessMessage}</span>
              </div>
            )}
          </div>
        )}
      </Glass>
    </div>
  );
};
