import { WorkspaceAgentPlan } from "./planning-types";
import {
  WorkspaceAgentPlanReviewState,
  WorkspaceAgentPlanStepReview,
  WorkspaceAgentPlanStepReviewStatus,
} from "./plan-review-types";

/**
 * Sanitizes and masks sensitive patterns in review notes.
 * @param note The note to sanitize
 * @returns Sanitized and masked note
 */
export function sanitizePlanReviewNote(note: string): string {
  if (!note) return "";

  let sanitized = note.trim();

  // Mask potential file paths (Basic Unix/Windows patterns)
  // Avoiding full regex for stability, but masking common patterns
  const pathPatterns = [
    /[a-zA-Z]:\\[\\\w.-]+/g, // Windows paths (no spaces to avoid over-match)
    /\/[/\w.-]+/g,           // Unix paths (no spaces to avoid over-match)
  ];

  for (const pattern of pathPatterns) {
    sanitized = sanitized.replace(pattern, (match) => {
      // If it looks like a path, mask it if it's longer than a few chars
      if (match.length > 5 && (match.includes("/") || match.includes("\\"))) {
        return "[PATH_MASKED]";
      }
      return match;
    });
  }

  // Mask potential secrets (Basic patterns for keys/tokens)
  const secretPatterns = [
    /(key|token|password|secret|auth|api)[-_\w]*\s*(:|=|\bis\b|\s+is\s+)\s*[^\s,;]+/gi,
    /[a-f0-9]{32,}/gi, // Hex strings like MD5/SHA
  ];

  for (const pattern of secretPatterns) {
    sanitized = sanitized.replace(pattern, (match) => {
      // Keep the prefix (e.g., "key is ") but mask the value
      const prefixMatch = match.match(/(key|token|password|secret|auth|api)[-_\w]*\s*(:|=|\bis\b|\s+is\s+)\s*/i);
      if (prefixMatch) {
        return prefixMatch[0] + "[SECRET_MASKED]";
      }
      return "[SECRET_MASKED]";
    });
  }

  // Basic HTML/Script tag removal for safety
  sanitized = sanitized.replace(/<[^>]*>?/gm, "");

  return sanitized;
}

/**
 * Creates an initial review state for a given plan.
 * @param plan The workspace agent plan
 * @returns Initial WorkspaceAgentPlanReviewState
 */
export function createInitialPlanReviewState(
  plan: WorkspaceAgentPlan,
  planId: string = `plan_${Date.now()}`
): WorkspaceAgentPlanReviewState {
  const stepReviews: WorkspaceAgentPlanStepReview[] = plan.steps.map((step) => ({
    stepId: step.stepId,
    reviewStatus: "pending",
  }));

  return {
    planId,
    status: "not_started",
    stepReviews,
    warningCount: plan.warnings?.length || 0,
    approvedStepCount: 0,
    rejectedStepCount: 0,
  };
}

/**
 * Updates a specific step's review status and note in the state.
 * @param state Current review state
 * @param stepId ID of the step to update
 * @param reviewStatus New status
 * @param note Optional note
 * @returns Updated WorkspaceAgentPlanReviewState (new object)
 */
export function updatePlanStepReview(
  state: WorkspaceAgentPlanReviewState,
  stepId: string,
  reviewStatus: WorkspaceAgentPlanStepReviewStatus,
  note?: string
): WorkspaceAgentPlanReviewState {
  const sanitizedNote = note ? sanitizePlanReviewNote(note) : undefined;
  const reviewedAt = new Date().toISOString();

  const newStepReviews = state.stepReviews.map((sr) => {
    if (sr.stepId === stepId) {
      return {
        ...sr,
        reviewStatus,
        note: sanitizedNote,
        reviewedAt,
      };
    }
    return sr;
  });

  const approvedCount = newStepReviews.filter((sr) => sr.reviewStatus === "approved_for_future").length;
  const rejectedCount = newStepReviews.filter((sr) => sr.reviewStatus === "rejected").length;
  
  let newStatus: WorkspaceAgentPlanReviewState["status"] = "in_review";
  if (newStepReviews.every((sr) => sr.reviewStatus !== "pending")) {
    newStatus = "reviewed";
  }

  return {
    ...state,
    status: newStatus,
    stepReviews: newStepReviews,
    approvedStepCount: approvedCount,
    rejectedStepCount: rejectedCount,
    reviewedAt: newStatus === "reviewed" ? reviewedAt : state.reviewedAt,
  };
}

/**
 * Returns a summary of the plan review.
 * @param state Current review state
 * @returns Summary object
 */
export function getPlanReviewSummary(state: WorkspaceAgentPlanReviewState) {
  return {
    totalSteps: state.stepReviews.length,
    approvedCount: state.approvedStepCount,
    rejectedCount: state.rejectedStepCount,
    pendingCount: state.stepReviews.length - state.approvedStepCount - state.rejectedStepCount,
    warningCount: state.warningCount,
    status: state.status,
    isFullyReviewed: state.status === "reviewed",
  };
}
