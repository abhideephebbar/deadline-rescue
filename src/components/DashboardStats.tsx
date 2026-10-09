import React from 'react';
import { CheckCircle2, Clock, AlertTriangle, Layers } from 'lucide-react';
import { Task } from '../types';
import { getUrgencyInfo } from '../utils/date';

interface DashboardStatsProps {
  tasks: Task[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ tasks }) => {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.completed).length;
  const activeTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Incomplete tasks analysis
  const incomplete = tasks.filter((t) => !t.completed);
  let overdueCount = 0;
  let dueWithin24hCount = 0;
  let dueWithin48hCount = 0;
  let deficitCount = 0;

  incomplete.forEach((task) => {
    const info = getUrgencyInfo(task.dueDateTime, task.estimatedHours);
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Total Tasks */}
      <div className="relative overflow-hidden p-5 rounded-xl bg-zinc-900/70 border border-zinc-800 backdrop-blur-sm transition-all hover:border-zinc-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Total Coursework
          </span>
          <div className="p-2 rounded-lg bg-zinc-800 text-brand-400 border border-zinc-700/60">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-white">{totalTasks}</span>
          <span className="text-xs text-zinc-400">
            ({activeTasks} pending, {completedTasks} done)
          </span>
        </div>
        <div className="mt-3 flex items-center space-x-2">
          <span className="inline-flex items-center text-[11px] font-medium text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded border border-brand-500/20">
            {activeTasks === 0 ? 'All clear' : `${activeTasks} remaining to finish`}
          </span>
        </div>
      </div>

      {/* 2. Completed Tasks */}
      <div className="relative overflow-hidden p-5 rounded-xl bg-zinc-900/70 border border-zinc-800 backdrop-blur-sm transition-all hover:border-zinc-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Completed Tasks
          </span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-emerald-400">{completedTasks}</span>
          <span className="text-xs text-zinc-400">
            / {totalTasks} finished
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-3">
          <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500 rounded-full"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] text-zinc-400">
            <span>{completionRate}% progress</span>
            <span>{completionRate === 100 ? '100% complete! 🎉' : 'Keep it up'}</span>
          </div>
        </div>
      </div>

      {/* 3. Upcoming Deadlines (<24h / <48h) */}
      <div className="relative overflow-hidden p-5 rounded-xl bg-zinc-900/70 border border-zinc-800 backdrop-blur-sm transition-all hover:border-zinc-700">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Upcoming Deadlines
          </span>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className="text-3xl font-extrabold text-amber-300">{dueWithin24hCount}</span>
          <span className="text-xs text-zinc-400">due in &lt;24 hours</span>
        </div>
        <div className="mt-3 flex items-center space-x-2">
          <span className="inline-flex items-center text-[11px] font-medium text-amber-300/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            {dueWithin48hCount} due within 48h
          </span>
        </div>
      </div>

      {/* 4. Attention & Danger Zone */}
      <div className={`relative overflow-hidden p-5 rounded-xl border backdrop-blur-sm transition-all ${
        overdueCount > 0 || deficitCount > 0
          ? 'bg-rose-950/20 border-rose-500/40'
          : 'bg-zinc-900/70 border-zinc-800'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Rescue Alerts
          </span>
          <div className={`p-2 rounded-lg border ${
            overdueCount > 0 || deficitCount > 0
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
              : 'bg-zinc-800 text-zinc-400 border-zinc-700/60'
          }`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline space-x-2">
          <span className={`text-3xl font-extrabold ${overdueCount > 0 ? 'text-rose-400' : 'text-zinc-200'}`}>
            {overdueCount + deficitCount}
          </span>
          <span className="text-xs text-zinc-400">
            critical issues
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {overdueCount > 0 && (
            <span className="text-[11px] font-semibold text-rose-300 bg-rose-500/20 px-2 py-0.5 rounded border border-rose-500/30">
              {overdueCount} Overdue
            </span>
          )}
          {deficitCount > 0 && (
            <span className="text-[11px] font-semibold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
              {deficitCount} Time Deficit
            </span>
          )}
          {overdueCount === 0 && deficitCount === 0 && (
            <span className="text-[11px] font-medium text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              ✓ No emergency delays
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
