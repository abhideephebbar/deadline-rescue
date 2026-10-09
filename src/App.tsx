import { useState } from 'react';
import { Header } from './components/Header';
import { DashboardStats } from './components/DashboardStats';
import { SmartRecommendationCard } from './components/SmartRecommendationCard';
import { TaskList } from './components/TaskList';
import { TaskFormModal } from './components/TaskFormModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { useTasks } from './hooks/useTasks';
import { Task, Priority, TaskCategory } from './types';
import { GraduationCap } from 'lucide-react';

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-brand-500/30 selection:text-brand-200">
      {/* Top Header */}
      <Header
        onOpenAddTask={handleOpenAddModal}
        onResetSamples={resetToSampleTasks}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8">
        {/* 1. Dashboard Metrics Summary (Feature #1) */}
        <section aria-label="Dashboard Statistics">
          <DashboardStats tasks={tasks} />
        </section>

        {/* 2. Smart Recommendation Hero Card (Feature #4) */}
        <section aria-label="Smart Task Recommendation">
          <SmartRecommendationCard
            tasks={tasks}
            onToggleComplete={toggleComplete}
          />
        </section>

        {/* 3. Task Management Section (Features #2, #3, #5, #7) */}
        <section aria-label="Coursework Deadlines">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center space-x-2">
                <span>All Deadlines & Coursework</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Prioritized and triaged using deadline proximity, estimated effort, and academic impact
              </p>
            </div>
          </div>

          <TaskList
            tasks={tasks}
            onToggleComplete={toggleComplete}
            onEdit={handleOpenEditModal}
            onDelete={(id) => setDeleteCandidateId(id)}
            onOpenAddTask={handleOpenAddModal}
            onResetSamples={resetToSampleTasks}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/60 py-6 mt-12 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-4 h-4 text-brand-400" />
            <span className="font-medium text-zinc-400">
              Deadline Rescue — Built for college students tackling heavy semesters
            </span>
          </div>
          <div className="flex items-center space-x-4 text-[11px] text-zinc-500">
            <span>Client-side only (localStorage saved)</span>
            <span>•</span>
            <button
              onClick={clearAllTasks}
              className="text-zinc-500 hover:text-rose-400 transition-colors"
            >
              Clear All Data
            </button>
          </div>
        </div>
      </footer>

      {/* Task Add / Edit Modal */}
      <TaskFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSubmit={handleModalSubmit}
        initialTask={editingTask}
      />

      {/* Delete Confirmation Modal */}
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
  );
}

export default App;

