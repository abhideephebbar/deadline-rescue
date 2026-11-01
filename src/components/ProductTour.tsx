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

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
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

/**
 * Computes the clamped & height-capped spotlight rect alongside overlap-free popover placement.
 */
function computePlacementAndSpotlight(
  targetRect: DOMRect | null,
  isMobile: boolean,
  vh: number,
  vw: number
): {
  spotlight: SpotlightRect | null;
  popoverStyle: React.CSSProperties;
  popoverContainerClass: string;
} {
  if (!targetRect || targetRect.width < 8 || targetRect.height < 8) {
    return {
      spotlight: null,
      popoverStyle: {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 60,
      },
      popoverContainerClass: 'fixed w-[360px] max-w-sm',
    };
  }

  if (isMobile) {
    // FIX 5: Clamp spotlight bottom so highlighted element is never behind bottom sheet
    const maxBottom = vh - 240; // 220px sheet height + 20px clearance
    const left = Math.max(targetRect.left, 12);
    const right = Math.min(targetRect.right, vw - 12);
    let top = Math.max(targetRect.top, 12);
    let bottom = Math.min(targetRect.bottom, maxBottom);

    if (bottom - top > 340) {
      bottom = top + 340;
    }
    if (bottom < top) {
      bottom = top;
    }

    return {
      spotlight: {
        top,
        left,
        bottom,
        right,
        width: Math.max(0, right - left),
        height: Math.max(0, bottom - top),
      },
      popoverStyle: {
        zIndex: 60,
      },
      popoverContainerClass: 'fixed bottom-4 left-4 right-4',
    };
  }

  // Desktop anchored placement
  const left = Math.max(targetRect.left, 12);
  const right = Math.min(targetRect.right, vw - 12);
  let top = Math.max(targetRect.top, 12);
  let bottom = Math.min(targetRect.bottom, vh - 12);

  // Horizontal position: center around targetCenterX, clamped inside viewport
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const leftPos = Math.max(16, Math.min(vw - 380, targetCenterX - 180));

  let popoverTop: number;

  // FIX 4: Overlap guarantee
  // a. Place BELOW if innerHeight - spotlight.bottom >= 236
  const tentativeBottom = Math.min(bottom, top + 340);
  if (vh - tentativeBottom >= 236) {
    bottom = tentativeBottom;
    popoverTop = bottom + 12;
  } else if (top >= 236) {
    // b. Place ABOVE if spotlight.top >= 236
    if (bottom - top > 340) {
      top = Math.max(12, bottom - 340);
    }
    popoverTop = top - 232;
  } else {
    // c. Pin popover to bottom and re-crop spotlight bottom so they never intersect
    popoverTop = vh - 236;
    bottom = Math.min(bottom, vh - 248);
    if (bottom - top > 340) {
      top = Math.max(12, bottom - 340);
    }
    if (bottom < top) {
      bottom = top;
    }
  }

  const spotlightWidth = Math.max(0, right - left);
  const spotlightHeight = Math.max(0, bottom - top);

  return {
    spotlight: {
      top,
      left,
      bottom,
      right,
      width: spotlightWidth,
      height: spotlightHeight,
    },
    popoverStyle: {
      top: popoverTop,
      left: leftPos,
      zIndex: 60,
    },
    popoverContainerClass: 'fixed w-[360px] max-w-sm',
  };
}

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

  // Target element measurement with polling across tab transitions + settle delay
  useEffect(() => {
    if (!isOpen || !currentStep) return;

    let timerId: number | undefined;
    let settleTimerId: number | undefined;
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
        if (rect.width >= 8 && rect.height >= 8) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const initialRect = el.getBoundingClientRect();
          setTargetRect(initialRect.width >= 8 && initialRect.height >= 8 ? initialRect : null);

          // FIX 6: Re-measure ~150ms later after smooth scroll settles
          settleTimerId = window.setTimeout(() => {
            const settledEl = findTargetElement(currentStep.targetId);
            if (settledEl) {
              const settledRect = settledEl.getBoundingClientRect();
              setTargetRect(settledRect.width >= 8 && settledRect.height >= 8 ? settledRect : null);
            } else {
              setTargetRect(null);
            }
          }, 150);
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
      if (!currentStep.targetId) {
        setTargetRect(null);
        return;
      }
      const el = findTargetElement(currentStep.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect(rect.width >= 8 && rect.height >= 8 ? rect : null);
      } else {
        setTargetRect(null);
      }
    };

    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      if (timerId !== undefined) clearTimeout(timerId);
      if (settleTimerId !== undefined) clearTimeout(settleTimerId);
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
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;

  // Personalize title on outro step if name is known
  const storedName = getStoredName();
  const stepTitle =
    currentStep.id === 'outro'
      ? storedName
        ? `You are set, ${storedName}`
        : 'You are set'
      : currentStep.title;

  // Compute clamped spotlight rect and overlap-safe popover styling
  const { spotlight, popoverStyle, popoverContainerClass } =
    computePlacementAndSpotlight(targetRect, isMobile, vh, vw);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-step-title"
      aria-describedby="tour-step-desc"
      className="fixed inset-0 z-50 overflow-hidden font-sans"
    >
      {/* Background Dimmer & Click-outside-to-skip Layer */}
      {spotlight ? (
        <div
          onClick={handleSkip}
          className="fixed inset-0 bg-transparent"
          style={{ zIndex: 54 }}
        />
      ) : (
        <div
          onClick={handleSkip}
          className="fixed inset-0 bg-black/50 transition-opacity animate-fade-in"
          style={{ zIndex: 54 }}
        />
      )}

      {/* Spotlight cutout highlight around clamped target element */}
      {spotlight && (
        <>
          <div
            style={{
              position: 'fixed',
              top: spotlight.top - 4,
              left: spotlight.left - 4,
              width: spotlight.width + 8,
              height: spotlight.height + 8,
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
              top: spotlight.top - 8,
              left: spotlight.left - 8,
              width: spotlight.width + 16,
              height: spotlight.height + 16,
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
