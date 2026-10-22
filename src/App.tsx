import { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { StatusSentence } from './components/StatusSentence';
import { NowCard } from './components/NowCard';
import { NextUpList } from './components/NextUpList';
import { ForecastStrip } from './components/ForecastStrip';
import { TaskList } from './components/TaskList';
import { MiniTimerBar } from './components/MiniTimerBar';
import { EmptyState } from './components/EmptyState';
import { DemoTaskBanner } from './components/DemoTaskBanner';
import { TaskFormModal } from './components/TaskFormModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { CapacitySettingsModal } from './components/CapacitySettingsModal';
import { TriageModal } from './components/TriageModal';
import { ResetWeekModal } from './components/ResetWeekModal';
import { InstructorEmailModal } from './components/InstructorEmailModal';
import { ImportTasksModal } from './components/ImportTasksModal';
import { useTasks } from './hooks/useTasks';
import { useCapacity } from './hooks/useCapacity';
import { useStopwatch } from './hooks/useStopwatch';
import { getRemainingEffortMap } from './utils/stopwatchIntegration';
import { getCategoryCalibrations } from './utils/calibration';
import { getSmartRecommendations } from './utils/ranking';
import { getStatusSentence } from './utils/statusSentence';
import { isSampleTaskSet, isSampleBannerDismissed, dismissSampleBanner } from './utils/sampleDetection';
import { Task, Priority, TaskCategory } from './types';
import { AlertTriangle } from 'lucide-react';

export function App() {
  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    resetToSampleTasks,
    clearAllTasks,
    replaceTasks,
  } = useTasks();

  const {
    settings: capacitySettings,
    totalWeeklyCapacityHours,
    updateDailyHours,
    addBlockedSlot,
    removeBlockedSlot,
    resetToDefaults: resetCapacityDefaults,
  } = useCapacity();

  const stopwatch = useStopwatch();

  // Subtract logged stopwatch time to determine real remaining effort for ranking & display
  const remainingEffortMap = useMemo(
    () => getRemainingEffortMap(tasks, stopwatch.savedSessions),
    [tasks, stopwatch.savedSessions]
  );

  // Calibrate per-category estimate accuracy from completed tasks with logged sessions
  const calibrations = useMemo(
    () => getCategoryCalibrations(tasks, stopwatch.savedSessions),
    [tasks, stopwatch.savedSessions]
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCapacityModalOpen, setIsCapacityModalOpen] = useState(false);
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const [isResetWeekModalOpen, setIsResetWeekModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [emailTaskTarget, setEmailTaskTarget] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  // Global 30-second ticker to keep deadline countdowns, buffers, and urgency ranks fresh live
  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Compute smart recommendations
  const { topRecommendation, rankedQueue } = useMemo(
    () => getSmartRecommendations(tasks, currentTime, remainingEffortMap, capacitySettings),
    [tasks, currentTime, remainingEffortMap, capacitySettings]
  );

  // Following 2-3 tasks for "Next up"
  const nextUpQueue = useMemo(
    () => rankedQueue.slice(1, 4),
    [rankedQueue]
  );

  // Plain supportive status sentence
  const statusSentence = useMemo(
    () => getStatusSentence(tasks, capacitySettings, currentTime),
    [tasks, capacitySettings, currentTime]
  );

  const [isDemoBannerDismissedState, setIsDemoBannerDismissedState] = useState(() => isSampleBannerDismissed());

  const showDemoBanner = useMemo(() => {
    return !isDemoBannerDismissedState && isSampleTaskSet(tasks);
  }, [isDemoBannerDismissedState, tasks]);

  const handleClearDemoTasks = () => {
    clearAllTasks();
    dismissSampleBanner();
    setIsDemoBannerDismissedState(true);
  };

  const handleKeepDemoTasks = () => {
    dismissSampleBanner();
    setIsDemoBannerDismissedState(true);
  };

  const handleOpenAddModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleStartNow = (task: Task) => {
    stopwatch.setSelectedTaskId(task.id);
    if (stopwatch.status === 'idle' || stopwatch.status === 'stopped') {
      stopwatch.start();
    }
    const nowCardElement = document.getElementById('now-card');
    if (nowCardElement) {
      nowCardElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNotToday = (task: Task) => {
    const currentDue = new Date(task.dueDateTime).getTime();
    const deferByMs = 24 * 60 * 60 * 1000;
    const newDueTime = Math.max(currentDue + deferByMs, currentTime.getTime() + deferByMs);
    updateTask(task.id, { dueDateTime: new Date(newDueTime).toISOString() });
  };

  const handleModalSubmit = (data: {
    title: string;
    course: string;
    dueDateTime: string;
    estimatedHours: number;
    priority: Priority;
    category: TaskCategory;
    notes?: string;
  }) => {
    if (editingTask) {
      updateTask(editingTask.id, data);
    } else {
      addTask(data);
    }
  };

  const handleImportTasks = (
    newTasks: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completed'>[]
  ) => {
    newTasks.forEach((t) => addTask(t));
  };

  const handleStatusAction = (actionType: 'plan' | 'reset') => {
    if (actionType === 'reset') {
      setIsResetWeekModalOpen(true);
    } else {
      setIsTriageModalOpen(true);
    }
  };

  const candidateTask = tasks.find((t) => t.id === deleteCandidateId);

  // Active task for mini-timer
  const activeTimerTask = useMemo(() => {
    if (stopwatch.selectedTaskId) {
      return tasks.find((t) => t.id === stopwatch.selectedTaskId) || null;
    }
    return topRecommendation?.task || null;
  }, [stopwatch.selectedTaskId, tasks, topRecommendation]);

  return (
    <div className="min-h-screen bg-[#090909] text-zinc-100 font-sans selection:bg-orange-500 selection:text-black antialiased transition-colors">
      {/* Slim Header */}
      <Header
        onOpenAddTask={handleOpenAddModal}
        onOpenAsk={() => {
          // Placeholder for Phase 6 Ask assistant
          console.info('Ask assistant opened');
        }}
        onOpenCapacity={() => setIsCapacityModalOpen(true)}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenResetWeek={() => setIsResetWeekModalOpen(true)}
        onTakeTour={() => {
          // Placeholder for Phase 5 Product Tour
          console.info('Tour requested');
        }}
        onLoadDemoData={resetToSampleTasks}
        onClearEverything={() => setIsClearConfirmOpen(true)}
        weeklyCapacityHours={totalWeeklyCapacityHours}
      />

      {/* Main Container: Mobile-first 375px -> 768px */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Optional Demo Tasks Detection Banner */}
        {showDemoBanner && (
          <DemoTaskBanner
            onClear={handleClearDemoTasks}
            onKeep={handleKeepDemoTasks}
          />
        )}

        {tasks.length === 0 ? (
          /* Clean Empty State when user has 0 tasks */
          <EmptyState
            onOpenAddTask={handleOpenAddModal}
            onOpenImport={() => setIsImportModalOpen(true)}
            onTakeTour={resetToSampleTasks}
          />
        ) : (
          <>
            {/* 1. Status Sentence replacing the 4 stat cards */}
            <section aria-label="Current status">
              <StatusSentence
                sentence={statusSentence}
                onAction={handleStatusAction}
              />
            </section>

            {/* 2. Hero "Now" Card */}
            <section id="now-card" aria-label="Recommended task">
              <NowCard
                recommendation={topRecommendation}
                onToggleComplete={toggleComplete}
                onNotToday={handleNotToday}
                onEmailInstructor={(task) => setEmailTaskTarget(task)}
                stopwatch={{
                  status: stopwatch.status,
                  displayElapsedMs: stopwatch.displayElapsedMs,
                  formattedTime: stopwatch.formattedTime,
                  start: () => {
                    if (topRecommendation?.task) {
                      stopwatch.setSelectedTaskId(topRecommendation.task.id);
                    }
                    stopwatch.start();
                  },
                  pause: stopwatch.pause,
                  resume: stopwatch.resume,
                  stop: stopwatch.stop,
                  saveSession: stopwatch.saveSession,
                  resetToIdle: stopwatch.resetToIdle,
                  selectedTaskId: stopwatch.selectedTaskId,
                  setSelectedTaskId: stopwatch.setSelectedTaskId,
                  isSaved: stopwatch.isSaved,
                }}
              />
            </section>

            {/* 3. Next Up list */}
            {nextUpQueue.length > 0 && (
              <section aria-label="Next tasks">
                <NextUpList
                  recommendations={nextUpQueue}
                  onStartTask={handleStartNow}
                  onToggleComplete={toggleComplete}
                />
              </section>
            )}

            {/* 4. This Week Compact Forecast Strip with Consequence Simulator */}
            <section aria-label="Weekly workload forecast">
              <ForecastStrip
                tasks={tasks}
                capacitySettings={capacitySettings}
                now={currentTime}
                onUpdateTaskDueDate={(taskId, newDueDate) => {
                  updateTask(taskId, { dueDateTime: newDueDate });
                }}
              />
            </section>

            {/* 5. Collapsible All Tasks List */}
            <section aria-label="All coursework">
              <TaskList
                tasks={tasks}
                onToggleComplete={toggleComplete}
                onEdit={handleOpenEditModal}
                onDelete={(id) => setDeleteCandidateId(id)}
                onOpenAddTask={handleOpenAddModal}
                now={currentTime}
                capacitySettings={capacitySettings}
                remainingEffortMap={remainingEffortMap}
                onEmailInstructor={(task) => setEmailTaskTarget(task)}
                onOpenImport={() => setIsImportModalOpen(true)}
                isInitiallyExpanded={false}
              />
            </section>
          </>
        )}
      </main>

      {/* Floating Mini-Timer Bar (Visible when timer is active or paused) */}
      <MiniTimerBar
        activeTask={activeTimerTask}
        status={stopwatch.status}
        formattedTime={stopwatch.formattedTime}
        onPause={stopwatch.pause}
        onResume={stopwatch.resume}
        onStop={stopwatch.stop}
        onScrollToNow={() => {
          document.getElementById('now-card')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Task Form Modal */}
      <TaskFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleModalSubmit}
        initialTask={editingTask}
        calibrations={calibrations}
      />

      {/* Delete Single Task Confirm Modal */}
      <DeleteConfirmModal
        isOpen={!!deleteCandidateId}
        onClose={() => setDeleteCandidateId(null)}
        onConfirm={() => {
          if (deleteCandidateId) {
            deleteTask(deleteCandidateId);
            setDeleteCandidateId(null);
          }
        }}
        taskTitle={candidateTask ? candidateTask.title : ''}
      />

      {/* Clear Everything Confirm Modal */}
      {isClearConfirmOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
        >
          <div className="bg-[#141414] border border-white/10 rounded-xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h2 id="clear-title" className="text-base font-semibold text-white">
                Clear all tasks?
              </h2>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              This will remove all your saved assignments and study sessions from this browser. This cannot be undone.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-3.5 py-1.5 text-xs text-zinc-300 hover:text-white rounded border border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAllTasks();
                  setIsClearConfirmOpen(false);
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-500 rounded transition-colors cursor-pointer"
              >
                Clear everything
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Capacity Settings Modal */}
      <CapacitySettingsModal
        isOpen={isCapacityModalOpen}
        onClose={() => setIsCapacityModalOpen(false)}
        settings={capacitySettings}
        onUpdateDailyHours={updateDailyHours}
        onAddBlockedSlot={addBlockedSlot}
        onRemoveBlockedSlot={removeBlockedSlot}
        onResetDefaults={resetCapacityDefaults}
        tasks={tasks}
        now={currentTime}
      />

      {/* Tactical Emergency Triage Modal */}
      <TriageModal
        isOpen={isTriageModalOpen}
        onClose={() => setIsTriageModalOpen(false)}
        tasks={tasks}
        capacitySettings={capacitySettings}
        now={currentTime}
        remainingEffortMap={remainingEffortMap}
        onStartNow={handleStartNow}
        onToggleComplete={toggleComplete}
      />

      {/* Reset My Week Recovery Modal */}
      <ResetWeekModal
        isOpen={isResetWeekModalOpen}
        onClose={() => setIsResetWeekModalOpen(false)}
        tasks={tasks}
        capacitySettings={capacitySettings}
        now={currentTime}
        onConfirmReset={(updatedTasks) => replaceTasks(updatedTasks)}
      />

      {/* Instructor Outreach Recovery Modal */}
      <InstructorEmailModal
        isOpen={!!emailTaskTarget}
        onClose={() => setEmailTaskTarget(null)}
        task={emailTaskTarget}
        onMarkSubmitted={(taskId) => {
          toggleComplete(taskId);
          setEmailTaskTarget(null);
        }}
      />

      {/* Paste-to-Import Modal */}
      <ImportTasksModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportTasks={handleImportTasks}
        now={currentTime}
      />
    </div>
  );
}

export default App;
