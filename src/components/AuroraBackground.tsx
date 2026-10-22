import React, { useEffect, useState } from 'react';
import { WorkloadMood } from '../utils/mood';

interface AuroraBackgroundProps {
  mood: WorkloadMood;
  reduceEffects?: boolean;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  mood,
  reduceEffects = false,
}) => {
  const [isTabHidden, setIsTabHidden] = useState(false);

  useEffect(() => {
    const handleVisibility = () => {
      setIsTabHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const shouldAnimate = !reduceEffects && !isTabHidden;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden -z-20 bg-[#09090b] select-none"
      style={{ contain: 'strict' }}
    >
      {/* 1. Calm mood layer (Teal & Emerald) */}
      <div
        className="absolute inset-0 transition-opacity duration-1200 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ opacity: mood === 'calm' ? 0.85 : 0 }}
      >
        <div
          className={`absolute -top-32 -left-20 w-[480px] sm:w-[680px] h-[480px] sm:h-[680px] rounded-full blur-[100px] sm:blur-[140px] opacity-25 bg-teal-500/50 ${
            shouldAnimate ? 'animate-aurora-blob-1' : ''
          }`}
          style={{ willChange: shouldAnimate ? 'transform' : 'auto' }}
        />
        <div
          className={`absolute top-[20%] -right-24 w-[420px] sm:w-[620px] h-[420px] sm:h-[620px] rounded-full blur-[110px] sm:blur-[150px] opacity-20 bg-emerald-500/40 ${
            shouldAnimate ? 'animate-aurora-blob-2' : ''
          }`}
          style={{ willChange: shouldAnimate ? 'transform' : 'auto' }}
        />
        <div
          className={`absolute -bottom-24 left-[20%] w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full blur-[120px] sm:blur-[160px] opacity-20 bg-sky-600/35 ${
            shouldAnimate ? 'animate-aurora-blob-3' : ''
          }`}
          style={{ willChange: shouldAnimate ? 'transform' : 'auto' }}
        />
      </div>

      {/* 2. Busy mood layer (Amber & Orange) */}
      <div
        className="absolute inset-0 transition-opacity duration-1200 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ opacity: mood === 'busy' ? 0.9 : 0 }}
      >
        <div
          className={`absolute -top-32 -left-20 w-[480px] sm:w-[680px] h-[480px] sm:h-[680px] rounded-full blur-[100px] sm:blur-[140px] opacity-30 bg-amber-500/45 ${
            shouldAnimate ? 'animate-aurora-blob-1' : ''
          }`}
          style={{ willChange: shouldAnimate ? 'transform' : 'auto' }}
        />
        <div
          className={`absolute top-[20%] -right-24 w-[420px] sm:w-[620px] h-[420px] sm:h-[620px] rounded-full blur-[110px] sm:blur-[150px] opacity-25 bg-orange-500/40 ${
            shouldAnimate ? 'animate-aurora-blob-2' : ''
          }`}
          style={{ willChange: shouldAnimate ? 'transform' : 'auto' }}
        />
        <div
          className={`absolute -bottom-24 left-[20%] w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full blur-[120px] sm:blur-[160px] opacity-20 bg-yellow-600/35 ${
            shouldAnimate ? 'animate-aurora-blob-3' : ''
          }`}
          style={{ willChange: shouldAnimate ? 'transform' : 'auto' }}
        />
      </div>

      {/* 3. Overloaded mood layer (Warm Red & Rose) */}
      <div
        className="absolute inset-0 transition-opacity duration-1200 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ opacity: mood === 'overloaded' ? 0.95 : 0 }}
      >
        <div
          className={`absolute -top-32 -left-20 w-[480px] sm:w-[680px] h-[480px] sm:h-[680px] rounded-full blur-[100px] sm:blur-[140px] opacity-35 bg-red-600/45 ${
            shouldAnimate ? 'animate-aurora-blob-1' : ''
          }`}
          style={{ willChange: shouldAnimate ? 'transform' : 'auto' }}
        />
        <div
          className={`absolute top-[20%] -right-24 w-[420px] sm:w-[620px] h-[420px] sm:h-[620px] rounded-full blur-[110px] sm:blur-[150px] opacity-30 bg-rose-600/40 ${
            shouldAnimate ? 'animate-aurora-blob-2' : ''
          }`}
          style={{ willChange: shouldAnimate ? 'transform' : 'auto' }}
        />
        <div
          className={`absolute -bottom-24 left-[20%] w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full blur-[120px] sm:blur-[160px] opacity-25 bg-amber-700/35 ${
            shouldAnimate ? 'animate-aurora-blob-3' : ''
          }`}
          style={{ willChange: shouldAnimate ? 'transform' : 'auto' }}
        />
      </div>

      {/* 4. Film Grain Overlay (Tiny SVG noise data URI with ~0.04 opacity) */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-screen pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
        }}
      />
    </div>
  );
};
