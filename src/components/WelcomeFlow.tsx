import React, { useState, useRef, useEffect } from 'react';
import { AnimatePresence, m, LazyMotion, domMax } from 'motion/react';
import { CalendarClock, Compass, GraduationCap, Sparkles, ArrowRight } from 'lucide-react';
import { Glass } from './ui/Glass';
import {
  sanitizeGreetingName,
  setStoredName,
  setNameSkipped,
  markFirstVisitSeen,
} from '../utils/greeting';

export type WelcomeIntent = 'deadlines' | 'timetable' | 'exams' | 'exploring';

export const INTENT_STORAGE_KEY = 'deadline_rescue_intent';

export interface WelcomeFlowProps {
  onComplete: (intent: WelcomeIntent) => void;
}

export const WelcomeFlow: React.FC<WelcomeFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [nameInput, setNameInput] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 2) {
      // Focus name input on step 2 mount
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleNextFromWelcome = () => {
    setStep(2);
  };

  const handleSaveName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = sanitizeGreetingName(nameInput);
    if (clean) {
      setStoredName(clean);
    } else {
      setNameSkipped(true);
    }
    setStep(3);
  };

  const handleSkipName = () => {
    setNameSkipped(true);
    setStep(3);
  };

  const handleSelectIntent = (intent: WelcomeIntent) => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(INTENT_STORAGE_KEY, intent);
      }
    } catch {
      // ignore
    }
    markFirstVisitSeen();
    onComplete(intent);
  };

  const intentOptions: Array<{
    id: WelcomeIntent;
    title: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'deadlines',
      title: 'Drowning in deadlines',
      description: 'Triage everything due soon and get breathing room.',
      icon: <CalendarClock className="w-5 h-5 text-orange-400" />,
    },
    {
      id: 'timetable',
      title: 'I want a study timetable',
      description: 'Plan daily hours and balance your workload.',
      icon: <Compass className="w-5 h-5 text-amber-400" />,
    },
    {
      id: 'exams',
      title: 'Exam prep crunch',
      description: 'Focus on what matters most before tests.',
      icon: <GraduationCap className="w-5 h-5 text-emerald-400" />,
    },
    {
      id: 'exploring',
      title: 'Just exploring',
      description: 'Take a look around and see how it works.',
      icon: <Sparkles className="w-5 h-5 text-blue-400" />,
    },
  ];

  return (
    <LazyMotion features={domMax}>
      <div className="fixed inset-0 z-50 bg-[#09090c] text-zinc-100 flex flex-col items-center justify-center p-4 sm:p-6 overflow-y-auto min-h-screen">
        {/* Subtle background ambient glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-orange-500/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-[380px] h-[380px] bg-amber-500/5 rounded-full blur-[100px]" />
        </div>

        <div className="w-full max-w-md my-auto relative z-10">
          <Glass className="p-6 sm:p-8 border border-white/10 shadow-2xl">
            {/* Step Indicators */}
            <div className="flex items-center justify-center space-x-2 mb-6" aria-label={`Step ${step} of 3`}>
              <div
                className={`h-1 rounded-full transition-all duration-300 ${
                  step === 1 ? 'w-8 bg-orange-400' : 'w-2 bg-white/20'
                }`}
              />
              <div
                className={`h-1 rounded-full transition-all duration-300 ${
                  step === 2 ? 'w-8 bg-orange-400' : 'w-2 bg-white/20'
                }`}
              />
              <div
                className={`h-1 rounded-full transition-all duration-300 ${
                  step === 3 ? 'w-8 bg-orange-400' : 'w-2 bg-white/20'
                }`}
              />
            </div>

            <AnimatePresence mode="wait">
              {step === 1 && (
                <m.div
                  key="step-1"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                >
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleNextFromWelcome();
                    }}
                    className="space-y-6 text-center"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center mx-auto shadow-inner">
                      <Sparkles className="w-6 h-6" />
                    </div>

                    <div className="space-y-2">
                      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
                        Deadline Rescue
                      </h1>
                      <p className="text-sm text-zinc-300 leading-relaxed max-w-xs mx-auto">
                        Paste your deadlines. Get a calm plan for what to do next — no guilt, no chaos.
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        autoFocus
                        className="w-full py-3 px-6 rounded-full bg-orange-500 hover:bg-orange-400 text-black font-semibold text-sm transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2"
                      >
                        <span>Get started</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                </m.div>
              )}

              {step === 2 && (
                <m.div
                  key="step-2"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-5"
                >
                  <div className="space-y-1.5 text-center">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
                      First up — what should I call you?
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Stored only on your device to personalize your greeting.
                    </p>
                  </div>

                  <form onSubmit={handleSaveName} className="space-y-4 pt-1">
                    <div>
                      <label htmlFor="welcome-name-input" className="sr-only">
                        Your first name
                      </label>
                      <input
                        ref={nameInputRef}
                        id="welcome-name-input"
                        type="text"
                        value={nameInput}
                        maxLength={24}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="e.g. Alex"
                        className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 focus:border-orange-500 text-white placeholder-zinc-500 text-sm focus:outline-none transition-colors text-center"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 px-6 rounded-full bg-orange-500 hover:bg-orange-400 text-black font-semibold text-sm transition-all shadow-lg shadow-orange-500/20 active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2"
                    >
                      <span>Continue</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="text-center pt-1">
                      <button
                        type="button"
                        onClick={handleSkipName}
                        className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer py-1 underline underline-offset-4 decoration-zinc-600 hover:decoration-white"
                      >
                        Skip for now
                      </button>
                    </div>
                  </form>
                </m.div>
              )}

              {step === 3 && (
                <m.div
                  key="step-3"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-5"
                >
                  <div className="space-y-1.5 text-center">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-sans">
                      What brings you here today?
                    </h2>
                    <p className="text-xs text-zinc-400">
                      Pick one so we can set things up for you.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {intentOptions.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectIntent(opt.id)}
                        className="text-left p-3.5 rounded-2xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] hover:border-orange-500/40 transition-all cursor-pointer group flex flex-col justify-between active:scale-[0.98]"
                      >
                        <div>
                          <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                            {opt.icon}
                          </div>
                          <h3 className="text-xs font-semibold text-white group-hover:text-orange-200 transition-colors">
                            {opt.title}
                          </h3>
                          <p className="text-[11px] text-zinc-400 leading-snug mt-1">
                            {opt.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </Glass>
        </div>
      </div>
    </LazyMotion>
  );
};
