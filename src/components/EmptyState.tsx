import React from 'react';
import { Plus, FileText, Sparkles, Compass } from 'lucide-react';
import { Glass } from './ui/Glass';

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
    <div className="py-12 sm:py-16 px-4 font-sans">
      <Glass className="p-8 sm:p-12 text-center max-w-md mx-auto space-y-6">
        <div className="space-y-3">
          {/* Icon in a circle */}
          <div className="w-14 h-14 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto text-orange-400 shadow-inner">
            <Sparkles className="w-6 h-6 stroke-[2]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
            What&apos;s on your plate this week?
          </h2>
          <p className="text-sm text-zinc-300 leading-relaxed max-w-sm mx-auto">
            Add your assignments or paste raw text from your syllabus. We&apos;ll help you focus on one thing at a time.
          </p>
        </div>

        {/* Two Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={onOpenImport}
            className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/15 text-sm font-medium text-white transition-colors cursor-pointer shadow-sm"
          >
            <FileText className="w-4 h-4 text-orange-400" />
            <span>Paste your deadlines</span>
          </button>

          <button
            type="button"
            onClick={onOpenAddTask}
            className="inline-flex items-center justify-center space-x-2 px-5 py-2.5 rounded-full bg-orange-500 hover:bg-orange-400 text-sm font-semibold text-black transition-colors cursor-pointer shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add a task</span>
          </button>
        </div>

        {/* Quiet Tour Link */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onTakeTour}
            className="inline-flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer py-1"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Take a tour</span>
          </button>
        </div>
      </Glass>
    </div>
  );
};
