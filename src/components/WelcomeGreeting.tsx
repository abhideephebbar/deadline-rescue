import React, { useState } from 'react';
import { X, Sparkles, Compass } from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { AppFacts } from '../utils/facts';
import {
  getWelcomeGreeting,
  dismissGreetingToday,
  markFirstVisitSeen,
  GreetingActionType,
} from '../utils/greeting';
import { Glass } from './ui/Glass';

interface WelcomeGreetingProps {
  facts: AppFacts;
  now?: Date;
  onAction: (action: GreetingActionType, taskId?: string) => void;
}

export const WelcomeGreeting: React.FC<WelcomeGreetingProps> = ({
  facts,
  now = new Date(),
  onAction,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const greetingData = getWelcomeGreeting(facts, now);

  if (isDismissed || !greetingData) {
    return null;
  }

  const handleDismiss = () => {
    markFirstVisitSeen();
    dismissGreetingToday(now);
    setIsDismissed(true);
  };

  const handleChipClick = (action: GreetingActionType, taskId?: string) => {
    markFirstVisitSeen();
    onAction(action, taskId);
  };

  return (
    <AnimatePresence>
      <m.div
        key="welcome-greeting-banner"
        initial={{ opacity: 0, y: -8, height: 'auto' }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -8, height: 0 }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
        className="overflow-hidden mb-6"
      >
        <Glass className="p-4 sm:p-5 space-y-3">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center space-x-2 text-orange-400">
              {greetingData.type === 'first_visit' ? (
                <Compass className="w-5 h-5 shrink-0" />
              ) : (
                <Sparkles className="w-5 h-5 shrink-0" />
              )}
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                {greetingData.greeting}
              </h2>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss greeting"
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Subtext description */}
          <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed max-w-2xl">
            {greetingData.subtext}
          </p>

          {/* Action Chips */}
          <div className="flex flex-wrap gap-2 pt-1">
            {greetingData.actionChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => handleChipClick(chip.action, chip.taskId)}
                className="px-3 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20 text-orange-200 hover:text-white text-xs font-medium transition-colors cursor-pointer active:scale-95 text-left flex items-center space-x-1"
              >
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </Glass>
      </m.div>
    </AnimatePresence>
  );
};
