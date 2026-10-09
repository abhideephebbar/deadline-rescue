import { Task, Recommendation, Priority } from '../types';
import { getUrgencyInfo, formatRelativeTime } from './date';

const PRIORITY_WEIGHTS: Record<Priority, number> = {
  urgent: 3.5,
  high: 2.5,
  medium: 1.6,
  low: 1.0,
};

/**
 * Calculates a rescue urgency score for an incomplete task.
 * Higher score = higher recommended priority to work on right now.
 */
export function calculateTaskScore(task: Task): {
  score: number;
  headline: string;
  explanation: string;
  keyFactors: string[];
  actionAdvice: string;
} {
  const urgency = getUrgencyInfo(task.dueDateTime, task.estimatedHours);
  const priorityWeight = PRIORITY_WEIGHTS[task.priority] || 1.0;
  const hoursRemaining = urgency.hoursRemaining;
  const buffer = urgency.bufferHours;

  let baseScore = 0;
  const factors: string[] = [];
  let headline = '';
  let explanation = '';
  let actionAdvice = '';

  // 1. Overdue Handling
  if (urgency.isOverdue) {
    const overdueHours = Math.abs(hoursRemaining);
    baseScore = 12000 + (overdueHours * 50) + (priorityWeight * 500);
    headline = 'Past Due — Urgent Remediation Required';
    factors.push(`Overdue by ${formatRelativeTime(hoursRemaining).replace('Overdue by ', '')}`);
    factors.push(`Priority: ${task.priority.toUpperCase()}`);
    factors.push(`Estimated workload: ${task.estimatedHours} hour${task.estimatedHours === 1 ? '' : 's'}`);
    explanation = `This task is overdue. Complete or submit as soon as possible to halt late deductions or academic penalties.`;
    actionAdvice = `Dedicate your immediate focus here to close this open loop before moving on.`;
    return { score: baseScore, headline, explanation, keyFactors: factors, actionAdvice };
  }

  // 2. Time Deficit Check (estimated hours > hours remaining)
  if (urgency.hasTimeDeficit) {
    const deficitHours = Math.abs(buffer).toFixed(1);
    baseScore = 9000 + (Math.abs(buffer) * 200) + (priorityWeight * 400);
    headline = 'Deadline Deficit — Start Immediately!';
    factors.push(`Danger: Estimated effort (${task.estimatedHours}h) exceeds remaining time (${hoursRemaining.toFixed(1)}h)`);
    factors.push(`${deficitHours}h estimated deficit`);
    factors.push(`High impact: ${task.priority.toUpperCase()} priority`);
    explanation = `You need approximately ${task.estimatedHours} hours of focus, but only ${hoursRemaining.toFixed(1)} hours remain until the deadline. Delaying will guarantee late submission.`;
    actionAdvice = `Drop non-essential activities and begin right now to maximize your score.`;
    return { score: baseScore, headline, explanation, keyFactors: factors, actionAdvice };
  }

  // 3. Proximity Scoring (Non-linear exponential scale for approaching deadlines)
  // Closer deadlines produce drastically higher base values
  if (hoursRemaining <= 12) {
    baseScore = 5000 + ((12 - hoursRemaining) * 250);
    factors.push(`Due in under 12 hours (${formatRelativeTime(hoursRemaining)})`);
  } else if (hoursRemaining <= 24) {
    baseScore = 3000 + ((24 - hoursRemaining) * 100);
    factors.push(`Due in under 24 hours (${formatRelativeTime(hoursRemaining)})`);
  } else if (hoursRemaining <= 48) {
    baseScore = 1500 + ((48 - hoursRemaining) * 40);
    factors.push(`Due within 2 days`);
  } else {
    baseScore = Math.max(100, 1000 / (hoursRemaining / 12));
    factors.push(`Due in ${formatRelativeTime(hoursRemaining)}`);
  }

  // Multiply by Priority
  baseScore *= priorityWeight;
  factors.push(`${task.priority.toUpperCase()} priority (${priorityWeight}x weight)`);

  // 4. Buffer margin calculation (hours remaining - estimated hours)
  if (buffer <= 3) {
    baseScore += 1200;
    factors.push(`Tight buffer: Only ${buffer.toFixed(1)}h safety margin remaining`);
  } else if (buffer <= 8) {
    baseScore += 500;
    factors.push(`Moderate buffer: ${buffer.toFixed(1)}h margin`);
  }

  // 5. Quick Win vs. Deep Work adjustment
  if (task.estimatedHours <= 1.0 && hoursRemaining <= 36) {
    // Quick win boost for easily cleared roadblocks
    baseScore += 350;
    factors.push(`Quick win opportunity (${task.estimatedHours}h to complete)`);
  } else if (task.estimatedHours >= 4.0 && hoursRemaining <= 48) {
    // High effort task approaching deadline needs early start
    baseScore += 450;
    factors.push(`Substantial project (${task.estimatedHours}h effort required)`);
  }

  // Generate tailored explanation text
  if (hoursRemaining <= 12) {
    headline = 'Critical Approaching Deadline';
    explanation = `Due in ${formatRelativeTime(hoursRemaining).replace('Due in ', '')} with ${task.estimatedHours}h estimated effort. With only ${buffer.toFixed(1)}h of buffer margin, you must begin soon to avoid an all-nighter or rushed submission.`;
    actionAdvice = `Block out ${task.estimatedHours} undisturbed hours immediately.`;
  } else if (task.priority === 'urgent' || task.priority === 'high') {
    headline = 'High Priority Focus Target';
    explanation = `Marked as ${task.priority.toUpperCase()} priority for ${task.course || 'coursework'} and due ${formatRelativeTime(hoursRemaining)}. Tackling this ${task.estimatedHours}h task prevents compounding pressure later in the week.`;
    actionAdvice = `Schedule a focused study block today to complete this before other minor items.`;
  } else if (task.estimatedHours <= 1.5) {
    headline = 'Fast Momentum Builder';
    explanation = `At only ${task.estimatedHours}h estimated effort, clearing this task quickly delivers an early victory and clears mental bandwidth for heavier commitments.`;
    actionAdvice = `Knock this out in one short sitting to maintain momentum.`;
  } else {
    headline = 'Next Strategic Commitment';
    explanation = `Ranked as your highest strategic need based on a balance of ${task.priority} priority, estimated effort (${task.estimatedHours}h), and deadline (${formatRelativeTime(hoursRemaining)}).`;
    actionAdvice = `Review guidelines and outline your first milestone now.`;
  }

  return {
    score: Math.round(baseScore),
    headline,
    explanation,
    keyFactors: factors,
    actionAdvice
  };
}

/**
 * Evaluates all incomplete tasks and returns them sorted by recommendation score,
 * highlighting the top recommended task.
 */
export function getSmartRecommendations(tasks: Task[]): {
  topRecommendation: Recommendation | null;
  rankedQueue: Recommendation[];
} {
  const incompleteTasks = tasks.filter((t) => !t.completed);

  if (incompleteTasks.length === 0) {
    return { topRecommendation: null, rankedQueue: [] };
  }

  const recommendations: Recommendation[] = incompleteTasks.map((task) => {
    const analysis = calculateTaskScore(task);
    const urgency = getUrgencyInfo(task.dueDateTime, task.estimatedHours);

    return {
      task,
      score: analysis.score,
      urgency,
      headline: analysis.headline,
      explanation: analysis.explanation,
      keyFactors: analysis.keyFactors,
      actionAdvice: analysis.actionAdvice,
    };
  });

  // Sort descending by score
  recommendations.sort((a, b) => b.score - a.score);

  return {
    topRecommendation: recommendations[0] || null,
    rankedQueue: recommendations,
  };
}

