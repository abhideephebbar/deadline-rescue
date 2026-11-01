import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Check,
  Plus,
  Sun,
  Flame,
  GraduationCap,
  Layers,
  Calendar,
  CheckSquare,
  MessageSquare,
  Settings,
  CheckCircle2,
} from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { TOUR_STEPS, TourStep, markTourSeen } from '../utils/tour';
import { getStoredName } from '../utils/greeting';

interface ProductTourProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: 'today' | 'week' | 'tasks';
  onStepChange?: (step: TourStep) => void;
}

function findTargetElement(targetId: string | null): HTMLElement | null {
  if (!targetId) return null;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  if (isMobile) {
    const mobileEl = document.getElementById(`${targetId}-mobile`);
    if (mobileEl) return mobileEl;
  }
  return document.getElementById(targetId);
}

const renderStepIcon = (iconName: string) => {
  switch (iconName) {
    case 'sparkles':
      return <Sparkles className="w-4 h-4 text-orange-400" />;
    case 'plus':
      return <Plus className="w-4 h-4 text-orange-400" />;
    case 'sun':
      return <Sun className="w-4 h-4 text-orange-400" />;
    case 'flame':
      return <Flame className="w-4 h-4 text-orange-400" />;
    case 'graduation-cap':
      return <GraduationCap className="w-4 h-4 text-orange-400" />;
    case 'layers':
      return <Layers className="w-4 h-4 text-orange-400" />;
    case 'calendar':
      return <Calendar className="w-4 h-4 text-orange-400" />;
    case 'check-square':
      return <CheckSquare className="w-4 h-4 text-orange-400" />;
    case 'message-square':
      return <MessageSquare className="w-4 h-4 text-orange-400" />;
    case 'settings':
      return <Settings className="w-4 h-4 text-orange-400" />;
    case 'check-circle':
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
    default:
      return <Sparkles className="w-4 h-4 text-orange-400" />;
  }
};

