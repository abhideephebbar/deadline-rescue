import { useState } from 'react';
import { Header } from './components/Header';
import { DashboardStats } from './components/DashboardStats';
import { SmartRecommendationCard } from './components/SmartRecommendationCard';
import { TaskList } from './components/TaskList';
import { TaskFormModal } from './components/TaskFormModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { SideNav } from './components/SideNav';
import { AnimatedNoise } from './components/AnimatedNoise';
import { SplitFlapText, SplitFlapAudioProvider } from './components/SplitFlapText';
import { ScrambleTextOnHover } from './components/ScrambleText';
import { BitmapChevron } from './components/BitmapChevron';
import { useTasks } from './hooks/useTasks';
import { Task, Priority, TaskCategory } from './types';
import { Plus } from 'lucide-react';

export function App() {
  const {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    toggleComplete,
    resetToSampleTasks,
    clearAllTasks,
  } = useTasks();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(null);

  const handleOpenAddModal = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
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

  const candidateTask = tasks.find((t) => t.id === deleteCandidateId);

  return (
    <SplitFlapAudioProvider>
      <div className="relative min-h-screen bg-[#0c0c0c] text-[#f5f5f5] font-sans selection:bg-orange-500 selection:text-black overflow-x-hidden">
        {/* Animated Noise Overlay from v0 template */}
        <AnimatedNoise opacity={0.035} />

        {/* Minimalist Side Navigation Rail */}
        <SideNav />

        {/* Top Header */}
        <Header
          onOpenAddTask={handleOpenAddModal}
          onResetSamples={resetToSampleTasks}
        />

        {/* Main Content Area (offset by side rail on desktop) */}
        <div className="pl-4 md:pl-20 lg:pl-24 pr-4 sm:pr-8 py-8 sm:py-12 max-w-7xl mx-auto space-y-12 sm:space-y-16">
          {/* Hero Section with Split-Flap Board Title */}
          <section className="relative pt-4 sm:pt-8 border-b border-white/10 pb-12 sm:pb-16 grid-bg">
            {/* Left Vertical Label */}
            <div className="hidden lg:block absolute -left-12 top-1/2 -translate-y-1/2">
              <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-zinc-600 -rotate-90 origin-left block whitespace-nowrap">
                CONSOLE // RADAR
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2 font-mono text-xs uppercase tracking-[0.25em] text-orange-400">
                <span>[ 00 ]</span>
                <span>CONTROLLED TRIAGE ENVIRONMENT</span>
              </div>

              {/* Split Flap Board H1 */}
              <div className="overflow-x-auto py-2">
                <SplitFlapText text="DEADLINE RESCUE" speed={55} />
              </div>

              <h2 className="font-display text-zinc-500 text-2xl sm:text-3xl tracking-wide uppercase">
                Intelligent Academic Triage &amp; Load Management
              </h2>

              <p className="font-mono text-xs sm:text-sm text-zinc-400 max-w-xl leading-relaxed">
                We prioritize behavior, not just due dates. A tactical priority matrix designed for college students to calculate time deficits, protect safety buffers, and eliminate late submissions.
              </p>

              {/* Quick Jump Action Bar */}
              <div className="pt-4 flex flex-wrap items-center gap-4 sm:gap-6">
                <button
                  onClick={handleOpenAddModal}
                  type="button"
                  className="group inline-flex items-center gap-2.5 border border-white/20 hover:border-orange-500 px-5 py-2.5 font-mono text-xs uppercase tracking-widest text-white hover:text-orange-400 transition-all cursor-pointer bg-black/40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <ScrambleTextOnHover text="Initialize Task" as="span" duration={0.3} />
                  <BitmapChevron className="transition-transform duration-200 group-hover:rotate-45" />
                </button>

                <a
                  href="#section-triage"
                  className="font-mono text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
                >
                  Inspect Triage Target &darr;
                </a>

                <a
                  href="#section-radar"
                  className="font-mono text-xs uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
                >
                  View All Deadlines &darr;
                </a>
              </div>
            </div>

            {/* Corner Badge */}
            <div className="hidden sm:block absolute bottom-4 right-0 border border-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-zinc-500 bg-black/50">
              BUILD v.02 // REALTIME RADAR
            </div>
          </section>

          {/* Section 01: Smart Recommendation Hero Card */}
          <section aria-label="Smart Task Recommendation">
            <SmartRecommendationCard
              tasks={tasks}
              onToggleComplete={toggleComplete}
            />
          </section>

          {/* Section 02: Telemetry Statistics */}
          <section aria-label="Telemetry Statistics">
            <DashboardStats tasks={tasks} />
          </section>

          {/* Section 03: All Coursework Radar Queue */}
          <section aria-label="Coursework Radar">
            <TaskList
              tasks={tasks}
              onToggleComplete={toggleComplete}
              onEdit={handleOpenEditModal}
              onDelete={(id) => setDeleteCandidateId(id)}
              onOpenAddTask={handleOpenAddModal}
              onResetSamples={resetToSampleTasks}
            />
          </section>

          {/* Colophon & Footer */}
          <footer className="border-t border-white/10 pt-8 pb-12 font-mono text-xs text-zinc-500 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-zinc-400 uppercase tracking-widest font-semibold">
                DEADLINE RESCUE // COLOPHON
              </div>
              <p className="text-[11px] text-zinc-600">
                Client-side telemetry stored locally in browser storage. Zero remote tracking.
              </p>
            </div>

            <div className="flex items-center space-x-4 text-[11px]">
              <button
                onClick={resetToSampleTasks}
                type="button"
                className="text-zinc-400 hover:text-orange-400 transition-colors uppercase tracking-wider"
              >
                [Reload Samples]
              </button>
              <span>/</span>
              <button
                onClick={clearAllTasks}
                type="button"
                className="text-zinc-500 hover:text-red-400 transition-colors uppercase tracking-wider"
              >
                [Purge All Records]
              </button>
            </div>
          </footer>
        </div>

        {/* Task Form Modal */}
        <TaskFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTask(null);
          }}
          onSubmit={handleModalSubmit}
          initialTask={editingTask}
        />

        {/* Delete Confirm Modal */}
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
      </div>
    </SplitFlapAudioProvider>
  );
}

export default App;
