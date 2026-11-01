import React from 'react';
import { GraduationCap, Plus, ChevronRight } from 'lucide-react';
import { SubjectAttendance } from '../types';
import { calculateAttendanceStats, sortSubjectsByRisk } from '../utils/attendanceMath';

interface AttendanceCardRowProps {
  subjects: SubjectAttendance[];
  onSelectSubject: (subject: SubjectAttendance) => void;
  onAddNewSubject: () => void;
}

export const AttendanceCardRow: React.FC<AttendanceCardRowProps> = ({
  subjects,
  onSelectSubject,
  onAddNewSubject,
}) => {
  const sorted = sortSubjectsByRisk(subjects);

  if (subjects.length === 0) {
    return (
      <div id="tour-attendance" className="rounded-2xl border border-white/[0.08] bg-[rgba(16,16,20,0.6)] backdrop-blur-xl p-4 sm:p-5 flex items-center justify-between gap-4">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Attendance Guard
            </h3>
            <p className="text-xs text-zinc-400 truncate mt-0.5">
              No subjects yet. Add one and always know your skip headroom.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onAddNewSubject}
          className="px-3.5 py-1.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold tracking-wide transition-colors cursor-pointer shrink-0 flex items-center space-x-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add subject</span>
        </button>
      </div>
    );
  }

  return (
    <div id="tour-attendance" className="rounded-2xl border border-white/[0.08] bg-[rgba(16,16,20,0.6)] backdrop-blur-xl p-4 sm:p-5 space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GraduationCap className="w-4 h-4 text-orange-400" />
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Attendance Guard
          </h3>
        </div>

        <button
          type="button"
          onClick={onAddNewSubject}
          className="text-xs text-orange-400 hover:text-orange-300 flex items-center space-x-1 cursor-pointer transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add</span>
        </button>
      </div>

      {/* Horizontal row of compact subject cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {sorted.map((subject) => {
          const stats = calculateAttendanceStats(subject);
          return (
            <button
              key={subject.id}
              type="button"
              onClick={() => onSelectSubject(subject)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 hover:border-white/30 ${
                stats.unrecoverable
                  ? 'border-red-500/30 bg-red-950/20'
                  : stats.isBelowThreshold
                  ? 'border-amber-500/35 bg-amber-950/20 shadow-sm shadow-amber-500/5'
                  : 'border-white/10 bg-black/40 hover:bg-black/60'
              }`}
            >
              <div className="flex items-start justify-between gap-2 w-full">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-1.5 truncate">
                    {subject.code && (
                      <span className="text-[10px] font-mono font-semibold px-1 py-0.2 rounded bg-white/10 text-white shrink-0">
                        {subject.code}
                      </span>
                    )}
                    <span className="text-xs font-medium text-white truncate" title={subject.name}>
                      {subject.name}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-sm font-bold font-mono shrink-0 ${
                    stats.isBelowThreshold ? 'text-amber-400' : 'text-zinc-200'
                  }`}
                >
                  {stats.formattedPct}
                </span>
              </div>

              {/* ONE plain number label */}
              <div className="flex items-center justify-between text-[11px] w-full pt-1 border-t border-white/5">
                <span
                  className={`font-medium ${
                    stats.unrecoverable
                      ? 'text-red-300'
                      : stats.isBelowThreshold
                      ? 'text-amber-300'
                      : stats.canMiss > 0
                      ? 'text-emerald-400'
                      : 'text-zinc-400'
                  }`}
                >
                  {stats.summaryText}
                </span>
                <ChevronRight className="w-3 h-3 text-zinc-500" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
