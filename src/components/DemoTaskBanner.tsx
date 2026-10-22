import React from 'react';
import { Sparkles, Trash2, Check } from 'lucide-react';

interface DemoTaskBannerProps {
  onClear: () => void;
  onKeep: () => void;
}

export const DemoTaskBanner: React.FC<DemoTaskBannerProps> = ({ onClear, onKeep }) => {
  return (
    <div
      role="region"
      aria-label="Demo tasks prompt"
      className="p-3 sm:px-4 sm:py-3 rounded-lg border border-orange-500/30 bg-orange-950/20 text-orange-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans animate-fade-in"
    >
      <div className="flex items-center space-x-2.5 min-w-0">
        <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
        <span className="leading-snug">
          These look like the demo tasks. Clear them and start fresh?
        </span>
      </div>

      <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
        <button
          type="button"
          onClick={onKeep}
          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded border border-orange-500/20 bg-orange-900/30 hover:bg-orange-900/50 text-orange-200 transition-colors cursor-pointer"
        >
          <Check className="w-3 h-3" />
          <span>Keep</span>
        </button>

        <button
          type="button"
          onClick={onClear}
          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-orange-500 hover:bg-orange-600 text-black font-medium transition-colors cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
          <span>Clear</span>
        </button>
      </div>
    </div>
  );
};

