import React, { useState } from 'react';
import { Calendar, ArrowRight, RotateCcw, Check, Sparkles } from 'lucide-react';
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
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(0);
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

  const selectedDay = displayLoads[selectedDayIndex] || displayLoads[0];
  const tasksDrivingSelectedDay = incompleteTasks.filter((t) => selectedDay.taskIds.includes(t.id));

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
    <div id="section-forecast" className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-white/10 pb-3 gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-orange-400">
              02 // 7-DAY WORKLOAD FORECAST
            </span>
            {simulation && (
              <span className="px-1.5 py-0.2 font-mono text-[9px] bg-orange-500/20 text-orange-300 border border-orange-500/40 uppercase">
                WHAT-IF SIMULATION ACTIVE
              </span>
            )}
          </div>
          <h2 className="font-display text-2xl sm:text-3xl text-white tracking-tight uppercase mt-1">
            Weekly Demand vs. Capacity
          </h2>
        </div>
        <p className="font-mono text-xs text-zinc-400 text-left sm:text-right">
          MONITOR BOTTLENECKS // SIMULATE DEFERRALS
        </p>
      </div>

      {/* 7-Day Forecast Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 font-mono">
        {displayLoads.map((day, idx) => {
          const isSelected = selectedDayIndex === idx;
          const percent = day.capacityHours > 0 ? Math.min(100, Math.round((day.demandHours / day.capacityHours) * 100)) : 0;

          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => setSelectedDayIndex(idx)}
              className={`p-3 text-left border transition-all cursor-pointer relative ${
                isSelected
                  ? 'border-orange-500 bg-orange-950/20 shadow-[0_0_15px_rgba(249,115,22,0.12)]'
                  : 'border-white/10 hover:border-white/20 bg-zinc-950/80'
              }`}
            >
              {/* Day Label & Badge */}
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold ${isSelected ? 'text-orange-400' : 'text-zinc-200'}`}>
                  {day.dayLabel}
                </span>
                <span
                  className={`text-[9px] px-1 py-0.2 border uppercase ${
                    day.status === 'overloaded'
                      ? 'border-red-500 text-red-400 bg-red-500/10'
                      : day.status === 'filling'
                      ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                      : 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                  }`}
                >
                  {day.status === 'overloaded' ? 'OVERLOAD' : day.status === 'filling' ? 'FILLING' : 'CLEAR'}
                </span>
              </div>

              {/* Demand vs Capacity Numbers */}
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-sm font-bold text-white">{day.demandHours}h</span>
                  <span className="text-[10px] text-zinc-500"> / {day.capacityHours}h</span>
                </div>
                <span className="text-[10px] text-zinc-400">{percent}%</span>
              </div>

              {/* Progress Bar Fill */}
              <div className="mt-2 w-full h-1 bg-black/60 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    day.status === 'overloaded'
                      ? 'bg-red-500'
                      : day.status === 'filling'
                      ? 'bg-amber-400'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              {/* Subtitle task count */}
              <div className="mt-2 text-[10px] text-zinc-500 flex items-center justify-between">
                <span>{day.taskIds.length} {day.taskIds.length === 1 ? 'task' : 'tasks'}</span>
                {isSelected && <span className="text-orange-400 font-bold">&bull;</span>}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Click-Through Details & What-If Simulator Panel */}
      <div className="border border-white/10 bg-zinc-950 p-4 sm:p-5 font-mono space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <Calendar className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-zinc-400 uppercase">
              TASKS DRIVING {selectedDay.dayLabel.toUpperCase()}:
            </span>
            <span className="text-white font-bold">{tasksDrivingSelectedDay.length} ACTIVE</span>
          </div>
          <span className="text-zinc-500 text-[11px]">
            {selectedDay.demandHours}h workload vs {selectedDay.capacityHours}h capacity
          </span>
        </div>

        {/* Tasks List Driving Selected Day */}
        {tasksDrivingSelectedDay.length > 0 ? (
          <div className="space-y-2">
            {tasksDrivingSelectedDay.map((task) => {
              const isSimulated = simulatedTaskId === task.id;
              return (
                <div
                  key={task.id}
                  className={`p-3 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors ${
                    isSimulated
                      ? 'border-orange-500 bg-orange-950/20'
                      : 'border-white/10 bg-black/30 hover:border-white/20'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-white text-xs uppercase truncate">
                        {task.title}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 border border-white/10 text-zinc-400">
                        {task.course}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-400 flex items-center space-x-2 mt-0.5">
                      <span>{task.estimatedHours}h effort</span>
                      <span>•</span>
                      <span className="uppercase text-orange-400/80">{task.priority} priority</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isSimulated ? (
                      <button
                        onClick={() => setSimulatedTaskId(null)}
                        type="button"
                        className="px-2.5 py-1 text-xs border border-white/20 text-zinc-300 hover:text-white"
                      >
                        Reset Delay
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSimulatedTaskId(task.id);
                          setDelayDays(1);
                        }}
                        type="button"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs border border-orange-500/40 hover:border-orange-500 text-orange-400 hover:text-orange-300 transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>What if I delay this?</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-4 text-center text-xs text-zinc-500">
            No coursework currently scheduled for {selectedDay.dayLabel}. This day is completely clear for rest or deep work.
          </div>
        )}

        {/* Live Simulation Consequence Box */}
        {simulation && taskToSimulate && (
          <div className="mt-4 p-4 border border-orange-500/50 bg-black space-y-3 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-2 gap-2 text-xs">
              <div className="flex items-center space-x-2 text-orange-400 font-bold uppercase">
                <ArrowRight className="w-3.5 h-3.5" />
                <span>WHAT-IF CONSEQUENCE SIMULATION</span>
              </div>
              <div className="flex items-center space-x-2 text-[11px]">
                <span className="text-zinc-500">DELAY BY:</span>
                {[1, 2, 3].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDelayDays(d)}
                    className={`px-2 py-0.5 border text-xs ${
                      delayDays === d
                        ? 'border-orange-500 bg-orange-500/20 text-orange-300 font-bold'
                        : 'border-white/10 text-zinc-400 hover:text-white'
                    }`}
                  >
                    +{d} Day{d === 1 ? '' : 's'}
                  </button>
                ))}
              </div>
            </div>

            {/* Exactly One Clear Consequence Sentence */}
            <p className={`text-xs sm:text-sm leading-relaxed ${
              simulation.missesDeadline
                ? 'text-red-300'
                : simulation.targetStatusAfter === 'overloaded'
                ? 'text-amber-300'
                : 'text-emerald-300'
            }`}>
              {simulation.consequenceSentence}
            </p>

            {/* Actions for simulation */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSimulatedTaskId(null)}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1.5"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear Simulation Preview</span>
              </button>

              {onUpdateTaskDueDate && (
                <button
                  type="button"
                  onClick={handleApplyShift}
                  className="px-3.5 py-1.5 bg-orange-500 hover:bg-orange-400 text-black font-bold uppercase text-xs tracking-wider transition-colors"
                >
                  Confirm &amp; Apply Schedule Shift
                </button>
              )}
            </div>
          </div>
        )}

        {/* Success toast */}
        {applySuccessMessage && (
          <div className="p-3 border border-emerald-500/40 bg-emerald-950/20 text-emerald-300 text-xs flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{applySuccessMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
