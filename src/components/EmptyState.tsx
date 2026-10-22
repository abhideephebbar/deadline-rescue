import React from 'react';
import { Plus, FileText, Sparkles, Compass } from 'lucide-react';

interface EmptyStateProps {
  onOpenAddTask: () => void;
  onOpenImport: () => void;
  onTakeTour: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  onOpenAddTask,
  onOpenImport,
  onTakeTour,
}) => {
  return (
    <div className="py-16 sm:py-24 px-4 text-center max-w-md mx-auto space-y-8 animate-fade-in font-sans">
      <div className="space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center mx-auto text-orange-400 shadow-inner">
          <Sparkles className="w-6 h-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
          What&apos;s on your plate this week?
        </h2>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
          Add your assignments or paste raw text from your syllabus. We&apos;ll help you focus on one thing at a time.
        </p>
      </div>

      {/* Two Primary Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
        <button
          type="button"
          onClick={onOpenImport}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg border border-white/10 bg-zinc-900 hover:bg-zinc-800 text-sm font-medium text-white transition-colors cursor-pointer shadow-sm hover:border-white/20"
        >
          <FileText className="w-4 h-4 text-orange-400" />
          <span>Paste your deadlines</span>
        </button>

        <button
          type="button"
          onClick={onOpenAddTask}
          className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-sm font-medium text-black transition-colors cursor-pointer shadow-sm"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add a task</span>
        </button>
      </div>

      {/* Quiet Tour Link */}
      <div>
        <button
          type="button"
          onClick={onTakeTour}
          className="inline-flex items-center space-x-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer py-1"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Take a tour</span>
        </button>
      </div>
    </div>
  );
};

