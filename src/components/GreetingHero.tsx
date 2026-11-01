import React, { useState, useEffect, useRef } from 'react';
import {
  Sun,
  Moon,
  Sunrise,
  Sunset,
  Cloud,
  CloudRain,
  CloudLightning,
  Snowflake,
  CloudFog,
} from 'lucide-react';
import { AnimatePresence, m } from 'motion/react';
import { AppFacts } from '../utils/facts';
import {
  GreetingActionType,
  GreetingIconType,
  GreetingResult,
  getGreetingIcon,
  getTimeBucket,
  pickGreeting,
  getStoredName,
  setStoredName,
  isNameSkipped,
  setNameSkipped,
  sanitizeGreetingName,
  getStoredLastShownId,
  setStoredLastShownId,
  shouldReroll,
  markFirstVisitSeen,
  buildGreetingSubline,
  buildGreetingChips,
  isFirstVisit,
} from '../utils/greeting';
import {
  WeatherData,
  getStoredWeatherOptIn,
  setStoredWeatherOptIn,
  getStoredCoordinates,
  setStoredCoordinates,
  getCachedWeather,
  setCachedWeather,
  fetchCurrentWeather,
  roundCoordinate,
} from '../utils/weather';

interface GreetingHeroProps {
  facts: AppFacts;
  now?: Date;
  onAction: (action: GreetingActionType, taskId?: string) => void;
  reduceEffects?: boolean;
  isEditingName?: boolean;
  onCancelEditName?: () => void;
  onNameChanged?: (name: string | null) => void;
}

