import { useState, useEffect, useMemo } from 'react';
import { MotionConfig, LazyMotion, domMax, AnimatePresence, m } from 'motion/react';
import { AuroraBackground } from './components/AuroraBackground';
import { FloatingNav, ActiveTab } from './components/FloatingNav';
import { HeroCarousel } from './components/HeroCarousel';
import { TaskRail } from './components/TaskRail';
import { WeekForecastView } from './components/WeekForecastView';
import { AllTasksView } from './components/AllTasksView';
import { EmptyState } from './components/EmptyState';
import { GreetingHero } from './components/GreetingHero';
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
import { AttendanceCardRow } from './components/AttendanceCardRow';
import { AttendanceDetailModal } from './components/AttendanceDetailModal';
import { WelcomeFlow } from './components/WelcomeFlow';
import { Modal } from './components/ui/Modal';
import { useTasks } from './hooks/useTasks';
import { useCapacity } from './hooks/useCapacity';
import { useStopwatch } from './hooks/useStopwatch';
import { getRemainingEffortMap, getTaskLoggedHours } from './utils/stopwatchIntegration';
import { getCategoryCalibrations, resetCalibration } from './utils/calibration';
import { getSmartRecommendations } from './utils/ranking';
import { buildAppFacts } from './utils/facts';
import { GreetingActionType, isFirstVisit } from './utils/greeting';
import { getWorkloadMood } from './utils/mood';
import { isSampleTaskSet, isSampleBannerDismissed, dismissSampleBanner } from './utils/sampleDetection';
import { generateTourDemoTasks } from './utils/tour';
import { clearStoredWeather, getStoredWeatherOptIn, setStoredWeatherOptIn } from './utils/weather';
import { SubjectAttendance } from './types';
import { getStoredAttendance, saveStoredAttendance, clearStoredAttendance } from './utils/attendanceMath';
import { clearAllAppData } from './utils/storageMigration';
import { Task, Priority, TaskCategory } from './types';
import { AlertTriangle, Compass, CheckCircle2, ChevronDown } from 'lucide-react';
import { Glass } from './components/ui/Glass';

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

  const [isEditingName, setIsEditingName] = useState(false);
  const [isLaterWeekExpanded, setIsLaterWeekExpanded] = useState(false);
  const [isWeatherActive, setIsWeatherActive] = useState<boolean>(() => {
    return getStoredWeatherOptIn() === 'on';
  });

  const [isTourActive, setIsTourActive] = useState(false);
  const tourDemoTasks = useMemo(() => generateTourDemoTasks(), []);
  const displayTasks = isTourActive ? tourDemoTasks : tasks;

  // Subtract logged stopwatch time to determine real remaining effort for ranking & display
  const remainingEffortMap = useMemo(
    () => getRemainingEffortMap(displayTasks, stopwatch.savedSessions),
    [displayTasks, stopwatch.savedSessions]
  );

  // Calibrate per-category estimate accuracy from completed tasks with logged sessions
  const [calibrationVersion, setCalibrationVersion] = useState(0);

  const calibrations = useMemo(
    () => getCategoryCalibrations(displayTasks, stopwatch.savedSessions),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayTasks, stopwatch.savedSessions, calibrationVersion]
  );

  const handleResetCalibration = (category?: TaskCategory) => {
    resetCalibration(category);
    setCalibrationVersion((v) => v + 1);
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCapacityModalOpen, setIsCapacityModalOpen] = useState(false);
  const [isTriageModalOpen, setIsTriageModalOpen] = useState(false);
  const [isResetWeekModalOpen, setIsResetWeekModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [isCatchUpModalOpen, setIsCatchUpModalOpen] = useState(false);
  const [isAskModalOpen, setIsAskModalOpen] = useState(false);
  const [focusWeekDayIndex, setFocusWeekDayIndex] = useState<number | null>(null);
  const [emailTaskTarget, setEmailTaskTarget] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  // Attendance Guard State
  const [attendanceSubjects, setAttendanceSubjects] = useState<SubjectAttendance[]>(() => getStoredAttendance());
  const [selectedAttendanceSubject, setSelectedAttendanceSubject] = useState<SubjectAttendance | null>(null);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

  // Onboarding state: true if returning user, false if first visit
  const [onboardingDone, setOnboardingDone] = useState<boolean>(() => {
    if (typeof localStorage === 'undefined') return true;
    return !isFirstVisit();
  });

  const handleSaveAttendanceSubject = (subject: SubjectAttendance) => {
    setAttendanceSubjects((prev) => {
      const exists = prev.some((s) => s.id === subject.id);
      const updated = exists ? prev.map((s) => (s.id === subject.id ? subject : s)) : [...prev, subject];
      saveStoredAttendance(updated);
      return updated;
    });
  };

  const handleDeleteAttendanceSubject = (id: string) => {
    setAttendanceSubjects((prev) => {
      const updated = prev.filter((s) => s.id !== id);
      saveStoredAttendance(updated);
      return updated;
    });
  };

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
      updateTask(editingTask.id, { ...data, needsReview: false });
    } else {
      addTask(data);
    }
  };

  const handleNavigateToWeek = (dayIndex?: number) => {
    if (typeof dayIndex === 'number') {
      setFocusWeekDayIndex(dayIndex);
    }
    handleTabChange('week');
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
    () => buildAppFacts(displayTasks, capacitySettings, currentTime, remainingEffortMap, stopwatch.savedSessions),
    [displayTasks, capacitySettings, currentTime, remainingEffortMap, stopwatch.savedSessions]
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

  if (!onboardingDone) {
    return (
      <WelcomeFlow
        onComplete={(intent) => {
          setOnboardingDone(true);
          if (intent === 'deadlines' || intent === 'exams') {
            setIsImportModalOpen(true);
          }
        }}
      />
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <LazyMotion features={domMax}>
        <div className="min-h-screen text-zinc-100 font-sans selection:bg-orange-500 selection:text-black antialiased relative overflow-x-hidden">
          {/* Animated 3-blob aurora background with grain & 1.2s cross-fading mood layers */}
          <AuroraBackground mood={workloadMood} reduceEffects={reduceEffects} now={currentTime} />

          <div className="relative z-10 flex flex-col min-h-screen">
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
              onChangeName={() => setIsEditingName(true)}
              onTurnOffWeather={() => {
                clearStoredWeather();
                setStoredWeatherOptIn('off');
                setIsWeatherActive(false);
              }}
              isWeatherActive={isWeatherActive}
            />

            {/* Main Content Area */}
            <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-12 flex-1 w-full">
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
                    {/* Claude-style Greeting Hero with word-by-word reveal */}
                    <GreetingHero
                      facts={appFacts}
                      now={currentTime}
                      onAction={handleGreetingAction}
                      reduceEffects={reduceEffects}
                      isEditingName={isEditingName}
                      onCancelEditName={() => setIsEditingName(false)}
                      onNameChanged={() => {
                        setIsEditingName(false);
                      }}
                    />

                    {/* Compact Attendance Guard Card Row beneath hero area */}
                    <AttendanceCardRow
                      subjects={attendanceSubjects}
                      onSelectSubject={(subject) => {
                        setSelectedAttendanceSubject(subject);
                        setIsAttendanceModalOpen(true);
                      }}
                      onAddNewSubject={() => {
                        setSelectedAttendanceSubject(null);
                        setIsAttendanceModalOpen(true);
                      }}
                    />

                    {displayTasks.length === 0 ? (
                      <EmptyState
                        onOpenAddTask={handleOpenAddModal}
                        onOpenImport={() => setIsImportModalOpen(true)}
                        onTakeTour={() => setIsTourActive(true)}
                      />
                    ) : heroRecommendations.length === 0 && keepGoingTasks.length === 0 && dueSoonTasks.length === 0 && catchUpTasks.length === 0 ? (
                      <div className="py-12 px-4">
                        <Glass className="p-8 sm:p-12 text-center max-w-md mx-auto space-y-4">
                          <div className="w-14 h-14 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                            <CheckCircle2 className="w-7 h-7" />
                          </div>
                          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
                            All caught up!
                          </h2>
                          <p className="text-sm text-zinc-300 leading-relaxed max-w-sm mx-auto">
                            You have no pending deadlines or active tasks right now. Check your weekly forecast or add new assignments.
                          </p>
                          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => handleTabChange('tasks')}
                              className="px-4 py-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-medium text-white transition-colors cursor-pointer"
                            >
                              View all coursework
                            </button>
                            <button
                              type="button"
                              onClick={handleOpenAddModal}
                              className="px-4 py-2 rounded-full bg-orange-500 hover:bg-orange-400 text-xs font-semibold text-black transition-colors cursor-pointer"
                            >
                              Add a task
                            </button>
                          </div>
                        </Glass>
                      </div>
                    ) : (
                      <>
                        {/* Hero Carousel: Top 3 ranked tasks as slides with condensed type, timer controls, details */}
                        {heroRecommendations.length > 0 && (
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
                        )}

                        {/* Horizontal Task Rails (Keep going, Due soon, Catch up) */}
                        <div id="tour-rails" className="space-y-6 sm:space-y-8">
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

                          {/* Later this week collapsed glance window */}
                          {appFacts.tasksDue7d && appFacts.tasksDue7d.length > 0 && (
                            <div className="px-1 -mt-2 sm:-mt-4">
                              <button
                                type="button"
                                onClick={() => setIsLaterWeekExpanded((prev) => !prev)}
                                aria-expanded={isLaterWeekExpanded}
                                className="inline-flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors py-1 cursor-pointer"
                              >
                                <ChevronDown
                                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                                    isLaterWeekExpanded ? 'rotate-180 text-orange-400' : 'text-zinc-500'
                                  }`}
                                />
                                <span>Later this week ({appFacts.tasksDue7d.length})</span>
                              </button>

                              {isLaterWeekExpanded && (
                                <div className="flex flex-wrap gap-2 pt-2 animate-fade-in">
                                  {appFacts.tasksDue7d.map((task) => {
                                    const weekday = new Date(task.dueDateTime).toLocaleDateString('en-US', {
                                      weekday: 'short',
                                    });
                                    return (
                                      <span
                                        key={task.id}
                                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs text-zinc-300"
                                      >
                                        <span className="font-medium text-white">{task.title}</span>
                                        <span className="text-zinc-500 font-mono">({weekday})</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

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
                        </div>
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
                    initialDayIndex={focusWeekDayIndex}
                    attendanceSubjects={attendanceSubjects}
                    calibrations={calibrations}
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
        </div>

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
            existingCourses={displayTasks.map((t) => t.course)}
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
                    clearStoredAttendance();
                    setAttendanceSubjects([]);
                    clearAllAppData();
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
            calibrations={calibrations}
            onResetCalibration={handleResetCalibration}
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
            existingTasks={tasks}
            capacitySettings={capacitySettings}
            onNavigateToWeek={handleNavigateToWeek}
          />

          <AttendanceDetailModal
            isOpen={isAttendanceModalOpen}
            onClose={() => {
              setIsAttendanceModalOpen(false);
              setSelectedAttendanceSubject(null);
            }}
            subject={selectedAttendanceSubject}
            onSave={handleSaveAttendanceSubject}
            onDelete={handleDeleteAttendanceSubject}
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
            stopwatchSessions={stopwatch.savedSessions}
            onAddTask={(newTask) => addTask(newTask)}
            onUpdateDailyHours={(day, hours) => updateDailyHours(day, hours)}
            onDropTask={(taskId) => updateTask(taskId, { completed: true, dropped: true })}
            onRescheduleTask={(taskId, newDueDateIso) =>
              updateTask(taskId, { dueDateTime: newDueDateIso })
            }
            onStartTask={(taskId) => {
              const target = displayTasks.find((t) => t.id === taskId);
              if (target) {
                handleStartNow(target);
              }
            }}
          />
        </div>
      </LazyMotion>
    </MotionConfig>
  );
}

export default App;
