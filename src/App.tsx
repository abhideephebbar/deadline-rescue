import { useState, useEffect, useMemo } from 'react';
import { MotionConfig, LazyMotion, domAnimation, AnimatePresence, m } from 'motion/react';
import { AuroraBackground } from './components/AuroraBackground';
import { FloatingNav, ActiveTab } from './components/FloatingNav';
import { HeroCarousel } from './components/HeroCarousel';
import { TaskRail } from './components/TaskRail';
import { WeekForecastView } from './components/WeekForecastView';
import { AllTasksView } from './components/AllTasksView';
import { EmptyState } from './components/EmptyState';
import { WelcomeGreeting } from './components/WelcomeGreeting';
import { MiniTimerBar } from './components/MiniTimerBar';
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
import { getRemainingEffortMap, getTaskLoggedHours } from './utils/stopwatchIntegration';
import { getCategoryCalibrations } from './utils/calibration';
import { getSmartRecommendations } from './utils/ranking';
import { buildAppFacts } from './utils/facts';
import { GreetingActionType } from './utils/greeting';
import { getWorkloadMood } from './utils/mood';
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
    updateDailyHours,
    addBlockedSlot,
    removeBlockedSlot,
    resetToDefaults: resetCapacityDefaults,
  } = useCapacity();

  const stopwatch = useStopwatch();

  // Navigation tab state synced with URL hash (#today, #week, #tasks)
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#week') return 'week';
      if (hash === '#tasks') return 'tasks';
    }
    return 'today';
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#week') setActiveTab('week');
      else if (hash === '#tasks') setActiveTab('tasks');
      else setActiveTab('today');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    window.location.hash = `#${tab}`;
  };

  // Reduce effects toggle: stored in localStorage, respects prefers-reduced-motion
  const [reduceEffects, setReduceEffects] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('deadline_rescue_reduce_effects');
      if (saved !== null) {
        return saved === 'true';
      }
    } catch {
      // ignore
    }
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  const toggleReduceEffects = () => {
    setReduceEffects((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('deadline_rescue_reduce_effects', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

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

  // Mood determination based on 7-day demand/capacity: 'calm' | 'busy' | 'overloaded'
  const workloadMood = useMemo(
    () => getWorkloadMood(displayTasks, capacitySettings, currentTime),
    [displayTasks, capacitySettings, currentTime]
  );

  // Compute smart recommendations
  const { topRecommendation, rankedQueue, catchUpQueue } = useMemo(
    () => getSmartRecommendations(displayTasks, currentTime, remainingEffortMap, capacitySettings),
    [displayTasks, currentTime, remainingEffortMap, capacitySettings]
  );

  // Top 3 tasks for the Hero Carousel
  const heroRecommendations = useMemo(
    () => rankedQueue.slice(0, 3),
    [rankedQueue]
  );

  // Rails filtering
  // 1. "Keep going": Tasks with logged time that are not completed
  const keepGoingTasks = useMemo(() => {
    return displayTasks.filter(
      (t) => !t.completed && !t.dropped && getTaskLoggedHours(t.id, stopwatch.savedSessions) > 0
    );
  }, [displayTasks, stopwatch.savedSessions]);

  // 2. "Due soon": Tasks due within the next 48h that are not completed
  const dueSoonTasks = useMemo(() => {
    const nowMs = currentTime.getTime();
    return displayTasks.filter((t) => {
      if (t.completed || t.dropped) return false;
      const dueMs = new Date(t.dueDateTime).getTime();
      const diffHours = (dueMs - nowMs) / (1000 * 60 * 60);
      return diffHours > 0 && diffHours <= 48;
    });
  }, [displayTasks, currentTime]);

  // 3. "Catch up": Overdue tasks needing attention (>24h overdue or in catchUpQueue)
  const catchUpTasks = useMemo(() => {
    return catchUpQueue;
  }, [catchUpQueue]);

  const [isDemoBannerDismissedState, setIsDemoBannerDismissedState] = useState(() =>
    isSampleBannerDismissed()
  );

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

  const candidateTask = tasks.find((t) => t.id === deleteCandidateId);

  // Active task for mini-timer
  const activeTimerTask = useMemo(() => {
    if (stopwatch.selectedTaskId) {
      return displayTasks.find((t) => t.id === stopwatch.selectedTaskId) || null;
    }
    return topRecommendation?.task || null;
  }, [stopwatch.selectedTaskId, displayTasks, topRecommendation]);

  const appFacts = useMemo(
    () => buildAppFacts(displayTasks, capacitySettings, currentTime, remainingEffortMap),
    [displayTasks, capacitySettings, currentTime, remainingEffortMap]
  );

  const handleGreetingAction = (action: GreetingActionType, taskId?: string) => {
    switch (action) {
      case 'paste':
        setIsImportModalOpen(true);
        break;
      case 'add':
        handleOpenAddModal();
        break;
      case 'tour':
        setIsTourActive(true);
        break;
      case 'start_top':
        if (taskId) {
          const found = displayTasks.find((t) => t.id === taskId);
          if (found) handleStartNow(found);
        } else if (topRecommendation?.task) {
          handleStartNow(topRecommendation.task);
        }
        break;
      case 'plan_week':
        setIsCapacityModalOpen(true);
        break;
      case 'swamped':
        setIsTriageModalOpen(true);
        break;
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domAnimation}>
        <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans selection:bg-orange-500 selection:text-black antialiased relative overflow-x-hidden">
          {/* Animated 3-blob aurora background with grain & 1.2s cross-fading mood layers */}
          <AuroraBackground mood={workloadMood} reduceEffects={reduceEffects} />

          {/* Floating Navigation (Desktop top-right glass pill + Mobile bottom bar + Animated settings) */}
          <FloatingNav
            activeTab={activeTab}
            onTabChange={handleTabChange}
            onOpenAsk={() => setIsAskModalOpen(true)}
            onOpenCapacity={() => setIsCapacityModalOpen(true)}
            onOpenImport={() => setIsImportModalOpen(true)}
            onOpenResetWeek={() => setIsResetWeekModalOpen(true)}
            onTakeTour={() => setIsTourActive(true)}
            onLoadDemoData={resetToSampleTasks}
            onClearEverything={() => setIsClearConfirmOpen(true)}
            reduceEffects={reduceEffects}
            onToggleReduceEffects={toggleReduceEffects}
            onOpenAddTask={handleOpenAddModal}
          />

          {/* Main Content Area */}
          <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-12 relative z-10">
            {/* Tour Mode Indicator Badge */}
            {isTourActive && (
              <div className="flex items-center justify-center mb-6 animate-fade-in">
                <div className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-medium">
                  <Compass className="w-3.5 h-3.5" />
                  <span>Tour mode — viewing preview data</span>
                </div>
              </div>
            )}

            {/* Optional Demo Tasks Detection Banner */}
            {showDemoBanner && (
              <div className="mb-6">
                <DemoTaskBanner
                  onClear={handleClearDemoTasks}
                  onKeep={handleKeepDemoTasks}
                />
              </div>
            )}

            {/* Animated Tab View Switching with cross-fade & slight vertical slide */}
            <AnimatePresence mode="wait">
              {activeTab === 'today' && (
                <m.div
                  key="today-view"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-6 sm:space-y-8"
                >
                  {/* Welcome Greeting Banner (Glass style) */}
                  <WelcomeGreeting
                    facts={appFacts}
                    now={currentTime}
                    onAction={handleGreetingAction}
                  />

                  {displayTasks.length === 0 ? (
                    <EmptyState
                      onOpenAddTask={handleOpenAddModal}
                      onOpenImport={() => setIsImportModalOpen(true)}
                      onTakeTour={() => setIsTourActive(true)}
                    />
                  ) : (
                    <>
                      {/* Hero Carousel: Top 3 ranked tasks as slides with condensed type, timer controls, details */}
                      <section aria-label="Top priority assignments">
                        <HeroCarousel
                          recommendations={heroRecommendations}
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
                          onComplete={toggleComplete}
                          onNotToday={handleNotToday}
                          onEmailInstructor={(task) => setEmailTaskTarget(task)}
                          catchUpCount={catchUpQueue.length}
                          onOpenCatchUp={() => setIsCatchUpModalOpen(true)}
                        />
                      </section>

                      {/* Horizontal Task Rails (Keep going, Due soon, Catch up) */}
                      <TaskRail
                        title="Keep Going"
                        subtitle="Resume where you left off"
                        tasks={keepGoingTasks}
                        sessions={stopwatch.savedSessions}
                        onSelectTask={handleStartNow}
                        onStartTask={handleStartNow}
                      />

                      <TaskRail
                        title="Due Soon"
                        subtitle="Next 48 hours"
                        tasks={dueSoonTasks}
                        sessions={stopwatch.savedSessions}
                        onSelectTask={handleStartNow}
                        onStartTask={handleStartNow}
                      />

                      {catchUpTasks.length > 0 && (
                        <TaskRail
                          title="Catch Up"
                          subtitle="Overdue items needing resolution"
                          tasks={catchUpTasks}
                          sessions={stopwatch.savedSessions}
                          onSelectTask={handleStartNow}
                          onStartTask={handleStartNow}
                        />
                      )}
                    </>
                  )}
                </m.div>
              )}

              {activeTab === 'week' && (
                <m.div
                  key="week-view"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <WeekForecastView
                    tasks={displayTasks}
                    capacitySettings={capacitySettings}
                    now={currentTime}
                    onUpdateTaskDueDate={(taskId, newDueDate) => {
                      updateTask(taskId, { dueDateTime: newDueDate });
                    }}
                    onOpenCapacitySettings={() => setIsCapacityModalOpen(true)}
                  />
                </m.div>
              )}

              {activeTab === 'tasks' && (
                <m.div
                  key="tasks-view"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <AllTasksView
                    tasks={displayTasks}
                    onToggleComplete={toggleComplete}
                    onEdit={handleOpenEditModal}
                    onDelete={(id) => setDeleteCandidateId(id)}
                    onOpenAddTask={handleOpenAddModal}
                    now={currentTime}
                    capacitySettings={capacitySettings}
                    remainingEffortMap={remainingEffortMap}
                    onEmailInstructor={(task) => setEmailTaskTarget(task)}
                  />
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
              if (activeTab !== 'today') {
                handleTabChange('today');
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />

          {/* Modals & Dialogs */}
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

          <ResetWeekModal
            isOpen={isResetWeekModalOpen}
            onClose={() => setIsResetWeekModalOpen(false)}
            tasks={tasks}
            capacitySettings={capacitySettings}
            now={currentTime}
            onConfirmReset={(updatedTasks) => replaceTasks(updatedTasks)}
          />

          <InstructorEmailModal
            isOpen={!!emailTaskTarget}
            onClose={() => setEmailTaskTarget(null)}
            task={emailTaskTarget}
            onMarkSubmitted={(taskId) => {
              toggleComplete(taskId);
              setEmailTaskTarget(null);
            }}
          />

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

          <ImportTasksModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onImportTasks={handleImportTasks}
            now={currentTime}
          />

          <ProductTour
            isOpen={isTourActive}
            onClose={() => setIsTourActive(false)}
          />

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
