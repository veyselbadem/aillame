import type {
  AillameProblemCategory,
  AillameProblemInput,
  AillameProblemSeverity,
  AillameProblemSignal,
} from "./problem-types";

const SEVERITY_SCORE: Record<AillameProblemSeverity, number> = {
  info: 1,
  warning: 2,
  error: 3,
  critical: 4,
};

function pickCategory(signals: readonly AillameProblemSignal[], projectType?: string): AillameProblemCategory {
  if (signals.length === 0) return "unknown";
  const scores = new Map<AillameProblemCategory, number>();
  for (const signal of signals) {
    const boost = projectType && signal.category === projectType ? 0.12 : 0;
    scores.set(signal.category, (scores.get(signal.category) ?? 0) + signal.confidence + boost);
  }

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown";
}

function pickSeverity(signals: readonly AillameProblemSignal[]): AillameProblemSeverity {
  if (signals.length === 0) return "info";
  return signals
    .map((signal) => signal.severity)
    .sort((a, b) => SEVERITY_SCORE[b] - SEVERITY_SCORE[a])[0] ?? "info";
}

function confidence(signals: readonly AillameProblemSignal[]): number {
  if (signals.length === 0) return 0.25;
  const top = signals.slice(0, 3);
  const average = top.reduce((total, signal) => total + signal.confidence, 0) / top.length;
  return Number(Math.min(0.96, average + Math.min(0.12, signals.length * 0.03)).toFixed(2));
}

export type InterpretedProblemLog = {
  category: AillameProblemCategory;
  severity: AillameProblemSeverity;
  confidence: number;
};

export function interpretProblemSignals(
  input: AillameProblemInput,
  signals: readonly AillameProblemSignal[]
): InterpretedProblemLog {
  return {
    category: pickCategory(signals, input.projectType),
    severity: pickSeverity(signals),
    confidence: confidence(signals),
  };
}