const IdleIcon: React.FC<{
  icon: GreetingIconType;
  reduceEffects?: boolean;
}> = ({ icon, reduceEffects }) => {
  const IconComp =
    {
      sun: Sun,
      moon: Moon,
      sunrise: Sunrise,
      sunset: Sunset,
      cloud: Cloud,
      'cloud-rain': CloudRain,
      'cloud-lightning': CloudLightning,
      snowflake: Snowflake,
      'cloud-fog': CloudFog,
    }[icon] || Sun;

  if (reduceEffects) {
    return <IconComp className="w-9 h-9 sm:w-11 sm:h-11 text-orange-400 shrink-0" />;
  }

  if (icon === 'sun') {
    return (
      <m.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 25, ease: 'linear' }}
      >
        <IconComp className="w-9 h-9 sm:w-11 sm:h-11 text-orange-400 shrink-0" />
      </m.div>
    );
  }

  if (['cloud', 'cloud-rain', 'cloud-lightning', 'cloud-fog', 'snowflake'].includes(icon)) {
    return (
      <m.div
        animate={{ x: [-2, 2, -2] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
      >
        <IconComp className="w-9 h-9 sm:w-11 sm:h-11 text-sky-400 shrink-0" />
      </m.div>
    );
  }

  return (
    <m.div
      animate={{ y: [-1, 1, -1] }}
      transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
    >
      <IconComp className="w-9 h-9 sm:w-11 sm:h-11 text-amber-300 shrink-0" />
    </m.div>
  );
};

export const GreetingHero: React.FC<GreetingHeroProps> = ({
  facts,
  now = new Date(),
  onAction,
  reduceEffects = false,
  isEditingName = false,
  onCancelEditName,
  onNameChanged,
}) => {
  const [userName, setUserName] = useState<string | null>(() => getStoredName());
  const [skippedName, setSkippedName] = useState<boolean>(() => isNameSkipped());
  const [nameInput, setNameInput] = useState<string>('');
  const [weatherOptIn, setWeatherOptIn] = useState<'on' | 'off' | 'unset'>(() =>
    getStoredWeatherOptIn()
  );
  const [weatherDeniedNotice, setWeatherDeniedNotice] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(() => getCachedWeather());
  const weatherRef = useRef<WeatherData | null>(weather);
  weatherRef.current = weather;

  const [greeting, setGreeting] = useState<GreetingResult>(() => {
    const lastId = getStoredLastShownId();
    const initial = pickGreeting({
      now,
      name: getStoredName(),
      weather: getCachedWeather(),
      facts,
      lastShownId: lastId,
    });
    setStoredLastShownId(initial.id);
    return initial;
  });

  const lastHiddenAtRef = useRef<number | null>(null);

  // Background weather fetch if opt-in is 'on'
  useEffect(() => {
    if (weatherOptIn !== 'on') return;

    const cached = getCachedWeather();
    if (cached) {
      setWeather(cached);
      return;
    }

    const coords = getStoredCoordinates();
    if (coords) {
      fetchCurrentWeather(coords.lat, coords.lon).then((data) => {
        if (data) {
          setCachedWeather(data);
          setWeather(data);
        }
      });
    }
  }, [weatherOptIn]);

  // Handle visibility change and 30-min away re-roll rule
  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        lastHiddenAtRef.current = Date.now();
      } else {
        if (shouldReroll(lastHiddenAtRef.current, Date.now())) {
          lastHiddenAtRef.current = null;
          const next = pickGreeting({
            now: new Date(),
            name: getStoredName(),
            weather: weatherRef.current,
            facts,
            lastShownId: getStoredLastShownId(),
          });
          setStoredLastShownId(next.id);
          setGreeting(next);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [facts]);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeGreetingName(nameInput);
    if (clean) {
      setStoredName(clean);
      setUserName(clean);
      setNameSkipped(false);
      setSkippedName(false);
      onNameChanged?.(clean);
      onCancelEditName?.();
      // Re-evaluate greeting with new name
      const updated = pickGreeting({
        now,
        name: clean,
        weather,
        facts,
        lastShownId: greeting.id,
      });
      setStoredLastShownId(updated.id);
      setGreeting(updated);
    }
  };

  const handleSkipName = () => {
    setNameSkipped(true);
    setSkippedName(true);
    onNameChanged?.(null);
    onCancelEditName?.();
  };

  const handleOptInWeather = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = roundCoordinate(pos.coords.latitude);
          const lon = roundCoordinate(pos.coords.longitude);
          setStoredCoordinates(lat, lon);
          setStoredWeatherOptIn('on');
          setWeatherOptIn('on');
          const data = await fetchCurrentWeather(lat, lon);
          if (data) {
            setCachedWeather(data);
            setWeather(data);
          }
        },
        () => {
          setStoredWeatherOptIn('off');
          setWeatherOptIn('off');
          setWeatherDeniedNotice(true);
        },
        { timeout: 8000 }
      );
    } else {
      setStoredWeatherOptIn('off');
      setWeatherOptIn('off');
      setWeatherDeniedNotice(true);
    }
  };

  const handleChipClick = (action: GreetingActionType, taskId?: string) => {
    markFirstVisitSeen();
    onAction(action, taskId);
  };

  const isAskingName = isEditingName || (!userName && !skippedName);

  // Cross-fade only the icon if weather arrives without replaying whole headline
  const currentHour = (now || new Date()).getHours();
  const activeIcon = weather
    ? getGreetingIcon(getTimeBucket(currentHour), weather)
    : greeting.icon;

  const words = greeting.headline.split(' ');

  return (
    <section
      id="tour-greeting"
      aria-label="Welcome and daily focus"
      className="min-h-[175px] sm:min-h-[195px] flex flex-col justify-center mb-6 sm:mb-8"
    >
      <AnimatePresence mode="wait">
        {isAskingName ? (
          <m.div
            key="greeting-name-form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-3 max-w-lg"
          >
            <h2 className="font-['Bebas_Neue'] text-3xl sm:text-5xl text-white tracking-wide uppercase leading-none">
              Hi there. What should I call you?
            </h2>
            <form onSubmit={handleSaveName} className="flex flex-wrap items-center gap-2 pt-1">
              <label htmlFor="greeting-name-input" className="sr-only">
                Your first name
              </label>
              <input
                id="greeting-name-input"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                maxLength={24}
                placeholder="First name"
                className="px-4 py-2 rounded-xl bg-white/[0.07] border border-white/15 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-orange-500/80 transition-colors"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-black text-sm font-semibold transition-colors cursor-pointer active:scale-95"
              >
                Save
              </button>
              <button
                type="button"
                onClick={handleSkipName}
                className="text-xs text-zinc-400 hover:text-white px-2 py-2 transition-colors cursor-pointer"
              >
                {isEditingName ? 'Cancel' : 'Skip'}
              </button>
            </form>
          </m.div>
        ) : (
          <m.div
            key={greeting.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-3"
          >
            {/* Display Headline with Icon and Word-by-Word Reveal */}
            <h1
              aria-label={greeting.headline}
              className="font-['Bebas_Neue'] text-white uppercase leading-[0.92] tracking-wide flex flex-wrap items-center gap-x-3.5 gap-y-1.5"
              style={{ fontSize: 'clamp(40px, 7vw, 76px)' }}
            >
              {/* Icon beside headline with smooth icon cross-fade */}
              <span className="inline-flex items-center align-middle mr-1 sm:mr-2">
                <AnimatePresence mode="wait">
                  <m.span
                    key={activeIcon}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    className="inline-block"
                  >
                    <IdleIcon icon={activeIcon} reduceEffects={reduceEffects} />
                  </m.span>
                </AnimatePresence>
              </span>

              {/* Words staggered reveal */}
              {words.map((word, index) => (
                <m.span
                  key={`${greeting.id}-word-${index}`}
                  aria-hidden="true"
                  initial={reduceEffects ? { opacity: 1 } : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={
                    reduceEffects
                      ? { duration: 0.05 }
                      : {
                          duration: 0.24,
                          delay: index * 0.06,
                          ease: [0.22, 1, 0.36, 1],
                        }
                  }
                  className="inline-block"
                >
                  {word}
                </m.span>
              ))}
            </h1>

            {/* Supportive Subline - dynamically derived from live facts */}
            <m.p
              initial={reduceEffects ? { opacity: 1 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceEffects
                  ? { duration: 0.05 }
                  : {
                      duration: 0.3,
                      delay: words.length * 0.06 + 0.25,
                      ease: [0.22, 1, 0.36, 1],
                    }
              }
              className="text-base sm:text-lg text-zinc-400 font-normal leading-relaxed max-w-2xl"
            >
              {buildGreetingSubline(facts)}
            </m.p>

            {/* Action Chips - dynamically derived from live facts */}
            <m.div
              initial={reduceEffects ? { opacity: 1 } : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceEffects
                  ? { duration: 0.05 }
                  : {
                      duration: 0.3,
                      delay: words.length * 0.06 + 0.45,
                      ease: [0.22, 1, 0.36, 1],
                    }
              }
              className="flex flex-wrap items-center gap-2 pt-1"
            >
              {buildGreetingChips(facts, isFirstVisit()).map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => handleChipClick(chip.action, chip.taskId)}
                  className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-zinc-200 hover:text-white text-xs sm:text-sm font-medium transition-all cursor-pointer active:scale-95 text-left"
                >
                  {chip.label}
                </button>
              ))}

              {/* Opt-in 'Use my weather' button when unset */}
              {weatherOptIn === 'unset' && !weatherDeniedNotice && (
                <button
                  type="button"
                  onClick={handleOptInWeather}
                  className="min-h-[44px] inline-flex items-center px-3 py-1.5 text-xs text-orange-400/80 hover:text-orange-300 underline underline-offset-4 decoration-orange-400/30 hover:decoration-orange-300 transition-colors cursor-pointer"
                >
                  Use my weather
                </button>
              )}

              {weatherDeniedNotice && (
                <span className="text-xs text-zinc-500 italic py-1.5 min-h-[44px] inline-flex items-center">
                  Weather off — that's fine.
                </span>
              )}
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </section>
  );
};
