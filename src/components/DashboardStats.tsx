import React from 'react';
import { Task, CapacitySettings } from '../types';
import { getUrgencyInfo } from '../utils/date';
import { calculateDailyLoads } from '../utils/capacity';

interface DashboardStatsProps {
  tasks: Task[];
  now?: Date;
  capacitySettings?: CapacitySettings;
  onOpenCapacitySettings?: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  tasks,
  now = new Date(),
  capacitySettings,
  onOpenCapacitySettings,
}) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const activeTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Compute daily load for today
  const dailyLoads = calculateDailyLoads(tasks, capacitySettings, now, 1);
  const todayLoad = dailyLoads[0];

  // Incomplete tasks telemetry
  const incomplete = tasks.filter((t) => !t.completed);
  let overdueCount = 0;
  let dueWithin24hCount = 0;
  let dueWithin48hCount = 0;
  let deficitCount = 0;

  incomplete.forEach((task) => {
    const info = getUrgencyInfo(task.dueDateTime, task.estimatedHours, now, capacitySettings);
    if (info.isOverdue) {
      overdueCount++;
    } else {
      if (info.hoursRemaining <= 24) {
        dueWithin24hCount++;
      }
      if (info.hoursRemaining <= 48) {
        dueWithin48hCount++;
      }
      if (info.hasTimeDeficit) {
        deficitCount++;
      }
    }
  });

  return (
    <div id="section-telemetry" className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-orange-400">
          02 // TELEMETRY & WORKLOAD
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          SEMESTER MONITOR
        </span>
      </div>

      {/* Today's Capacity vs Demand Live Telemetry Bar */}
      {todayLoad && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 border border-white/10 bg-zinc-950/80 font-mono text-xs gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-orange-400 font-bold uppercase tracking-wider">[ CAPACITY BALANCE ]</span>
            <span className="text-zinc-300">
              Today's Demand: <strong className="text-white">{todayLoad.demandHours}h</strong> / Available Capacity:{' '}
              <strong className="text-white">{todayLoad.capacityHours}h</strong>
            </span>
            <span
              className={`px-2 py-0.5 text-[10px] border uppercase font-bold ${
                todayLoad.status === 'overloaded'
                  ? 'border-red-500/50 text-red-400 bg-red-500/10'
                  : todayLoad.status === 'filling'
                  ? 'border-amber-500/50 text-amber-400 bg-amber-500/10'
                  : 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10'
              }`}
            >
              {todayLoad.status === 'overloaded'
                ? `OVERLOADED (+${(todayLoad.demandHours - todayLoad.capacityHours).toFixed(1)}h)`
                : todayLoad.status === 'filling'
                ? `FILLING UP (${todayLoad.remainingCapacity}h REMAINING)`
                : `CLEAR (${todayLoad.remainingCapacity}h REMAINING)`}
            </span>
          </div>

          {onOpenCapacitySettings && (
            <button
              onClick={onOpenCapacitySettings}
              type="button"
              className="text-[11px] text-zinc-400 hover:text-orange-400 transition-colors uppercase tracking-wider shrink-0 cursor-pointer"
            >
              [Adjust Capacity &amp; Blocked Hours &rarr;]
            </button>
          )}
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 01: Total Coursework */}
        <div className="group relative border border-white/10 hover:border-white/20 bg-zinc-950/70 p-4 sm:p-5 transition-all">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            <span>[ 01 ] TOTAL RADAR</span>
            <span className="text-zinc-400">{activeTasks} ACTIVE</span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-display text-4xl sm:text-5xl text-white tracking-tight">
              {totalTasks < 10 ? `0${totalTasks}` : totalTasks}
            </span>
            <span className="font-mono text-xs text-zinc-400">ASSIGNMENTS</span>
          </div>

          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between font-mono text-[10px] text-zinc-400">
            <span>STATUS:</span>
            <span className="text-zinc-300 font-medium">{activeTasks === 0 ? 'QUEUE CLEAR' : `${activeTasks} REMAINING`}</span>
          </div>
        </div>

        {/* Metric 02: Completed Rate */}
        <div className="group relative border border-white/10 hover:border-white/20 bg-zinc-950/70 p-4 sm:p-5 transition-all">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            <span>[ 02 ] RESOLVED</span>
            <span className="text-emerald-400">{completionRate}% COMPLETE</span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-display text-4xl sm:text-5xl text-emerald-400 tracking-tight">
              {completedTasks < 10 ? `0${completedTasks}` : completedTasks}
            </span>
            <span className="font-mono text-xs text-zinc-400">/ {totalTasks} FINISHED</span>
          </div>

          <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
            <div className="w-full bg-zinc-900 h-1 overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <div className="flex justify-between font-mono text-[10px] text-zinc-400">
              <span>EFFICIENCY</span>
              <span>{completionRate === 100 ? 'MAXIMUM' : `${completionRate}%`}</span>
            </div>
          </div>
        </div>

        {/* Metric 03: Upcoming Deadlines */}
        <div className="group relative border border-white/10 hover:border-orange-500/40 bg-zinc-950/70 p-4 sm:p-5 transition-all">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            <span>[ 03 ] PROXIMITY</span>
            <span className="text-orange-400">&lt;24H WINDOW</span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <span className="font-display text-4xl sm:text-5xl text-orange-400 tracking-tight">
              {dueWithin24hCount < 10 ? `0${dueWithin24hCount}` : dueWithin24hCount}
            </span>
            <span className="font-mono text-xs text-zinc-400">DUE SOON</span>
          </div>

          <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between font-mono text-[10px] text-zinc-400">
            <span>48H HORIZON:</span>
            <span className="text-zinc-300 font-medium">{dueWithin48hCount} COMMITMENTS</span>
          </div>
        </div>

        {/* Metric 04: Rescue Alerts & Danger Zone */}
        <div className={`group relative border p-4 sm:p-5 transition-all ${
          overdueCount > 0 || deficitCount > 0
            ? 'border-red-500/50 bg-red-950/20'
            : 'border-white/10 hover:border-white/20 bg-zinc-950/70'
        }`}>
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            <span>[ 04 ] DANGER ZONE</span>
            <span className={overdueCount > 0 || deficitCount > 0 ? 'text-red-400 font-bold' : 'text-zinc-400'}>
              {overdueCount > 0 ? 'OVERDUE CRITICAL' : deficitCount > 0 ? 'DEFICIT CRITICAL' : 'NOMINAL'}
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <span className={`font-display text-4xl sm:text-5xl tracking-tight ${
              overdueCount > 0 || deficitCount > 0 ? 'text-red-400' : 'text-zinc-200'
            }`}>
              {overdueCount + deficitCount < 10 ? `0${overdueCount + deficitCount}` : overdueCount + deficitCount}
            </span>
            <span className="font-mono text-xs text-zinc-400">HAZARDS</span>
          </div>

          <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-1 font-mono text-[10px]">
            {overdueCount > 0 && (
              <span className="text-red-400 border border-red-500/30 px-1.5 py-0.5 bg-red-500/10">
                {overdueCount} OVERDUE
              </span>
            )}
            {deficitCount > 0 && (
              <span className="text-orange-400 border border-orange-500/30 px-1.5 py-0.5 bg-orange-500/10">
                {deficitCount} TIME DEFICIT
              </span>
            )}
            {overdueCount === 0 && deficitCount === 0 && (
              <span className="text-emerald-400">✓ BUFFER INTEGRITY SECURE</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
