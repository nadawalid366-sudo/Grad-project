import type { PatientDashboard } from "../services/api";

export type HealthMetricKey =
  | "water"
  | "sleep"
  | "medication"
  | "calories"
  | "exercise";

export type HealthMetricSnapshot = {
  water: { current: number; goal: number; unit: string };
  sleep: { current: number; goal: number; unit: string };
  medication: { current: number; goal: number; unit: string };
  calories: { current: number; goal: number; unit: string };
  exercise: { current: number; goal: number; unit: string };
};

export type HealthScoreEntry = {
  key: HealthMetricKey;
  title: string;
  icon: string;
  current: number;
  goal: number;
  unit: string;
  earnedPoints: number;
  maxPoints: number;
  progressPercent: number;
  barColor: string;
  isWeak: boolean;
  tip: string;
};

const COLORS = {
  red: "#EF4444",
  amber: "#F59E0B",
  green: "#10B981",
};

const DEFAULT_GOALS = {
  sleepHours: 8,
  waterUnits: 15,
  exerciseMinutes: 30,
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function extractExerciseMinutes(dashboard?: PatientDashboard | null) {
  const logs = dashboard?.logs ?? [];

  return logs.reduce((total, log) => {
    const entry = log as {
      type?: string;
      activity_minutes?: number;
      details?: Record<string, unknown> & {
        duration?: string | number;
        minutes?: string | number;
        activity_minutes?: string | number;
      };
    };

    if (entry.type !== "exercise") {
      return total;
    }

    const rawMinutes =
      entry.details?.activity_minutes ??
      entry.details?.minutes ??
      entry.details?.duration ??
      entry.activity_minutes ??
      0;

    if (typeof rawMinutes === "number") {
      return total + (Number.isFinite(rawMinutes) ? rawMinutes : 0);
    }

    const parsed = Number(String(rawMinutes).replace(/[^\d.]/g, ""));
    return total + (Number.isFinite(parsed) ? parsed : 0);
  }, 0);
}

export function normalizeHealthMetrics(
  dashboard?: PatientDashboard | null,
): HealthMetricSnapshot {
  const metrics = dashboard?.healthMetrics;
  const exerciseFromLogs = extractExerciseMinutes(dashboard);

  return {
    water: {
      current: toNumber(metrics?.water?.amount),
      goal: toNumber(metrics?.water?.goal, DEFAULT_GOALS.waterUnits),
      unit: metrics?.water?.unit || "glasses",
    },
    sleep: {
      current: toNumber(metrics?.sleep?.hours),
      goal: toNumber(metrics?.sleep?.goal, DEFAULT_GOALS.sleepHours),
      unit: "hours",
    },
    medication: {
      current: toNumber(metrics?.medication?.taken),
      goal: toNumber(metrics?.medication?.goal, 0),
      unit: "doses",
    },
    calories: {
      current: toNumber(metrics?.calories?.current),
      goal: toNumber(metrics?.calories?.goal, 2000),
      unit: "kcal",
    },
    exercise: {
      current: exerciseFromLogs,
      goal: toNumber(metrics?.exercise?.goal, DEFAULT_GOALS.exerciseMinutes),
      unit: "min",
    },
  };
}

export function getProgressPercent(current: number, goal: number) {
  if (goal <= 0) {
    return current > 0 ? 100 : 0;
  }

  return clamp((current / goal) * 100, 0, 140);
}

function getStandardPoints(current: number, goal: number, maxPoints: number) {
  if (goal <= 0) {
    return maxPoints;
  }

  return clamp((current / goal) * maxPoints, 0, maxPoints);
}

function getCaloriesPoints(current: number, goal: number) {
  if (current <= 0 || goal <= 0) {
    return 0;
  }

  const ratio = current / goal;
  if (ratio < 0.8 || ratio > 1.2) {
    return 0;
  }

  const closeness = 1 - clamp(Math.abs(1 - ratio) / 0.2, 0, 1);
  return 1.5 + closeness * 0.5;
}

function getProgressColor(key: HealthMetricKey, current: number, goal: number) {
  if (goal <= 0) {
    return COLORS.green;
  }

  const percent = getProgressPercent(current, goal);

  if (key === "calories") {
    const ratio = current / goal;
    if (ratio >= 0.8 && ratio <= 1.2) {
      return COLORS.green;
    }
    return ratio < 0.8 ? COLORS.red : COLORS.amber;
  }

  if (percent < 80) {
    return COLORS.red;
  }

  if (percent < 100) {
    return COLORS.amber;
  }

  return COLORS.green;
}

function buildStandardTip(
  title: string,
  current: number,
  goal: number,
  unit: string,
  maxPoints: number,
) {
  if (goal <= 0) {
    if (title === "Medication") {
      return "No doses are required right now. Keep the routine ready in case your plan changes.";
    }

    return `You have already cleared this metric and can keep the full +${maxPoints.toFixed(1)}.`;
  }

  if (current >= goal) {
    return `${title} is on target. Keep it steady to hold onto +${maxPoints.toFixed(1)}.`;
  }

  const remaining = Math.max(goal - current, 0);
  return `You need ${remaining.toFixed(1).replace(/\.0$/, "")} more ${unit} to reach the goal and earn the full +${maxPoints.toFixed(1)}.`;
}

function buildCaloriesTip(current: number, goal: number) {
  if (goal <= 0 || current <= 0) {
    return "Log meals to see whether you are within the 80-120% calorie window for up to +2.0.";
  }

  const ratio = current / goal;
  if (ratio >= 0.8 && ratio <= 1.2) {
    return "You are in the calorie sweet spot. Staying near goal keeps your score in the green.";
  }

  if (ratio < 0.8) {
    const needed = Math.max(goal * 0.8 - current, 0);
    return `Add about ${Math.round(needed)} kcal to move into the 80-120% window and unlock up to +2.0.`;
  }

  const excess = Math.max(current - goal * 1.2, 0);
  return `Reduce about ${Math.round(excess)} kcal to get back inside the 80-120% window and unlock up to +2.0.`;
}

function buildExerciseTip(current: number, goal: number) {
  if (goal <= 0) {
    return "Log at least 30 minutes of activity to unlock up to +1.0.";
  }

  if (current >= goal) {
    return "Thirty minutes or more is enough to earn the full exercise points today.";
  }

  const remaining = Math.max(goal - current, 0);
  return `Log ${Math.ceil(remaining)} more min of activity to unlock the full +1.0.`;
}

export function buildHealthScoreBreakdown(
  metrics: HealthMetricSnapshot,
): HealthScoreEntry[] {
  const waterProgress = getProgressPercent(metrics.water.current, metrics.water.goal);
  const sleepProgress = getProgressPercent(metrics.sleep.current, metrics.sleep.goal);
  const medicationProgress = getProgressPercent(metrics.medication.current, metrics.medication.goal);
  const caloriesProgress = getProgressPercent(metrics.calories.current, metrics.calories.goal);
  const exerciseProgress = getProgressPercent(metrics.exercise.current, metrics.exercise.goal);

  const items: HealthScoreEntry[] = [
    {
      key: "water",
      title: "Water",
      icon: "cup-water",
      current: metrics.water.current,
      goal: metrics.water.goal,
      unit: metrics.water.unit,
      earnedPoints: getStandardPoints(metrics.water.current, metrics.water.goal, 2.5),
      maxPoints: 2.5,
      progressPercent: waterProgress,
      barColor: getProgressColor("water", metrics.water.current, metrics.water.goal),
      isWeak: waterProgress < 80,
      tip: buildStandardTip("Water", metrics.water.current, metrics.water.goal, metrics.water.unit, 2.5),
    },
    {
      key: "sleep",
      title: "Sleep",
      icon: "power-sleep",
      current: metrics.sleep.current,
      goal: metrics.sleep.goal,
      unit: metrics.sleep.unit,
      earnedPoints: getStandardPoints(metrics.sleep.current, metrics.sleep.goal, 2.5),
      maxPoints: 2.5,
      progressPercent: sleepProgress,
      barColor: getProgressColor("sleep", metrics.sleep.current, metrics.sleep.goal),
      isWeak: sleepProgress < 80,
      tip: buildStandardTip("Sleep", metrics.sleep.current, metrics.sleep.goal, metrics.sleep.unit, 2.5),
    },
    {
      key: "medication",
      title: "Medication",
      icon: "pill",
      current: metrics.medication.current,
      goal: metrics.medication.goal,
      unit: metrics.medication.unit,
      earnedPoints: getStandardPoints(metrics.medication.current, metrics.medication.goal, 2.5),
      maxPoints: 2.5,
      progressPercent: metrics.medication.goal <= 0 ? 100 : medicationProgress,
      barColor: getProgressColor("medication", metrics.medication.current, metrics.medication.goal),
      isWeak: metrics.medication.goal <= 0 ? false : medicationProgress < 100,
      tip: buildStandardTip("Medication", metrics.medication.current, metrics.medication.goal, metrics.medication.unit, 2.5),
    },
    {
      key: "calories",
      title: "Calories",
      icon: "fire",
      current: metrics.calories.current,
      goal: metrics.calories.goal,
      unit: metrics.calories.unit,
      earnedPoints: getCaloriesPoints(metrics.calories.current, metrics.calories.goal),
      maxPoints: 2.0,
      progressPercent: caloriesProgress,
      barColor: getProgressColor("calories", metrics.calories.current, metrics.calories.goal),
      isWeak:
        metrics.calories.goal <= 0
          ? true
          : metrics.calories.current / metrics.calories.goal < 0.8 || metrics.calories.current / metrics.calories.goal > 1.2,
      tip: buildCaloriesTip(metrics.calories.current, metrics.calories.goal),
    },
    {
      key: "exercise",
      title: "Exercise",
      icon: "run",
      current: metrics.exercise.current,
      goal: metrics.exercise.goal,
      unit: metrics.exercise.unit,
      earnedPoints: getStandardPoints(metrics.exercise.current, metrics.exercise.goal, 1.0),
      maxPoints: 1.0,
      progressPercent: exerciseProgress,
      barColor: getProgressColor("exercise", metrics.exercise.current, metrics.exercise.goal),
      isWeak: exerciseProgress < 80,
      tip: buildExerciseTip(metrics.exercise.current, metrics.exercise.goal),
    },
  ];

  return items.sort((left, right) => {
    if (left.isWeak !== right.isWeak) {
      return left.isWeak ? -1 : 1;
    }

    return left.progressPercent - right.progressPercent;
  });
}

export function formatPointValue(value: number) {
  return `+${value.toFixed(1)}`;
}
