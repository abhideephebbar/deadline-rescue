import React, { useState } from 'react';
import { Sparkles, Send, X, ShieldCheck, Check, AlertCircle } from 'lucide-react';
import { Task, CapacitySettings } from '../types';
import { processAskQuery, GroundedAnswer, GroundedConfirmation } from '../utils/askService';

interface AskModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  remainingEffortMap?: Record<string, number>;
  capacitySettings: CapacitySettings;
  now?: Date;
  onAddTask: (data: any) => void;
  onUpdateDailyHours: (day: any, hours: number) => void;
  onDropTask: (taskId: string) => void;
  onRescheduleTask: (taskId: string, newDueDateIso: string) => void;
}

export const AskModal: React.FC<AskModalProps> = ({
  isOpen,
  onClose,
  tasks,
  remainingEffortMap,
  capacitySettings,
  now = new Date(),
  onAddTask,
  onUpdateDailyHours,
  onDropTask,
  onRescheduleTask,
}) => {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState<GroundedAnswer | null>(null);
  const [actionAppliedNotice, setActionAppliedNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || isLoading) return;

    setIsLoading(true);
    setActionAppliedNotice(null);

    try {
      const answer = await processAskQuery(text, {
        tasks,
        remainingEffortMap,
        capacitySettings,
        now,
      });
      setCurrentAnswer(answer);
    } catch {
      setCurrentAnswer({
        reply: 'Sorry, I encountered an issue processing your request. Please try again.',
        source: 'rule-based',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyConfirmation = (confirmation: GroundedConfirmation) => {
    switch (confirmation.type) {
      case 'add_task':
        onAddTask(confirmation.payload);
        setActionAppliedNotice(`Added "${confirmation.payload.title}" to your schedule.`);
        break;
      case 'set_capacity':
        onUpdateDailyHours(confirmation.payload.day, confirmation.payload.hours);
        setActionAppliedNotice(`Set today's focus capacity to ${confirmation.payload.hours}h.`);
        break;
      case 'drop_task':
        onDropTask(confirmation.payload.taskId);
        setActionAppliedNotice(`Let go of assignment.`);
        break;
      case 'reschedule_task':
        onRescheduleTask(confirmation.payload.taskId, confirmation.payload.newDueIso);
        setActionAppliedNotice(`Rescheduled deadline.`);
        break;
    }

    // Clear current confirmation after applying
    if (currentAnswer) {
      setCurrentAnswer({
        ...currentAnswer,
        confirmation: undefined,
      });
    }
  };

  const suggestionChips = [
    'Why is this my top task?',
    'I only have 2 hours tonight',
    'What if I skip my lowest priority item?',
    'What if I move my next task by 1 day?',
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ask-modal-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans"
    >
      <div className="bg-[#141414] border border-white/10 rounded-t-2xl sm:rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-orange-400">
            <Sparkles className="w-4 h-4" />
            <h2 id="ask-modal-title" className="text-sm sm:text-base font-semibold text-white">
              Ask about your schedule
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body & Conversation display */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Suggestion Chips */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
              Suggested questions
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestionChips.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(chip);
                    handleSend(chip);
                  }}
                  className="px-2.5 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer text-left"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Action Success Toast */}
          {actionAppliedNotice && (
            <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 text-xs flex items-center space-x-2 animate-fade-in">
              <Check className="w-4 h-4 shrink-0" />
              <span>{actionAppliedNotice}</span>
            </div>
          )}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="p-4 rounded-xl border border-white/10 bg-zinc-950/50 flex items-center space-x-3 text-xs text-zinc-400 animate-pulse">
              <Sparkles className="w-4 h-4 text-orange-400 animate-spin" />
              <span>Checking your deadlines and study hours...</span>
            </div>
          )}

          {/* Grounded Answer Card */}
          {currentAnswer && !isLoading && (
            <div className="p-4 rounded-xl border border-white/10 bg-zinc-950/60 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-[11px] text-zinc-500 border-b border-white/5 pb-2">
                <span className="font-medium text-zinc-400">Answer</span>
                <span className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-[10px]">
                  {currentAnswer.source === 'gemini' ? 'AI Assistant' : 'Rule-based Engine'}
                </span>
              </div>

              <p className="text-sm text-zinc-100 leading-relaxed font-sans">
                {currentAnswer.reply}
              </p>

              {currentAnswer.reasoning && (
                <div className="text-xs text-zinc-400 bg-black/40 border border-white/5 p-2.5 rounded-lg leading-relaxed">
                  <span className="text-zinc-500 font-semibold block mb-0.5">Why:</span>
                  {currentAnswer.reasoning}
                </div>
              )}

              {/* Confirmation Card for data changes */}
              {currentAnswer.confirmation && (
                <div className="p-3 rounded-lg border border-orange-500/40 bg-orange-950/20 space-y-2 mt-3 animate-scale-in">
                  <div className="flex items-start space-x-2 text-xs">
                    <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-white">
                        {currentAnswer.confirmation.title}
                      </div>
                      <div className="text-zinc-400 mt-0.5">
                        {currentAnswer.confirmation.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentAnswer({ ...currentAnswer, confirmation: undefined })
                      }
                      className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white rounded border border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      Dismiss
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyConfirmation(currentAnswer.confirmation!)}
                      className="px-3 py-1 text-xs font-semibold text-black bg-orange-500 hover:bg-orange-400 rounded transition-colors cursor-pointer"
                    >
                      {currentAnswer.confirmation.confirmLabel}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Bar & Footer */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-zinc-950/80 space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(query);
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about your deadlines or study hours..."
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-xs sm:text-sm focus:outline-none focus:border-orange-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="p-2 sm:px-3 sm:py-2 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-black text-xs font-semibold transition-colors cursor-pointer shrink-0 flex items-center space-x-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ask</span>
            </button>
          </form>

          {/* Privacy Notice */}
          <div className="flex items-center justify-center space-x-1.5 text-[10px] text-zinc-500 pt-1">
            <ShieldCheck className="w-3 h-3 text-zinc-400" />
            <span>Grounded in your schedule. Data kept in-memory for this session only.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
