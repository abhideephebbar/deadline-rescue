import React from 'react';
import { StatusSentenceInfo } from '../utils/statusSentence';
import { ArrowRight } from 'lucide-react';

interface StatusSentenceProps {
  sentence: StatusSentenceInfo;
  onAction?: (actionType: 'plan' | 'reset') => void;
}

export const StatusSentence: React.FC<StatusSentenceProps> = ({ sentence, onAction }) => {
  const isAttention = sentence.tone === 'attention';

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1 text-sm font-sans">
      <div className="flex items-center space-x-2.5">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            isAttention ? 'bg-amber-400' : 'bg-emerald-400'
          }`}
          aria-hidden="true"
        />
        <span className="text-zinc-300 font-medium leading-relaxed">
          {sentence.text}
        </span>
      </div>

      {sentence.actionLabel && sentence.actionType && onAction && (
        <button
          type="button"
          onClick={() => onAction(sentence.actionType!)}
          className="inline-flex items-center space-x-1 text-xs font-medium text-orange-400 hover:text-orange-300 underline underline-offset-4 shrink-0 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <span>{sentence.actionLabel}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
