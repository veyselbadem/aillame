import { WorkspaceAgentExecutionReadinessResult } from "./readiness-types";
import { 
  WorkspaceAgentReadinessReviewState, 
  WorkspaceAgentPermissionReviewStatus, 
  WorkspaceAgentPreflightReviewStatus 
} from "./readiness-review-types";

/**
 * Creates the initial review state from a readiness evaluation result.
 */
export function createInitialReadinessReviewState(
  result: WorkspaceAgentExecutionReadinessResult
): WorkspaceAgentReadinessReviewState {
  return {
    planId: result.planId,
    status: "not_started",
    permissionReviews: result.permissions.map(p => ({
      requirementId: p.requirementId,
      reviewStatus: "pending"
    })),
    preflightReviews: result.preflightChecks.map(c => ({
      checkId: c.checkId,
      reviewStatus: "pending"
    })),
    warningCount: result.warnings.length,
    reviewedPermissionCount: 0,
    reviewedPreflightCount: 0
  };
}

/**
 * Sanitizes a review note by masking sensitive patterns.
 */
export function sanitizeReadinessReviewNote(note: string | undefined): string {
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
 * Updates a permission review in the state.
 */
export function updatePermissionReview(
  state: WorkspaceAgentReadinessReviewState,
  requirementId: string,
  reviewStatus: WorkspaceAgentPermissionReviewStatus,
  note?: string
): WorkspaceAgentReadinessReviewState {
  const permissionReviews = state.permissionReviews.map(pr => {
    if (pr.requirementId === requirementId) {
      return {
        ...pr,
        reviewStatus,
        note: sanitizeReadinessReviewNote(note),
        reviewedAt: new Date().toISOString()
      };
    }
    return pr;
  });

  const reviewedPermissionCount = permissionReviews.filter(pr => pr.reviewStatus !== "pending").length;

  return {
    ...state,
    permissionReviews,
    reviewedPermissionCount,
    status: reviewedPermissionCount > 0 || state.reviewedPreflightCount > 0 ? "in_review" : "not_started"
  };
}

/**
 * Updates a preflight review in the state.
 */
export function updatePreflightReview(
  state: WorkspaceAgentReadinessReviewState,
  checkId: string,
  reviewStatus: WorkspaceAgentPreflightReviewStatus,
  note?: string
): WorkspaceAgentReadinessReviewState {
  const preflightReviews = state.preflightReviews.map(cr => {
    if (cr.checkId === checkId) {
      return {
        ...cr,
        reviewStatus,
        note: sanitizeReadinessReviewNote(note),
        reviewedAt: new Date().toISOString()
      };
    }
    return cr;
  });

  const reviewedPreflightCount = preflightReviews.filter(cr => cr.reviewStatus !== "pending").length;

  return {
    ...state,
    preflightReviews,
    reviewedPreflightCount,
    status: state.reviewedPermissionCount > 0 || reviewedPreflightCount > 0 ? "in_review" : "not_started"
  };
}
