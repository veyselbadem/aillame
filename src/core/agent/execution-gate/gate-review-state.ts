import { WorkspaceAgentExecutionGateResult } from "./gate-types";
import { 
  WorkspaceAgentExecutionGateReviewState, 
  WorkspaceAgentGateDecisionReviewStatus,
  WorkspaceAgentGateCheckReviewStatus,
  WorkspaceAgentGateRiskReviewStatus
} from "./gate-review-types";

/**
 * Creates the initial review state from a gate evaluation result.
 */
export function createInitialGateReviewState(
  result: WorkspaceAgentExecutionGateResult
): WorkspaceAgentExecutionGateReviewState {
  return {
    requestId: result.requestId,
    planId: result.planId,
    status: "not_started",
    decisionReview: {
      decision: result.decision,
      reviewStatus: "pending"
    },
    checkReviews: result.checks.map(c => ({
      checkId: c.checkId,
      reviewStatus: "pending"
    })),
    riskReviews: result.risks.map(r => ({
      riskId: r.code, // risk code as ID
      reviewStatus: "pending"
    })),
    warningCount: result.warnings.length,
    reviewedCheckCount: 0,
    reviewedRiskCount: 0
  };
}

/**
 * Sanitizes a review note by masking sensitive patterns.
 */
export function sanitizeGateReviewNote(note: string | undefined): string {
  if (!note) return "";
  
  let sanitized = note.slice(0, 500);

  // Mask Windows paths
  sanitized = sanitized.replace(/[a-zA-Z]:\\[\\\w.-]+/g, "[PATH_MASKED]");
  // Mask Unix paths
  sanitized = sanitized.replace(/\/[/\w.-]+/g, (match) => {
    if (match.length > 5 && match.includes("/")) return "[PATH_MASKED]";
    return match;
  });

  // Mask secrets
  const secretPatterns = [
    /(key|token|password|secret|auth|api)[-_\w]*\s*(:|=|\bis\b|\s+is\s+)\s*[^\s,;]+/gi,
  ];

  for (const pattern of secretPatterns) {
    sanitized = sanitized.replace(pattern, (match) => {
      const prefixMatch = match.match(/(key|token|password|secret|auth|api)[-_\w]*\s*(:|=|\bis\b|\s+is\s+)\s*/i);
      if (prefixMatch) return prefixMatch[0] + "[SECRET_MASKED]";
      return "[SECRET_MASKED]";
    });
  }

  return sanitized;
}

/**
 * Updates the decision review in the state.
 */
export function updateGateDecisionReview(
  state: WorkspaceAgentExecutionGateReviewState,
  reviewStatus: WorkspaceAgentGateDecisionReviewStatus,
  note?: string
): WorkspaceAgentExecutionGateReviewState {
  return {
    ...state,
    decisionReview: {
      ...state.decisionReview,
      reviewStatus,
      note: sanitizeGateReviewNote(note),
      reviewedAt: new Date().toISOString()
    },
    status: "in_review"
  };
}

/**
 * Updates a check review in the state.
 */
export function updateGateCheckReview(
  state: WorkspaceAgentExecutionGateReviewState,
  checkId: string,
  reviewStatus: WorkspaceAgentGateCheckReviewStatus,
  note?: string
): WorkspaceAgentExecutionGateReviewState {
  const checkReviews = state.checkReviews.map(cr => {
    if (cr.checkId === checkId) {
      return {
        ...cr,
        reviewStatus,
        note: sanitizeGateReviewNote(note),
        reviewedAt: new Date().toISOString()
      };
    }
    return cr;
  });

  const reviewedCheckCount = checkReviews.filter(cr => cr.reviewStatus !== "pending").length;

  return {
    ...state,
    checkReviews,
    reviewedCheckCount,
    status: reviewedCheckCount > 0 || state.reviewedRiskCount > 0 || state.decisionReview.reviewStatus !== "pending" ? "in_review" : "not_started"
  };
}

/**
 * Updates a risk review in the state.
 */
export function updateGateRiskReview(
  state: WorkspaceAgentExecutionGateReviewState,
  riskId: string,
  reviewStatus: WorkspaceAgentGateRiskReviewStatus,
  note?: string
): WorkspaceAgentExecutionGateReviewState {
  const riskReviews = state.riskReviews.map(rr => {
    if (rr.riskId === riskId) {
      return {
        ...rr,
        reviewStatus,
        note: sanitizeGateReviewNote(note),
        reviewedAt: new Date().toISOString()
      };
    }
    return rr;
  });

  const reviewedRiskCount = riskReviews.filter(rr => rr.reviewStatus !== "pending").length;

  return {
    ...state,
    riskReviews,
    reviewedRiskCount,
    status: state.reviewedCheckCount > 0 || reviewedRiskCount > 0 || state.decisionReview.reviewStatus !== "pending" ? "in_review" : "not_started"
  };
}
