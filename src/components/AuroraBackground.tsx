import React, { useEffect, useState } from 'react';
import { WorkloadMood } from '../utils/mood';

interface AuroraBackgroundProps {
  mood: WorkloadMood;
  reduceEffects?: boolean;
  now?: Date;
}

export const AuroraBackground: React.FC<AuroraBackgroundProps> = ({
  mood,
  reduceEffects = false,
  now = new Date(),
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
      className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-[#09090b] select-none"
    >
      {/* 1. Calm mood layer (Teal & Emerald) */}
      <div
        className="absolute inset-0 transition-opacity duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ opacity: mood === 'calm' ? 1 : 0 }}
      >
        <div
          className={`absolute -top-32 -left-20 w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full blur-[90px] sm:blur-[120px] bg-teal-500/30 ${
            shouldAnimate ? 'animate-aurora-blob-1' : ''
          }`}
          style={{ willChange: shouldAnimate ? 'transform' : 'auto' }}
        />
        <div
          className={`absolute top-[20%] -right-24 w-[450px] sm:w-[650px] h-[450px] sm:h-[650px] rounded-full blur-[90px] sm:blur-[130px] bg-emerald-500/25 ${
            shouldAnimate ? 'animate-aurora-blob-2' : ''
          }`}
          style={{ willChange: shouldAnimate ? 'transform' : 'auto' }}
        />
        <div
          className={`absolute -bottom-24 left-[15%] w-[500px] sm:w-[720px] h-[500px] sm:h-[720px] rounded-full blur-[100px] sm:blur-[140px] bg-cyan-600/20 ${
            shouldAnimate ? 'animate-aurora-blob-3' : ''
          }`}
          style={{ willChange: shouldAnimate ? 'transform' : 'auto' }}
        />
      </div>

      {/* 2. Busy mood layer (Amber & Orange) */}
      <div
        className="absolute inset-0 transition-opacity duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ opacity: mood === 'busy' ? 1 : 0 }}
      >
        <div
          className={`absolute -top-32 -left-20 w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full blur-[90px] sm:blur-[120px] bg-amber-500/30 ${
            shouldAnimate ? 'animate-aurora-blob-1' : ''
          }`}
          style={{ willChange: shouldAnimate ? 'transform' : 'auto' }}
        />
        <div
          className={`absolute top-[20%] -right-24 w-[450px] sm:w-[650px] h-[450px] sm:h-[650px] rounded-full blur-[90px] sm:blur-[130px] bg-orange-500/25 ${
            shouldAnimate ? 'animate-aurora-blob-2' : ''
          }`}
          style={{ willChange: shouldAnimate ? 'transform' : 'auto' }}
        />
        <div
          className={`absolute -bottom-24 left-[15%] w-[500px] sm:w-[720px] h-[500px] sm:h-[720px] rounded-full blur-[100px] sm:blur-[140px] bg-yellow-600/20 ${
            shouldAnimate ? 'animate-aurora-blob-3' : ''
          }`}
          style={{ willChange: shouldAnimate ? 'transform' : 'auto' }}
        />
      </div>

      {/* 3. Overloaded mood layer (Warm Red & Rose) */}
      <div
        className="absolute inset-0 transition-opacity duration-1000 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ opacity: mood === 'overloaded' ? 1 : 0 }}
      >
        <div
          className={`absolute -top-32 -left-20 w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full blur-[90px] sm:blur-[120px] bg-rose-600/35 ${
            shouldAnimate ? 'animate-aurora-blob-1' : ''
          }`}
          style={{ willChange: shouldAnimate ? 'transform' : 'auto' }}
        />
        <div
          className={`absolute top-[20%] -right-24 w-[450px] sm:w-[650px] h-[450px] sm:h-[650px] rounded-full blur-[90px] sm:blur-[130px] bg-red-600/30 ${
            shouldAnimate ? 'animate-aurora-blob-2' : ''
          }`}
          style={{ willChange: shouldAnimate ? 'transform' : 'auto' }}
        />
        <div
          className={`absolute -bottom-24 left-[15%] w-[500px] sm:w-[720px] h-[500px] sm:h-[720px] rounded-full blur-[100px] sm:blur-[140px] bg-orange-700/25 ${
            shouldAnimate ? 'animate-aurora-blob-3' : ''
          }`}
          style={{ willChange: shouldAnimate ? 'transform' : 'auto' }}
        />
      </div>

      {/* 4. Time-of-day subtle atmospheric tint (cooler at night, warmer in morning) */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000"
        style={{
          background: (() => {
            const hour = now.getHours();
            if (hour >= 21 || hour < 5) {
              // Night / late night: cool deep indigo
              return 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(30, 27, 75, 0.35), transparent 70%)';
            }
            if (hour >= 5 && hour < 12) {
              // Early morning / morning: warm dawn amber
              return 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(245, 158, 11, 0.16), transparent 70%)';
            }
            if (hour >= 12 && hour < 17) {
              // Afternoon: gentle sky daylight
              return 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(56, 189, 248, 0.10), transparent 70%)';
            }
            // Evening: sunset rose
            return 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(244, 63, 94, 0.16), transparent 70%)';
          })(),
        }}
      />

      {/* 5. Film Grain Overlay (Tiny SVG noise data URI with ~0.04 opacity) */}
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
