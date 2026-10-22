import { Task, CapacitySettings } from '../types';
import { getSmartRecommendations } from './ranking';
import { calculateDailyLoads, getAvailableWorkingHours } from './capacity';
import { formatRelativeTime } from './date';

export interface TaskSummaryFact {
  id: string;
  title: string;
  course: string;
  dueDateTime: string;
  dueRelative: string;
  estimatedHours: number;
  remainingEffort: number;
  priority: string;
  category: string;
  bufferHours: number;
}

export interface AppFacts {
  currentTime: string;
  weekday: string;
  topTask: {
    id: string;
    title: string;
    course: string;
    dueDateTime: string;
    dueRelative: string;
    hours: number;
    remainingEffort: number;
    reason: string;
  } | null;
  today: {
    demandHours: number;
    capacityHours: number;
    deficitHours: number;
    isOnTrack: boolean;
  };
  weekly: {
    demandHours: number;
    capacityHours: number;
    deficitHours: number;
  };
  tasksDue48h: TaskSummaryFact[];
  catchUpCount: number;
  nextUp: Array<{
    id: string;
    title: string;
    course: string;
    dueRelative: string;
    remainingEffort: number;
  }>;
  totalActiveCount: number;
  totalActiveHours: number;
}

/**
 * Builds a compact, grounded source of truth facts object from live application state.
 */
export function buildAppFacts(
  tasks: Task[],
  capacitySettings: CapacitySettings,
  now: Date = new Date(),
  remainingEffortMap?: Record<string, number>
): AppFacts {
  const incomplete = tasks.filter((t) => !t.completed && !t.dropped);

  const { topRecommendation, rankedQueue, catchUpQueue } = getSmartRecommendations(
    tasks,
    now,
    remainingEffortMap,
    capacitySettings
  );

  const dailyLoads = calculateDailyLoads(incomplete, capacitySettings, now, 7);
  const todayLoad = dailyLoads[0] || { demandHours: 0, capacityHours: 4 };

  const todayDemand = Math.round(todayLoad.demandHours * 10) / 10;
  const todayCapacity = Math.round(todayLoad.capacityHours * 10) / 10;
  const todayDeficit = Math.max(0, Math.round((todayDemand - todayCapacity) * 10) / 10);
  const todayOnTrack = todayDemand <= todayCapacity;

  const weeklyDemand = Math.round(dailyLoads.reduce((sum, d) => sum + d.demandHours, 0) * 10) / 10;
  const weeklyCapacity = Math.round(dailyLoads.reduce((sum, d) => sum + d.capacityHours, 0) * 10) / 10;
  const weeklyDeficit = Math.max(0, Math.round((weeklyDemand - weeklyCapacity) * 10) / 10);

  const totalEffort = Math.round(
    incomplete.reduce((sum, t) => {
      const rem = typeof remainingEffortMap?.[t.id] === 'number' ? remainingEffortMap[t.id] : t.estimatedHours;
      return sum + rem;
    }, 0) * 10
  ) / 10;

  const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const weekday = weekdays[now.getDay()];

  const timeFormatted = now.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const dateFormatted = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const currentTime = `${dateFormatted}, ${timeFormatted}`;

  // Top Task
  let topTaskFact: AppFacts['topTask'] = null;
  if (topRecommendation?.task) {
    const t = topRecommendation.task;
    const rem = typeof remainingEffortMap?.[t.id] === 'number' ? remainingEffortMap[t.id] : t.estimatedHours;
    const hoursDiff = Math.round((new Date(t.dueDateTime).getTime() - now.getTime()) / 3600000);

    topTaskFact = {
      id: t.id,
      title: t.title,
      course: t.course,
      dueDateTime: t.dueDateTime,
      dueRelative: formatRelativeTime(hoursDiff),
      hours: t.estimatedHours,
      remainingEffort: rem,
      reason: topRecommendation.explanation,
    };
  }

  // Tasks due in 48 hours
  const tasksDue48h: TaskSummaryFact[] = incomplete
    .filter((t) => {
      const diffHours = (new Date(t.dueDateTime).getTime() - now.getTime()) / 3600000;
      return diffHours >= 0 && diffHours <= 48;
    })
    .map((t) => {
      const rem = typeof remainingEffortMap?.[t.id] === 'number' ? remainingEffortMap[t.id] : t.estimatedHours;
      const hoursDiff = Math.round((new Date(t.dueDateTime).getTime() - now.getTime()) / 3600000);
      const availableHours = getAvailableWorkingHours(now, new Date(t.dueDateTime), capacitySettings);
      const buffer = Math.round((availableHours - rem) * 10) / 10;

      return {
        id: t.id,
        title: t.title,
        course: t.course,
        dueDateTime: t.dueDateTime,
        dueRelative: formatRelativeTime(hoursDiff),
        estimatedHours: t.estimatedHours,
        remainingEffort: rem,
        priority: t.priority,
        category: t.category,
        bufferHours: buffer,
      };
    });

  // Next up (up to 3 items after top recommendation)
  const nextUp = rankedQueue.slice(1, 4).map((rec) => {
    const t = rec.task;
    const rem = typeof remainingEffortMap?.[t.id] === 'number' ? remainingEffortMap[t.id] : t.estimatedHours;
    const hoursDiff = Math.round((new Date(t.dueDateTime).getTime() - now.getTime()) / 3600000);

    return {
      id: t.id,
      title: t.title,
      course: t.course,
      dueRelative: formatRelativeTime(hoursDiff),
      remainingEffort: rem,
    };
  });

  return {
    currentTime,
    weekday,
    topTask: topTaskFact,
    today: {
      demandHours: todayDemand,
      capacityHours: todayCapacity,
      deficitHours: todayDeficit,
      isOnTrack: todayOnTrack,
    },
    weekly: {
      demandHours: weeklyDemand,
      capacityHours: weeklyCapacity,
      deficitHours: weeklyDeficit,
    },
    tasksDue48h,
    catchUpCount: catchUpQueue.length,
    nextUp,
    totalActiveCount: incomplete.length,
    totalActiveHours: totalEffort,
  };
}
