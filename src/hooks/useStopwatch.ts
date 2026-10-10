import { useState, useEffect, useCallback, useRef } from 'react';
import { StopwatchState, StopwatchSession, StoredStopwatchState } from '../types';
import { formatStopwatchTime } from '../utils/date';

const STORAGE_KEY_STATE = 'deadline_rescue_stopwatch_state_v1';
const STORAGE_KEY_SESSIONS = 'deadline_rescue_stopwatch_sessions_v1';

export function useStopwatch() {
  // 1. Initial State Restoration from localStorage
  const [status, setStatus] = useState<StopwatchState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_STATE);
      if (stored) {
        const parsed: StoredStopwatchState = JSON.parse(stored);
        if (['idle', 'running', 'paused', 'stopped'].includes(parsed.status)) {
          return parsed.status;
        }
      }
    } catch (e) {
      console.error('Failed to parse stored stopwatch state:', e);
    }
    return 'idle';
  });

  const [accumulatedMs, setAccumulatedMs] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_STATE);
      if (stored) {
        const parsed: StoredStopwatchState = JSON.parse(stored);
        return typeof parsed.accumulatedMs === 'number' ? parsed.accumulatedMs : 0;
      }
    } catch {
      // ignore
    }
    return 0;
  });

  const [segmentStartTimestamp, setSegmentStartTimestamp] = useState<number | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_STATE);
      if (stored) {
        const parsed: StoredStopwatchState = JSON.parse(stored);
        if (parsed.status === 'running' && typeof parsed.segmentStartTimestamp === 'number') {
          return parsed.segmentStartTimestamp;
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [selectedTaskId, setSelectedTaskId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_STATE);
      if (stored) {
        const parsed: StoredStopwatchState = JSON.parse(stored);
        return parsed.selectedTaskId || '';
      }
    } catch {
      // ignore
    }
    return '';
  });

  const [isSaved, setIsSaved] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_STATE);
      if (stored) {
        const parsed: StoredStopwatchState = JSON.parse(stored);
        return Boolean(parsed.isSaved);
      }
    } catch {
      // ignore
    }
    return false;
  });

  // Saved sessions list
  const [savedSessions, setSavedSessions] = useState<StopwatchSession[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SESSIONS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse saved stopwatch sessions:', e);
    }
    return [];
  });

  // Display elapsed time calculation
  const calculateCurrentElapsed = useCallback((): number => {
    if (status === 'running' && segmentStartTimestamp) {
      return accumulatedMs + Math.max(0, Date.now() - segmentStartTimestamp);
    }
    return accumulatedMs;
  }, [status, segmentStartTimestamp, accumulatedMs]);

  const [displayElapsedMs, setDisplayElapsedMs] = useState<number>(calculateCurrentElapsed());

  // Prevent double-click race conditions
  const isTransitioningRef = useRef(false);

  // Sync active stopwatch state to localStorage
  useEffect(() => {
    try {
      const payload: StoredStopwatchState = {
        status,
        accumulatedMs,
        segmentStartTimestamp,
        selectedTaskId,
        isSaved,
        updatedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(payload));
    } catch (err) {
      console.error('Error saving stopwatch state to localStorage:', err);
    }
  }, [status, accumulatedMs, segmentStartTimestamp, selectedTaskId, isSaved]);

  // Sync saved sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_SESSIONS, JSON.stringify(savedSessions));
    } catch (err) {
      console.error('Error saving sessions to localStorage:', err);
    }
  }, [savedSessions]);

  // Interval for refreshing display only while running
  useEffect(() => {
    if (status !== 'running') {
      setDisplayElapsedMs(calculateCurrentElapsed());
      return;
    }

    // Refresh display at ~100ms intervals for smooth rendering
    const interval = setInterval(() => {
      setDisplayElapsedMs(calculateCurrentElapsed());
    }, 100);

    return () => clearInterval(interval);
  }, [status, calculateCurrentElapsed]);

  // 2. State Transitions

  // START: Available in Idle and Stopped
  const start = useCallback(() => {
    if (isTransitioningRef.current) return;
    if (status !== 'idle' && status !== 'stopped') return;

    isTransitioningRef.current = true;
    const now = Date.now();
    setAccumulatedMs(0);
    setSegmentStartTimestamp(now);
    setIsSaved(false);
    setStatus('running');
    setDisplayElapsedMs(0);

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 50);
  }, [status]);

  // PAUSE: Available only in Running
  const pause = useCallback(() => {
    if (isTransitioningRef.current) return;
    if (status !== 'running' || !segmentStartTimestamp) return;

    isTransitioningRef.current = true;
    const now = Date.now();
    const additional = Math.max(0, now - segmentStartTimestamp);
    const newAccumulated = accumulatedMs + additional;

    setAccumulatedMs(newAccumulated);
    setSegmentStartTimestamp(null);
    setStatus('paused');
    setDisplayElapsedMs(newAccumulated);

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 50);
  }, [status, segmentStartTimestamp, accumulatedMs]);

  // RESUME: Available only in Paused
  const resume = useCallback(() => {
    if (isTransitioningRef.current) return;
    if (status !== 'paused') return;

    isTransitioningRef.current = true;
    const now = Date.now();
    setSegmentStartTimestamp(now);
    setStatus('running');

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 50);
  }, [status]);

  // STOP: Available in Running or Paused
  const stop = useCallback(() => {
    if (isTransitioningRef.current) return;
    if (status !== 'running' && status !== 'paused') return;

    isTransitioningRef.current = true;
    let finalAccumulated = accumulatedMs;

    if (status === 'running' && segmentStartTimestamp) {
      finalAccumulated += Math.max(0, Date.now() - segmentStartTimestamp);
    }

    setAccumulatedMs(finalAccumulated);
    setSegmentStartTimestamp(null);
    setStatus('stopped');
    setDisplayElapsedMs(finalAccumulated);

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 50);
  }, [status, segmentStartTimestamp, accumulatedMs]);

  // RESET: Resets state to Idle
  // Note: Confirmation check is performed before calling this or handled by UI
  const resetToIdle = useCallback(() => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    setStatus('idle');
    setAccumulatedMs(0);
    setSegmentStartTimestamp(null);
    setIsSaved(false);
    setDisplayElapsedMs(0);

    setTimeout(() => {
      isTransitioningRef.current = false;
    }, 50);
  }, []);

  // SAVE SESSION: Available only in Stopped and only once per session
  const saveSession = useCallback((taskDetails?: { id: string; title: string; course: string }) => {
    if (status !== 'stopped') return false;
    if (isSaved) return false;

    const durationMs = accumulatedMs;
    const newSession: StopwatchSession = {
      id: `session-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      durationMs,
      durationFormatted: formatStopwatchTime(durationMs),
      taskId: taskDetails?.id || (selectedTaskId || undefined),
      taskTitle: taskDetails?.title || undefined,
      taskCourse: taskDetails?.course || undefined,
      createdAt: new Date().toISOString(),
    };

    setSavedSessions((prev) => [newSession, ...prev]);
    setIsSaved(true);
    return true;
  }, [status, isSaved, accumulatedMs, selectedTaskId]);

  // DELETE A SAVED SESSION
  const deleteSession = useCallback((sessionId: string) => {
    setSavedSessions((prev) => prev.filter((s) => s.id !== sessionId));
  }, []);

  // CLEAR ALL SAVED SESSIONS
  const clearAllSessions = useCallback(() => {
    setSavedSessions([]);
  }, []);

  // Calculate total time tracked today
  const totalTrackedTodayMs = savedSessions.reduce((total, session) => {
    const sessionDate = new Date(session.createdAt);
    const today = new Date();
    const isToday =
      sessionDate.getFullYear() === today.getFullYear() &&
      sessionDate.getMonth() === today.getMonth() &&
      sessionDate.getDate() === today.getDate();

    return isToday ? total + session.durationMs : total;
  }, 0);

  return {
    status,
    displayElapsedMs,
    formattedTime: formatStopwatchTime(displayElapsedMs),
    isSaved,
    selectedTaskId,
    setSelectedTaskId,
    savedSessions,
    totalTrackedTodayMs,
    totalTrackedTodayFormatted: formatStopwatchTime(totalTrackedTodayMs),
    start,
    pause,
    resume,
    stop,
    resetToIdle,
    saveSession,
    deleteSession,
    clearAllSessions,
  };
}

