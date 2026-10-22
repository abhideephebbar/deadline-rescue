import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Sparkles, Check } from 'lucide-react';
import { TOUR_STEPS, TourStep, markTourSeen } from '../utils/tour';

interface ProductTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProductTour: React.FC<ProductTourProps> = ({ isOpen, onClose }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const currentStep: TourStep | undefined = TOUR_STEPS[currentStepIndex];

  // Measure target element position
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !currentStep) return;

    const el = document.getElementById(currentStep.targetId);
    if (el) {
      // Scroll element smoothly into view if off-screen
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, currentStep]);

  useEffect(() => {
    updateTargetPosition();
    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition, true);

    return () => {
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition, true);
    };
  }, [updateTargetPosition]);

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
        // Simple focus trap
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

  // Calculate popover positioning relative to target or center
  let popoverStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 60,
  };

  if (targetRect) {
    const isMobile = window.innerWidth < 640;
    const spaceBelow = window.innerHeight - targetRect.bottom;
    const placeAbove = spaceBelow < 220;

    const targetCenterX = targetRect.left + targetRect.width / 2;
    const leftPos = Math.max(16, Math.min(window.innerWidth - 340, targetCenterX - 160));

    popoverStyle = {
      position: 'fixed',
      top: placeAbove ? Math.max(16, targetRect.top - 200) : targetRect.bottom + 12,
      left: isMobile ? '50%' : leftPos,
      transform: isMobile ? 'translateX(-50%)' : 'none',
      zIndex: 60,
    };
  }

  const isLastStep = currentStepIndex === TOUR_STEPS.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-step-title"
      aria-describedby="tour-step-desc"
      className="fixed inset-0 z-50 overflow-hidden font-sans"
    >
      {/* Dimmed Background Overlay */}
      <div
        onClick={handleSkip}
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-fade-in"
      />

      {/* Spotlight cutout highlight around target element */}
      {targetRect && (
        <div
          style={{
            position: 'fixed',
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            borderRadius: '10px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.55), 0 0 20px rgba(249, 115, 22, 0.4)',
            pointerEvents: 'none',
            zIndex: 55,
            border: '2px solid rgba(249, 115, 22, 0.8)',
          }}
        />
      )}

      {/* Popover Card */}
      <div
        ref={popoverRef}
        style={popoverStyle}
        className="w-[calc(100vw-2rem)] sm:w-84 max-w-sm rounded-xl border border-white/15 bg-[#141414] p-4 sm:p-5 shadow-2xl space-y-4 animate-scale-in text-zinc-100"
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
                  className={`h-1.5 rounded-full transition-all ${
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

        {/* Text description */}
        <div className="space-y-1.5">
          <h3 id="tour-step-title" className="text-sm font-semibold text-white">
            {currentStep.title}
          </h3>
          <p id="tour-step-desc" className="text-xs text-zinc-300 leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs">
          <button
            type="button"
            onClick={handleSkip}
            className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            Skip tour
          </button>

          <div className="flex items-center space-x-2">
            {currentStepIndex > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded border border-white/10 text-zinc-300 hover:bg-white/5 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded bg-orange-500 hover:bg-orange-400 text-black font-semibold transition-colors cursor-pointer"
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

