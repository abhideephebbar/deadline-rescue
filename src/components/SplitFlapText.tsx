import React, {
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
  createContext,
  useContext,
} from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioContextType {
  isMuted: boolean;
  toggleMute: () => void;
  playClick: () => void;
}

const SplitFlapAudioContext = createContext<AudioContextType | null>(null);

export function useSplitFlapAudio() {
  return useContext(SplitFlapAudioContext);
}

export function SplitFlapAudioProvider({ children }: { children: React.ReactNode }) {
  const [isMuted, setIsMuted] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (typeof window === 'undefined') return null;
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    return audioContextRef.current;
  }, []);

  const playClick = useCallback(() => {
    if (isMuted) return;

    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(750 + Math.random() * 300, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.012);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, ctx.currentTime);
      filter.Q.setValueAtTime(0.7, ctx.currentTime);

      gainNode.gain.setValueAtTime(0.04, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.015);

      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.015);
    } catch {
      // Audio unsupported or blocked
    }
  }, [isMuted, getAudioContext]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
    if (isMuted) {
      try {
        const ctx = getAudioContext();
        if (ctx && ctx.state === 'suspended') {
          ctx.resume();
        }
      } catch {
        // Audio error
      }
    }
  }, [isMuted, getAudioContext]);

  const value = useMemo(() => ({ isMuted, toggleMute, playClick }), [isMuted, toggleMute, playClick]);

  return (
    <SplitFlapAudioContext.Provider value={value}>
      {children}
    </SplitFlapAudioContext.Provider>
  );
}

export function SplitFlapMuteToggle({ className = '' }: { className?: string }) {
  const audio = useSplitFlapAudio();
  if (!audio) return null;

  return (
    <button
      onClick={audio.toggleMute}
      type="button"
      className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-zinc-500 hover:text-orange-400 transition-colors duration-200 ${className}`}
      aria-label={audio.isMuted ? 'Enable mechanical flap audio' : 'Mute audio'}
    >
      {audio.isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-orange-400" />}
      <span>{audio.isMuted ? 'Sound: Off' : 'Sound: Flap FX'}</span>
    </button>
  );
}

interface SplitFlapTextProps {
  text: string;
  className?: string;
  speed?: number;
}

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_'.split('');

function SplitFlapChar({
  char,
  index,
  animationKey,
  speed,
  playClick,
}: {
  char: string;
  index: number;
  animationKey: number;
  speed: number;
  playClick?: () => void;
}) {
  const displayChar = CHARSET.includes(char) ? char : ' ';
  const isSpace = char === ' ';
  const [currentChar, setCurrentChar] = useState(displayChar);
  const [isSettled, setIsSettled] = useState(true);
  const [isFlipping, setIsFlipping] = useState(false);

  const tileDelay = 0.08 * index;

  useEffect(() => {
    if (isSpace) {
      setCurrentChar(' ');
      setIsSettled(true);
      return;
    }

    setIsSettled(false);
    setIsFlipping(true);

    const baseFlips = 6;
    let flipCount = 0;
    const startDelay = tileDelay * 500;

    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        const threshold = baseFlips + index * 2;
        if (flipCount >= threshold) {
          clearInterval(interval);
          setCurrentChar(displayChar);
          setIsSettled(true);
          setIsFlipping(false);
          if (playClick) playClick();
          return;
        }

        const randChar = CHARSET[Math.floor(Math.random() * (CHARSET.length - 2))];
        setCurrentChar(randChar);
        if (flipCount % 2 === 0 && playClick) playClick();
        flipCount++;
      }, speed);

      return () => clearInterval(interval);
    }, startDelay);

    return () => clearTimeout(timeout);
  }, [displayChar, isSpace, tileDelay, animationKey, index, speed, playClick]);

  if (isSpace) {
    return <div className="w-[0.25em] shrink-0" />;
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center font-display uppercase select-none transition-colors duration-150 border ${
        isSettled
          ? 'bg-zinc-950 border-white/10 text-white'
          : 'bg-orange-500/10 border-orange-500/40 text-orange-400'
      }`}
      style={{
        width: '0.62em',
        height: '1.02em',
        perspective: '400px',
      }}
    >
      {/* Top / Bottom split line seam */}
      <div className="absolute inset-x-0 top-1/2 h-[1px] bg-black/80 z-20 pointer-events-none" />

      {/* Top half */}
      <div className="absolute inset-x-0 top-0 bottom-1/2 flex items-end justify-center overflow-hidden border-b border-black/40">
        <span
          className="block translate-y-[0.51em] leading-none transition-transform duration-100"
          style={{ transform: isFlipping ? 'scaleY(0.92)' : 'none' }}
        >
          {currentChar}
        </span>
      </div>

      {/* Bottom half */}
      <div className="absolute inset-x-0 top-1/2 bottom-0 flex items-start justify-center overflow-hidden">
        <span className="block -translate-y-[0.51em] leading-none">
          {currentChar}
        </span>
      </div>
    </div>
  );
}

export function SplitFlapText({
  text,
  className = '',
  speed = 45,
}: SplitFlapTextProps) {
  const chars = useMemo(() => text.split(''), [text]);
  const [animationKey, setAnimationKey] = useState(0);
  const audio = useSplitFlapAudio();

  const handleTriggerReplay = useCallback(() => {
    setAnimationKey((prev) => prev + 1);
  }, []);

  return (
    <div
      onClick={handleTriggerReplay}
      className={`inline-flex flex-wrap items-center gap-[2px] cursor-pointer group select-none ${className}`}
      title="Click to replay mechanical flap animation"
      aria-label={text}
    >
      {chars.map((char, index) => (
        <SplitFlapChar
          key={`${index}-${animationKey}`}
          char={char.toUpperCase()}
          index={index}
          animationKey={animationKey}
          speed={speed}
          playClick={audio?.playClick}
        />
      ))}
    </div>
  );
}

