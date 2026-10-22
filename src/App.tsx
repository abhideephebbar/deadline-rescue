import { useState, useEffect, useMemo } from 'react';
import { MotionConfig, LazyMotion, domAnimation, AnimatePresence, m } from 'motion/react';
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
import { CatchUpModal } from './components/CatchUpModal';
import { ProductTour } from './components/ProductTour';
import { AskModal } from './components/AskModal';
import { Modal } from './components/ui/Modal';
import { useTasks } from './hooks/useTasks';
import { useCapacity } from './hooks/useCapacity';
import { useStopwatch } from './hooks/useStopwatch';
import { getRemainingEffortMap } from './utils/stopwatchIntegration';
import { getCategoryCalibrations } from './utils/calibration';
import { getSmartRecommendations } from './utils/ranking';
import { getStatusSentence } from './utils/statusSentence';
import { isSampleTaskSet, isSampleBannerDismissed, dismissSampleBanner } from './utils/sampleDetection';
import { generateTourDemoTasks } from './utils/tour';
import { Task, Priority, TaskCategory } from './types';
import { AlertTriangle, Compass } from 'lucide-react';

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

  const [isTourActive, setIsTourActive] = useState(false);
  const tourDemoTasks = useMemo(() => generateTourDemoTasks(), []);
  const displayTasks = isTourActive ? tourDemoTasks : tasks;

  // Subtract logged stopwatch time to determine real remaining effort for ranking & display
  const remainingEffortMap = useMemo(
    () => getRemainingEffortMap(displayTasks, stopwatch.savedSessions),
    [displayTasks, stopwatch.savedSessions]
  );

  // Calibrate per-category estimate accuracy from completed tasks with logged sessions
  const calibrations = useMemo(
    () => getCategoryCalibrations(displayTasks, stopwatch.savedSessions),
    [displayTasks, stopwatch.savedSessions]
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCapacityModalOpen, setIsCapacityModalOpen] = useState(false);
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const [isResetWeekModalOpen, setIsResetWeekModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isCatchUpModalOpen, setIsCatchUpModalOpen] = useState(false);
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
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
  const { topRecommendation, rankedQueue, catchUpQueue } = useMemo(
    () => getSmartRecommendations(displayTasks, currentTime, remainingEffortMap, capacitySettings),
    [displayTasks, currentTime, remainingEffortMap, capacitySettings]
  );

  // Following 2-3 tasks for "Next up"
  const nextUpQueue = useMemo(
    () => rankedQueue.slice(1, 4),
    [rankedQueue]
  );

  // Plain supportive status sentence
  const statusSentence = useMemo(
    () => getStatusSentence(displayTasks, capacitySettings, currentTime),
    [displayTasks, capacitySettings, currentTime]
  );

  const [isDemoBannerDismissedState, setIsDemoBannerDismissedState] = useState(() => isSampleBannerDismissed());

  const showDemoBanner = useMemo(() => {
    return !isTourActive && !isDemoBannerDismissedState && isSampleTaskSet(tasks);
  }, [isTourActive, isDemoBannerDismissedState, tasks]);

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
      return displayTasks.find((t) => t.id === stopwatch.selectedTaskId) || null;
    }
    return topRecommendation?.task || null;
  }, [stopwatch.selectedTaskId, displayTasks, topRecommendation]);

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation}>
        <div className="min-h-screen bg-[#090909] text-zinc-100 font-sans selection:bg-orange-500 selection:text-black antialiased transition-colors">
          {/* Slim Header */}
      <Header
        onOpenAddTask={handleOpenAddModal}
        onOpenAsk={() => setIsAskModalOpen(true)}
        onOpenCapacity={() => setIsCapacityModalOpen(true)}
        onOpenImport={() => setIsImportModalOpen(true)}
        onOpenResetWeek={() => setIsResetWeekModalOpen(true)}
        onTakeTour={() => setIsTourActive(true)}
        onLoadDemoData={resetToSampleTasks}
        onClearEverything={() => setIsClearConfirmOpen(true)}
        weeklyCapacityHours={totalWeeklyCapacityHours}
      />

      {/* Main Container: Mobile-first 375px -> 768px */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Tour Mode Indicator Badge */}
        {isTourActive && (
          <div className="flex items-center justify-center animate-fade-in">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-medium">
              <Compass className="w-3.5 h-3.5" />
              <span>Tour mode — viewing preview data</span>
            </div>
          </div>
        )}

        {/* Optional Demo Tasks Detection Banner */}
        {showDemoBanner && (
          <DemoTaskBanner
            onClear={handleClearDemoTasks}
            onKeep={handleKeepDemoTasks}
          />
        )}

        <AnimatePresence mode="wait">
          {displayTasks.length === 0 ? (
            /* Clean Empty State when user has 0 tasks */
            <m.div
              key="empty-state"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <EmptyState
                onOpenAddTask={handleOpenAddModal}
                onOpenImport={() => setIsImportModalOpen(true)}
                onTakeTour={() => setIsTourActive(true)}
              />
            </m.div>
          ) : (
            <m.div
              key="task-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6 sm:space-y-8"
            >
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
                  catchUpCount={catchUpQueue.length}
                  onOpenCatchUp={() => setIsCatchUpModalOpen(true)}
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
              <section id="tour-forecast" aria-label="Weekly workload forecast">
                <ForecastStrip
                  tasks={displayTasks}
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
                  tasks={displayTasks}
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
            </m.div>
          )}
        </AnimatePresence>
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
      <Modal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        maxWidthClass="max-w-sm"
        title="Clear all tasks"
      >
        <div className="p-6 space-y-4 font-sans">
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
              className="px-3.5 py-1.5 text-xs text-zinc-300 hover:text-white rounded-lg border border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                clearAllTasks();
                setIsClearConfirmOpen(false);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors cursor-pointer"
            >
              Clear everything
            </button>
          </div>
        </div>
      </Modal>

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

      {/* Dedicated Catch-Up Modal for tasks overdue by >24h */}
      <CatchUpModal
        isOpen={isCatchUpModalOpen}
        onClose={() => setIsCatchUpModalOpen(false)}
        catchUpTasks={catchUpQueue}
        onMarkDone={toggleComplete}
        onDropTask={(id) => updateTask(id, { completed: true, dropped: true })}
        onEmailInstructor={(task) => setEmailTaskTarget(task)}
        onReschedule={(task, newDateIso) => updateTask(task.id, { dueDateTime: newDateIso })}
        now={currentTime}
      />

      {/* Paste-to-Import Modal */}
      <ImportTasksModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportTasks={handleImportTasks}
        now={currentTime}
      />

      {/* Product Onboarding Tour */}
      <ProductTour
        isOpen={isTourActive}
        onClose={() => setIsTourActive(false)}
      />

      {/* Grounded "Ask" Schedule Assistant Modal */}
      <AskModal
        isOpen={isAskModalOpen}
        onClose={() => setIsAskModalOpen(false)}
        tasks={displayTasks}
        remainingEffortMap={remainingEffortMap}
        capacitySettings={capacitySettings}
        now={currentTime}
        onAddTask={(newTask) => addTask(newTask)}
        onUpdateDailyHours={(day, hours) => updateDailyHours(day, hours)}
        onDropTask={(taskId) => updateTask(taskId, { completed: true, dropped: true })}
        onRescheduleTask={(taskId, newDueDateIso) =>
          updateTask(taskId, { dueDateTime: newDueDateIso })
        }
      />
        </div>
      </LazyMotion>
    </MotionConfig>
  );
}

export default App;
