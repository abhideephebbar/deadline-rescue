import React from 'react';
import { Task, CapacitySettings, TaskCategory } from '../types';
import { getUrgencyInfo } from '../utils/date';
import { calculateDailyLoads } from '../utils/capacity';
import { getStarterStartsThisWeek } from '../utils/starterStats';
import { CategoryCalibration } from '../utils/calibration';

interface DashboardStatsProps {
  tasks: Task[];
  now?: Date;
  capacitySettings?: CapacitySettings;
  onOpenCapacitySettings?: () => void;
  onOpenTriageModal?: () => void;
  onOpenResetWeek?: () => void;
  calibrations?: Record<TaskCategory, CategoryCalibration | null> | null;
  onResetCalibration?: (category?: TaskCategory) => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  tasks,
  now = new Date(),
  capacitySettings,
  onOpenCapacitySettings,
  onOpenTriageModal,
  onOpenResetWeek,
  calibrations,
  onResetCalibration,
}) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const activeTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const starterStartsThisWeek = getStarterStartsThisWeek(now);

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

          <div className="flex items-center gap-2 shrink-0">
            {onOpenTriageModal && (todayLoad.status === 'overloaded' || deficitCount > 0) && (
              <button
                onClick={onOpenTriageModal}
                type="button"
                className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500 hover:text-black border border-red-500/50 text-red-300 font-bold text-[11px] uppercase tracking-wider transition-colors cursor-pointer"
              >
                🚨 Launch Triage Mode
              </button>
            )}

            {onOpenCapacitySettings && (
              <button
                onClick={onOpenCapacitySettings}
                type="button"
                className="text-[11px] text-zinc-400 hover:text-orange-400 transition-colors uppercase tracking-wider cursor-pointer"
              >
                [Adjust Working Hours &rarr;]
              </button>
            )}
          </div>
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

        {/* Metric 04: Rescue Alerts & Recovery Radar */}
        <div className={`group relative border p-4 sm:p-5 transition-all ${
          overdueCount > 0 || deficitCount > 0
            ? 'border-orange-500/50 bg-orange-950/20'
            : 'border-white/10 hover:border-white/20 bg-zinc-950/70'
        }`}>
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            <span>[ 04 ] RECOVERY RADAR</span>
            <span className={overdueCount > 0 || deficitCount > 0 ? 'text-orange-400 font-bold' : 'text-zinc-400'}>
              {overdueCount > 0 ? 'ATTENTION NEEDED' : deficitCount > 0 ? 'SCHEDULE TIGHT' : 'NOMINAL'}
            </span>
          </div>

          <div className="mt-3 flex items-baseline justify-between">
            <span className={`font-display text-4xl sm:text-5xl tracking-tight ${
              overdueCount > 0 || deficitCount > 0 ? 'text-orange-400' : 'text-zinc-200'
            }`}>
              {overdueCount + deficitCount < 10 ? `0${overdueCount + deficitCount}` : overdueCount + deficitCount}
            </span>
            <span className="font-mono text-xs text-zinc-400">RECOVERY ITEMS</span>
          </div>

          <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-1 font-mono text-[10px]">
            <div className="flex flex-wrap gap-1">
              {overdueCount > 0 && (
                <span className="text-amber-400 border border-amber-500/30 px-1.5 py-0.5 bg-amber-500/10">
                  {overdueCount} PAST DEADLINE
                </span>
              )}
              {deficitCount > 0 && (
                <span className="text-orange-400 border border-orange-500/30 px-1.5 py-0.5 bg-orange-500/10">
                  {deficitCount} TIME DEFICIT
                </span>
              )}
              {overdueCount === 0 && deficitCount === 0 && (
                <span className="text-emerald-400">✓ SCHEDULE BALANCED</span>
              )}
            </div>

            {overdueCount > 0 && onOpenResetWeek && (
              <button
                onClick={onOpenResetWeek}
                type="button"
                className="text-[10px] text-orange-400 hover:text-white underline underline-offset-2 uppercase tracking-wider font-bold cursor-pointer"
              >
                Reset My Week &rarr;
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Your Estimate Accuracy Card */}
      {(() => {
        const activeCalibrations = (Object.keys(calibrations || {}) as TaskCategory[])
          .map((cat) => calibrations?.[cat])
          .filter((c): c is CategoryCalibration => Boolean(c && c.sampleCount >= 3 && c.ratio > 0));

        if (activeCalibrations.length === 0) return null;

        return (
          <div className="border border-white/10 bg-zinc-950/70 p-4 font-mono text-xs space-y-2.5">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-400 border-b border-white/10 pb-1.5">
              <span className="text-orange-400 font-bold">[ YOUR ESTIMATE ACCURACY ]</span>
              <span>CALIBRATED FORECASTS</span>
            </div>
            <div className="space-y-2 pt-1">
              {activeCalibrations.map((cal) => (
                <div
                  key={cal.category}
                  className="flex flex-col sm:flex-row sm:items-center justify-between text-zinc-300 text-[11px] gap-1"
                >
                  <span>
                    <strong className="text-white capitalize">{cal.category}s:</strong> usually take{' '}
                    <strong className="text-orange-400 font-semibold">{cal.ratio}x</strong> your estimate (based on {cal.sampleCount} completed {cal.category}s).
                  </span>
                  <span className="text-zinc-500 text-[10px]">Plans auto-calibrated</span>
                </div>
              ))}
            </div>
            {onResetCalibration && (
              <div className="pt-1.5 border-t border-white/5 flex justify-end">
                <button
                  type="button"
                  onClick={() => onResetCalibration()}
                  className="text-[10px] text-zinc-400 hover:text-orange-400 transition-colors uppercase tracking-wider cursor-pointer"
                >
                  [Reset calibration &rarr;]
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {starterStartsThisWeek > 0 && (
        <div className="pt-1 px-1 font-mono text-xs text-zinc-400">
          You've started {starterStartsThisWeek} {starterStartsThisWeek === 1 ? 'hard thing' : 'hard things'} this week.
        </div>
      )}
    </div>
  );
};