export const ProductTour: React.FC<ProductTourProps> = ({
  isOpen,
  onClose,
  activeTab,
  onStepChange,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Reset to step 0 when reopened
  useEffect(() => {
    if (isOpen) {
      setCurrentStepIndex(0);
    }
  }, [isOpen]);

  const currentStep: TourStep | undefined = TOUR_STEPS[currentStepIndex];

  // Inform parent when tab switch is required
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    if (activeTab && currentStep.tab !== activeTab && onStepChange) {
      onStepChange(currentStep);
    }
  }, [isOpen, currentStep, activeTab, onStepChange]);

  // Target element measurement with polling across tab transitions
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    let timerId: number | undefined;
    let pollCount = 0;
    const maxPolls = 40; // 40 * 50ms = 2000ms max
    const pollInterval = 50;

    const findTarget = () => {
      if (!currentStep.targetId) {
        setTargetRect(null);
        return;
      }

      const el = findTargetElement(currentStep.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTargetRect(el.getBoundingClientRect());
          return;
        }
      }

      pollCount++;
      if (pollCount < maxPolls) {
        timerId = window.setTimeout(findTarget, pollInterval);
      } else {
        setTargetRect(null);
      }
    };

    findTarget();

    const handleUpdate = () => {
      if (!currentStep.targetId) return;
      const el = findTargetElement(currentStep.targetId);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      }
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      if (timerId !== undefined) clearTimeout(timerId);
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isOpen, currentStepIndex, currentStep]);

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleComplete = () => {
    markTourSeen();
    onClose();
  };

  const handleSkip = () => {
    markTourSeen();
    onClose();
  };

  // Keyboard navigation & accessibility
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleSkip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleBack();
      } else if (e.key === 'Tab' && popoverRef.current) {
        const focusables = popoverRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  if (!isOpen || !currentStep) return null;

  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  // Personalize title on outro step if name is known
  const storedName = getStoredName();
  const stepTitle =
    currentStep.id === 'outro'
      ? storedName
        ? `You are set, ${storedName}`
        : 'You are set'
      : currentStep.title;

  // Position popover
  let popoverContainerClass = '';
  let popoverStyle: React.CSSProperties = {};

  if (isMobile) {
    // Mobile bottom sheet style
    popoverContainerClass = 'fixed bottom-4 left-4 right-4 z-60';
    popoverStyle = {};
  } else if (targetRect) {
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const placeAbove = spaceBelow < 220;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const leftPos = Math.max(16, Math.min(window.innerWidth - 380, targetCenterX - 180));

    popoverContainerClass = 'fixed z-60 w-[360px] max-w-sm';
    popoverStyle = {
      top: placeAbove ? Math.max(16, targetRect.top - 210) : targetRect.bottom + 12,
      left: leftPos,
    };
  } else {
    // Screen-centered fallback
    popoverContainerClass = 'fixed z-60 w-[360px] max-w-sm';
    popoverStyle = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    };
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-step-title"
      aria-describedby="tour-step-desc"
      className="fixed inset-0 z-50 overflow-hidden font-sans"
    >
      {/* Background Dimmer & Click-outside-to-skip Layer */}
      {targetRect ? (
        <div
          onClick={handleSkip}
          className="fixed inset-0 bg-transparent"
          style={{ zIndex: 54 }}
        />
      ) : (
        <div
          onClick={handleSkip}
          className="fixed inset-0 bg-black/50 transition-opacity animate-fade-in"
        />
      )}

      {/* Spotlight cutout highlight around target element */}
      {targetRect && (
        <>
          <div
            style={{
              position: 'fixed',
              top: targetRect.top - 4,
              left: targetRect.left - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
              borderRadius: '12px',
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5), 0 0 24px rgba(249, 115, 22, 0.4)',
              pointerEvents: 'none',
              zIndex: 55,
              border: '2px solid rgba(249, 115, 22, 0.8)',
            }}
          />
          {/* Subtle pulsing outer ring */}
          <m.div
            animate={{
              scale: [1, 1.05, 1],
              opacity: [0.35, 0.75, 0.35],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            style={{
              position: 'fixed',
              top: targetRect.top - 8,
              left: targetRect.left - 8,
              width: targetRect.width + 16,
              height: targetRect.height + 16,
              borderRadius: '16px',
              pointerEvents: 'none',
              zIndex: 54,
              border: '1.5px solid rgba(249, 115, 22, 0.6)',
            }}
          />
        </>
      )}

      {/* Popover Card */}
      <div
        ref={popoverRef}
        style={popoverStyle}
        className={`${popoverContainerClass} rounded-2xl border border-white/15 bg-[#141418]/95 backdrop-blur-2xl p-4 sm:p-5 shadow-2xl space-y-4 text-zinc-100`}
      >
        {/* Header & Step progress */}
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center space-x-1.5 font-medium text-orange-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              Step {currentStepIndex + 1} of {TOUR_STEPS.length}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Step Dots */}
            <div className="flex items-center space-x-1">
              {TOUR_STEPS.map((_, idx) => (
                <span
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    idx === currentStepIndex
                      ? 'w-4 bg-orange-500'
                      : 'w-1.5 bg-white/20'
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={handleSkip}
              aria-label="Skip tour"
              className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
          <m.div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
            initial={false}
            animate={{ width: `${((currentStepIndex + 1) / TOUR_STEPS.length) * 100}%` }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          />
        </div>

        {/* Text description with icon and smooth transition */}
        <AnimatePresence mode="wait">
          <m.div
            key={currentStep.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 shrink-0 mt-0.5">
                {renderStepIcon(currentStep.icon)}
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <h3 id="tour-step-title" className="text-sm font-semibold text-white tracking-tight">
                  {stepTitle}
                </h3>
                <p id="tour-step-desc" className="text-xs text-zinc-300 leading-relaxed">
                  {currentStep.description}
                </p>
              </div>
            </div>
          </m.div>
        </AnimatePresence>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs">
          <button
            type="button"
            onClick={handleSkip}
            className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer py-1"
          >
            Skip tour
          </button>

          <div className="flex items-center space-x-2">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border border-white/10 text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-black font-semibold transition-colors cursor-pointer shadow-sm active:scale-95"
            >
              <span>{isLastStep ? 'Get started' : 'Next'}</span>
              {isLastStep ? (
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
