import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Bookmark, 
  Check, 
  Trash2, 
  Clock, 
  AlertTriangle,
  FolderOpen,
  History,
  Activity
} from 'lucide-react';
import { Task } from '../types';
import { useStopwatch } from '../hooks/useStopwatch';

interface StopwatchProps {
  tasks: Task[];
}

type ConfirmActionType = 
  | 'reset_running' 
  | 'reset_paused' 
  | 'reset_unsaved_stopped' 
  | 'start_unsaved_stopped' 
  | 'save_zero_duration'
  | 'clear_history';

export const Stopwatch: React.FC<StopwatchProps> = ({ tasks }) => {
  const {
    status,
    displayElapsedMs,
    formattedTime,
    isSaved,
    selectedTaskId,
    setSelectedTaskId,
    savedSessions,
    totalTrackedTodayFormatted,
    start,
    pause,
    resume,
    stop,
    resetToIdle,
    saveSession,
    deleteSession,
    clearAllSessions,
  } = useStopwatch();

  // Confirmation modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: ConfirmActionType;
    title: string;
    message: string;
    confirmLabel: string;
    isDestructive?: boolean;
  }>({
    isOpen: false,
    type: 'reset_running',
    title: '',
    message: '',
    confirmLabel: '',
  });

  // Task selection details
  const activeTasks = tasks.filter((t) => !t.completed);
  const selectedTask = tasks.find((t) => t.id === selectedTaskId);

  // Handle Start Click
  const handleStartClick = () => {
    // If in stopped state and the previous session was not saved and has duration > 0, prompt
    if (status === 'stopped' && !isSaved && displayElapsedMs >= 1000) {
      setConfirmDialog({
        isOpen: true,
        type: 'start_unsaved_stopped',
        title: 'Start New Session?',
        message: 'Your previous stopped session has not been saved. Starting a new session will discard it.',
        confirmLabel: 'Discard & Start New',
        isDestructive: true,
      });
      return;
    }

    start();
  };

  // Handle Reset Click with strict state rules
  const handleResetClick = () => {
    if (status === 'idle') {
      resetToIdle();
      return;
    }

    if (status === 'running') {
      setConfirmDialog({
        isOpen: true,
        type: 'reset_running',
        title: 'Discard Active Session?',
        message: 'Timing is currently active. Resetting will stop the stopwatch and discard the current unsaved session.',
        confirmLabel: 'Discard & Reset',
        isDestructive: true,
      });
      return;
    }

    if (status === 'paused') {
      setConfirmDialog({
        isOpen: true,
        type: 'reset_paused',
        title: 'Discard Paused Session?',
        message: 'Resetting will discard your preserved elapsed time and return to 00:00:00.',
        confirmLabel: 'Discard & Reset',
        isDestructive: true,
      });
      return;
    }

    if (status === 'stopped') {
      if (!isSaved && displayElapsedMs > 0) {
        setConfirmDialog({
          isOpen: true,
          type: 'reset_unsaved_stopped',
          title: 'Discard Unsaved Session?',
          message: 'This session has not been saved yet. Resetting will clear the session without saving it to history.',
          confirmLabel: 'Discard & Reset',
          isDestructive: true,
        });
        return;
      }
      // If already saved or 0 duration, reset cleanly without prompt
      resetToIdle();
    }
  };

  // Handle Save Session Click
  const handleSaveSessionClick = () => {
    if (status !== 'stopped' || isSaved) return;

    // Check for zero-duration session
    if (displayElapsedMs < 1000) {
      setConfirmDialog({
        isOpen: true,
        type: 'save_zero_duration',
        title: 'Save Zero-Duration Session?',
        message: 'This session is under 1 second (00:00:00). Are you sure you want to log it to history?',
        confirmLabel: 'Confirm Save',
        isDestructive: false,
      });
      return;
    }

    executeSave();
  };

  const executeSave = () => {
    saveSession(
      selectedTask
        ? {
            id: selectedTask.id,
            title: selectedTask.title,
            course: selectedTask.course,
          }
        : undefined
    );
  };

  // Modal confirmation handler
  const handleConfirmAction = () => {
    const { type } = confirmDialog;
    setConfirmDialog((prev) => ({ ...prev, isOpen: false }));

    if (type === 'reset_running' || type === 'reset_paused' || type === 'reset_unsaved_stopped') {
      resetToIdle();
    } else if (type === 'start_unsaved_stopped') {
      start();
    } else if (type === 'save_zero_duration') {
      executeSave();
    } else if (type === 'clear_history') {
      clearAllSessions();
    }
  };

  // Prompt clear history
  const handleClearHistoryClick = () => {
    if (savedSessions.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      type: 'clear_history',
      title: 'Clear Session History?',
      message: 'This will permanently delete all previously saved stopwatch sessions. This action cannot be undone.',
      confirmLabel: 'Clear All History',
      isDestructive: true,
    });
  };

  // Status badge styling
  const statusBadges = {
    idle: { label: 'IDLE // READY', color: 'text-zinc-500 border-[#292929] bg-[#141414]' },
    running: { label: 'ACTIVE // TRACKING', color: 'text-orange-400 border-orange-500/40 bg-orange-500/10' },
    paused: { label: 'PAUSED // FROZEN', color: 'text-amber-400 border-amber-500/40 bg-amber-500/10' },
    stopped: { label: 'STOPPED // FINALIZED', color: 'text-white border-white/20 bg-white/5' },
  };

  return (
    <section id="section-stopwatch" className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-[#292929] pb-3 gap-2">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-orange-400 block">
            03 // CHRONO STOPWATCH
          </span>
          <h2 className="font-display text-3xl sm:text-4xl text-white tracking-tight uppercase">
            SESSION TIMEKEEPING
          </h2>
        </div>
        <div className="flex items-center space-x-3 font-mono text-xs text-zinc-400">
          <span className="hidden sm:inline text-zinc-500">TODAY'S TRACKED TIME:</span>
          <span className="text-white font-bold px-2 py-0.5 border border-[#292929] bg-[#141414]">
            {totalTrackedTodayFormatted}
          </span>
        </div>
      </div>

      {/* Main Stopwatch Chassis */}
      <div className="bg-[#090909] border border-[#292929] p-6 sm:p-8 rounded-lg shadow-2xl relative overflow-hidden">
        {/* Subtle background grid pattern */}
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left / Center: Display & Circular Frame */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center space-y-6">
            {/* Status Pill */}
            <div className="flex items-center space-x-2">
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono tracking-widest border uppercase ${statusBadges[status].color}`}>
                {statusBadges[status].label}
              </span>
              {status === 'running' && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
                </span>
              )}
            </div>

            {/* Subtle Circular Housing (Progress-Free!) */}
            <div className="relative flex items-center justify-center p-8 sm:p-12">
              {/* Minimalist circular housing with etched ticks */}
              <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-full border border-[#292929] bg-[#141414]/90 flex items-center justify-center relative shadow-inner">
                {/* 4 Cardinal crosshair tick marks */}
                <div className="absolute top-2 w-1.5 h-1.5 bg-[#292929]" />
                <div className="absolute bottom-2 w-1.5 h-1.5 bg-[#292929]" />
                <div className="absolute left-2 w-1.5 h-1.5 bg-[#292929]" />
                <div className="absolute right-2 w-1.5 h-1.5 bg-[#292929]" />

                {/* Subtle inner concentric ring */}
                <div className={`w-48 h-48 sm:w-60 sm:h-60 rounded-full border border-dashed transition-colors duration-500 flex items-center justify-center ${
                  status === 'running' ? 'border-orange-500/30' : 'border-[#292929]'
                }`}>
                  {/* Digital Elapsed Time Display */}
                  <div className="text-center select-none">
                    <div className="font-mono text-4xl sm:text-6xl font-bold tracking-tight text-white drop-shadow-md">
                      {formattedTime}
                    </div>
                    <div className="font-mono text-[10px] text-zinc-500 tracking-[0.25em] uppercase mt-2">
                      HOURS : MINS : SECS
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stopwatch Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
              {/* START (Available in Idle and Stopped) */}
              {(status === 'idle' || status === 'stopped') && (
                <button
                  onClick={handleStartClick}
                  type="button"
                  className="inline-flex items-center space-x-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-black font-mono text-xs uppercase tracking-widest font-bold rounded transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)] cursor-pointer active:scale-95"
                >
                  <Play className="w-4 h-4 fill-black stroke-black" />
                  <span>{status === 'stopped' ? 'Start New' : 'Start'}</span>
                </button>
              )}

              {/* PAUSE (Available only in Running) */}
              {status === 'running' && (
                <button
                  onClick={pause}
                  type="button"
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#141414] hover:bg-[#1f1f1f] text-white border border-[#292929] hover:border-zinc-500 font-mono text-xs uppercase tracking-widest rounded transition-all cursor-pointer active:scale-95"
                >
                  <Pause className="w-4 h-4 text-orange-400" />
                  <span>Pause</span>
                </button>
              )}

              {/* RESUME (Available only in Paused) */}
              {status === 'paused' && (
                <button
                  onClick={resume}
                  type="button"
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/50 font-mono text-xs uppercase tracking-widest font-semibold rounded transition-all cursor-pointer active:scale-95"
                >
                  <Play className="w-4 h-4 fill-orange-400 stroke-orange-400" />
                  <span>Resume</span>
                </button>
              )}

              {/* STOP (Available in Running or Paused) */}
              {(status === 'running' || status === 'paused') && (
                <button
                  onClick={stop}
                  type="button"
                  className="inline-flex items-center space-x-2 px-5 py-2.5 bg-[#141414] hover:bg-red-500/10 text-zinc-300 hover:text-red-400 border border-[#292929] hover:border-red-500/40 font-mono text-xs uppercase tracking-widest rounded transition-all cursor-pointer active:scale-95"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop</span>
                </button>
              )}

              {/* SAVE SESSION (Available only in Stopped) */}
              {status === 'stopped' && (
                <button
                  onClick={handleSaveSessionClick}
                  disabled={isSaved}
                  type="button"
                  className={`inline-flex items-center space-x-2 px-5 py-2.5 font-mono text-xs uppercase tracking-widest rounded transition-all border ${
                    isSaved
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 cursor-default'
                      : 'bg-[#141414] hover:bg-emerald-500/10 text-white hover:text-emerald-300 border-[#292929] hover:border-emerald-500/50 cursor-pointer active:scale-95'
                  }`}
                >
                  {isSaved ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
                      <span>Session Saved</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="w-4 h-4 text-orange-400" />
                      <span>Save Session</span>
                    </>
                  )}
                </button>
              )}

              {/* RESET (Available in Idle, Running, Paused, Stopped) */}
              <button
                onClick={handleResetClick}
                type="button"
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 bg-[#141414] hover:bg-[#1c1c1c] text-zinc-400 hover:text-white border border-[#292929] hover:border-zinc-600 font-mono text-xs uppercase tracking-widest rounded transition-all cursor-pointer"
                title="Reset stopwatch to 00:00:00"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Right: Task Association & Today's Summary */}
          <div className="lg:col-span-5 space-y-5 bg-[#141414] p-5 sm:p-6 rounded-lg border border-[#292929] font-mono">
            {/* Task Selector */}
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-widest text-zinc-400 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FolderOpen className="w-3.5 h-3.5 text-orange-400" />
                  <span>Associate With Task</span>
                </span>
                <span className="text-[10px] text-zinc-500">OPTIONAL</span>
              </label>

              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full px-3 py-2 bg-[#090909] border border-[#292929] text-white text-xs rounded focus:outline-none focus:border-orange-500 uppercase tracking-wide cursor-pointer"
              >
                <option value="">-- General Study / No Task --</option>
                {activeTasks.map((task) => (
                  <option key={task.id} value={task.id}>
                    [{task.course}] {task.title}
                  </option>
                ))}
              </select>

              {selectedTask ? (
                <div className="p-2.5 bg-[#090909] border border-[#292929] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-orange-400 font-semibold truncate">
                      {selectedTask.title}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-[#141414] border border-[#292929] text-zinc-300">
                      {selectedTask.course}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    Est. workload: {selectedTask.estimatedHours}h • Priority: {selectedTask.priority.toUpperCase()}
                  </div>
                </div>
              ) : (
                <p className="text-[10px] text-zinc-500">
                  Select a coursework deadline to attribute your tracked time to that assignment.
                </p>
              )}
            </div>

            {/* Diagnostic Stats Box */}
            <div className="pt-3 border-t border-[#292929] space-y-2 text-xs">
              <div className="flex items-center justify-between text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Today's Total Time:</span>
                </span>
                <span className="font-bold text-white font-mono">
                  {totalTrackedTodayFormatted}
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Saved Sessions Today:</span>
                </span>
                <span className="text-zinc-300 font-mono">
                  {
                    savedSessions.filter((s) => {
                      const d = new Date(s.createdAt);
                      const now = new Date();
                      return (
                        d.getFullYear() === now.getFullYear() &&
                        d.getMonth() === now.getMonth() &&
                        d.getDate() === now.getDate()
                      );
                    }).length
                  }{' '}
                  sessions
                </span>
              </div>

              <div className="flex items-center justify-between text-zinc-400">
                <span className="text-zinc-500">Timing Accuracy:</span>
                <span className="text-emerald-400 text-[10px]">
                  TIMESTAMP-ACCURATE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Previous Saved Sessions Accordion / Section */}
        <div className="mt-8 pt-6 border-t border-[#292929] font-mono">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] uppercase tracking-widest text-zinc-400 flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-orange-400" />
              <span>Session History ({savedSessions.length})</span>
            </span>

            {savedSessions.length > 0 && (
              <button
                onClick={handleClearHistoryClick}
                type="button"
                className="text-[10px] text-zinc-500 hover:text-red-400 uppercase tracking-wider transition-colors"
              >
                Clear History
              </button>
            )}
          </div>

          {savedSessions.length > 0 ? (
            <div className="max-h-60 overflow-y-auto divide-y divide-[#292929] border border-[#292929] bg-[#141414] rounded">
              {savedSessions.map((session) => {
                const recordedDate = new Date(session.createdAt);
                const timeString = recordedDate.toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const dateString = recordedDate.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div
                    key={session.id}
                    className="p-3 flex items-center justify-between text-xs hover:bg-[#1a1a1a] transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="font-bold text-orange-400 text-sm tracking-wide shrink-0">
                        {session.durationFormatted}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="text-white truncate font-medium">
                            {session.taskTitle || 'General Focus Session'}
                          </span>
                          {session.taskCourse && (
                            <span className="text-[9px] px-1.5 py-0.2 bg-[#090909] border border-[#292929] text-zinc-400 shrink-0">
                              {session.taskCourse}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {dateString} at {timeString}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteSession(session.id)}
                      type="button"
                      aria-label="Delete session"
                      className="p-1 text-zinc-600 hover:text-red-400 transition-colors ml-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center border border-[#292929] bg-[#141414]/50 text-xs text-zinc-500 rounded">
              No saved sessions yet. Time a study block and click "Save Session" when stopped.
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Reset, Unsaved Session, Zero Duration */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md font-mono">
          <div className="fixed inset-0" onClick={() => setConfirmDialog((p) => ({ ...p, isOpen: false }))} />

          <div className="relative w-full max-w-md bg-[#141414] border border-[#292929] p-6 z-10 space-y-4 rounded-lg shadow-2xl">
            <div className="flex items-center space-x-2 text-orange-400">
              <AlertTriangle className="w-4 h-4 text-orange-400" />
              <span className="text-[10px] uppercase tracking-[0.25em]">
                STOPWATCH // CONFIRMATION
              </span>
            </div>

            <div>
              <h3 className="font-display text-2xl text-white uppercase tracking-tight">
                {confirmDialog.title}
              </h3>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                {confirmDialog.message}
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#292929]">
              <button
                onClick={() => setConfirmDialog((p) => ({ ...p, isOpen: false }))}
                type="button"
                className="px-4 py-2 border border-[#292929] hover:border-zinc-600 text-zinc-400 hover:text-white text-xs uppercase tracking-wider rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                type="button"
                className={`px-4 py-2 text-xs uppercase tracking-widest font-bold rounded transition-colors cursor-pointer ${
                  confirmDialog.isDestructive
                    ? 'border border-red-500/80 bg-red-600 hover:bg-red-500 text-white'
                    : 'border border-orange-500 bg-orange-500 hover:bg-orange-400 text-black'
                }`}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
