import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, ShieldCheck, Check, AlertCircle } from 'lucide-react';
import { Task, CapacitySettings } from '../types';
import {
  processAskQuery,
  GroundedConfirmation,
  AskMessageHistoryItem,
} from '../utils/askService';
import { Modal } from './ui/Modal';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  source?: 'gemini' | 'rule-based';
  confirmation?: GroundedConfirmation;
  appliedNotice?: string;
  clarificationOptions?: Array<{ label: string; query: string }>;
  reasoning?: string;
  suggestionChips?: string[];
  referencedTaskId?: string;
}

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
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'initial-greeting',
      role: 'assistant',
      text: "Hi! I can help you triage your deadlines, adjust your study hours, or simulate what happens if you delay a task. What's on your mind?",
      source: 'rule-based',
      suggestionChips: [
        'Why is this my top task?',
        'I only have 2 hours tonight',
        'What if I skip my lowest priority item?',
        'What if I move my next task by 1 day?',
      ],
    },
  ]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollToBottom('auto');
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom('smooth');
    }
  }, [messages.length, isLoading, isOpen]);

  const handleSend = async (textToSend: string) => {
    const text = textToSend.trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      text,
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setQuery('');
    setIsLoading(true);

    try {
      const history: AskMessageHistoryItem[] = nextMessages.map((m) => ({
        role: m.role,
        text: m.text,
        taskId: m.referencedTaskId,
      }));

      const answer = await processAskQuery(text, {
        tasks,
        remainingEffortMap,
        capacitySettings,
        now,
        history,
      });

      const assistantMsg: ChatMessage = {
        id: 'asst-' + Date.now(),
        role: 'assistant',
        text: answer.reply,
        source: answer.source,
        confirmation: answer.confirmation,
        clarificationOptions: answer.clarificationOptions,
        reasoning: answer.reasoning,
        suggestionChips: answer.suggestionChips,
        referencedTaskId: answer.referencedTaskId,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'assistant',
          text: 'Sorry, I encountered an issue processing your request. Please try again.',
          source: 'rule-based',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyConfirmation = (confirmation: GroundedConfirmation, messageId: string) => {
    switch (confirmation.type) {
      case 'add_task':
        onAddTask(confirmation.payload);
        break;
      case 'set_capacity':
        onUpdateDailyHours(confirmation.payload.day, confirmation.payload.hours);
        break;
      case 'drop_task':
        onDropTask(confirmation.payload.taskId);
        break;
      case 'reschedule_task':
        onRescheduleTask(confirmation.payload.taskId, confirmation.payload.newDueIso);
        break;
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              confirmation: undefined,
              appliedNotice: `Applied: ${confirmation.confirmLabel}`,
            }
          : m
      )
    );
  };

  const handleDismissConfirmation = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, confirmation: undefined } : m))
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidthClass="max-w-xl"
      title="Ask about your schedule"
    >
      <div className="font-sans flex flex-col h-[75vh] max-h-[620px]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-zinc-950/40">
          <div className="flex items-center space-x-2 text-orange-400">
            <Sparkles className="w-4 h-4" />
            <h2 className="text-base font-semibold text-white">
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

        {/* Scrollable Conversation Thread */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              {/* User Bubble */}
              {msg.role === 'user' ? (
                <div className="max-w-[85%] rounded-2xl rounded-tr-xs px-4 py-2.5 bg-orange-500/15 border border-orange-500/30 text-white text-sm shadow-sm leading-relaxed">
                  {msg.text}
                </div>
              ) : (
                /* Assistant Bubble */
                <div className="max-w-[92%] rounded-2xl rounded-tl-xs p-4 bg-[#1d1d21] border border-white/10 text-zinc-100 text-sm space-y-3 shadow-sm">
                  {/* Top metadata badge */}
                  <div className="flex items-center justify-between text-[11px] text-zinc-500 border-b border-white/5 pb-2">
                    <span className="font-medium text-zinc-400 flex items-center space-x-1.5">
                      <Sparkles className="w-3 h-3 text-orange-400" />
                      <span>Deadline Rescue</span>
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-zinc-400">
                      {msg.source === 'gemini' ? '✦ AI' : 'Offline mode (limited)'}
                    </span>
                  </div>

                  {/* Message Text */}
                  <p className="leading-relaxed text-zinc-100 text-sm font-sans">
                    {msg.text}
                  </p>

                  {/* Why / Reasoning Disclosure */}
                  {msg.reasoning && (
                    <div className="text-xs text-zinc-400 bg-black/40 border border-white/5 p-2.5 rounded-lg leading-relaxed">
                      <span className="text-zinc-500 font-semibold block mb-0.5">Why:</span>
                      {msg.reasoning}
                    </div>
                  )}

                  {/* Action Applied Toast */}
                  {msg.appliedNotice && (
                    <div className="p-2.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-emerald-300 text-xs flex items-center space-x-2">
                      <Check className="w-4 h-4 shrink-0" />
                      <span>{msg.appliedNotice}</span>
                    </div>
                  )}

                  {/* Confirmation Card */}
                  {msg.confirmation && (
                    <div className="p-3.5 rounded-xl border border-orange-500/40 bg-orange-950/20 space-y-2.5 mt-2">
                      <div className="flex items-start space-x-2 text-xs">
                        <AlertCircle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-white">
                            {msg.confirmation.title}
                          </div>
                          <div className="text-zinc-300 mt-0.5 leading-relaxed">
                            {msg.confirmation.description}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleDismissConfirmation(msg.id)}
                          className="px-2.5 py-1 text-xs text-zinc-400 hover:text-white rounded border border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyConfirmation(msg.confirmation!, msg.id)}
                          className="px-3 py-1 text-xs font-semibold text-black bg-orange-500 hover:bg-orange-400 rounded transition-colors active:scale-95 cursor-pointer"
                        >
                          {msg.confirmation.confirmLabel}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Clarification Candidate Chips */}
                  {msg.clarificationOptions && msg.clarificationOptions.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[11px] font-medium text-zinc-400">
                        Choose an option:
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {msg.clarificationOptions.map((opt, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSend(opt.query)}
                            className="text-left text-xs px-3 py-2 rounded-lg border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-200 transition-colors cursor-pointer flex items-center justify-between group"
                          >
                            <span>{opt.label}</span>
                            <span className="text-orange-400 group-hover:translate-x-0.5 transition-transform ml-2">
                              →
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestion Chips */}
                  {msg.suggestionChips && msg.suggestionChips.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.suggestionChips.map((chip, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSend(chip)}
                          className="px-2.5 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer text-left"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-tl-xs p-3.5 bg-[#1d1d21] border border-white/10 text-zinc-400 text-xs flex items-center space-x-2 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-orange-400 animate-spin shrink-0" />
                <span>Checking your deadlines and study hours...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar & Footer */}
        <div className="p-3 sm:p-4 border-t border-white/10 bg-zinc-950/80 shrink-0 space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(query);
            }}
            className="flex items-center space-x-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about your deadlines or study hours..."
              className="flex-1 px-3 py-2 rounded-lg bg-zinc-900 border border-white/10 text-white placeholder-zinc-500 text-xs sm:text-sm focus:outline-none focus:border-orange-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className="px-3.5 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-black text-xs sm:text-sm font-semibold transition-colors cursor-pointer shrink-0 flex items-center space-x-1.5 active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask</span>
            </button>
          </form>

          {/* Privacy Notice */}
          <div className="flex items-center justify-center space-x-1.5 text-[10px] text-zinc-500 pt-1">
            <ShieldCheck className="w-3 h-3 text-zinc-400 shrink-0" />
            <span>Grounded in your schedule. Data kept in-memory for this session only.</span>
          </div>
        </div>
      </div>
    </Modal>
  );
};
