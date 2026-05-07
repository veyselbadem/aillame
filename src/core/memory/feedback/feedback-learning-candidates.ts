import type { FeedbackLearningCandidate, FeedbackQualitySignal } from "./feedback-learning-types";

const SENSITIVE_PATTERNS = [/\b(api[_-]?key|secret|token|password|credential)\b/i, /-----BEGIN [A-Z ]*PRIVATE KEY-----/];

function makeId(projectId: string): string {
  return `fb_${projectId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createFeedbackLearningCandidate(input: {
  projectId?: string;
  mode?: string;
  signal?: FeedbackQualitySignal;
  instruction: string;
  originalOutput: string;
  correctedOutput?: string;
  sourceApp?: string;
}): { success: boolean; candidate?: FeedbackLearningCandidate; warnings: string[] } {
  const serialized = `${input.instruction}\n${input.originalOutput}\n${input.correctedOutput ?? ""}`;
  if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(serialized))) {
    return { success: false, warnings: ["Sensitive-looking feedback was blocked from candidate creation."] };
  }

  const projectId = input.projectId ?? "general";
  return {
    success: true,
    candidate: {
      id: makeId(projectId),
      projectId,
      mode: input.mode ?? "general",
      signal: input.signal ?? "unknown",
      status: "pending-review",
      instruction: input.instruction,
      correction: {
        originalOutput: input.originalOutput,
        correctedOutput: input.correctedOutput,
      },
      metadata: {
        source: "feedback",
        sourceApp: input.sourceApp,
        createdAt: new Date().toISOString(),
        sensitiveBlocked: false,
      },
    },
    warnings: ["Feedback remains pending-review and is not used for training automatically."],
  };
}
