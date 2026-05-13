import { 
  WorkspaceAgentExecutionReadinessRequest, 
  WorkspaceAgentExecutionReadinessResult,
  WorkspaceAgentExecutionPreflightCheck,
  WorkspaceAgentExecutionPermissionRequirement,
  WorkspaceAgentExecutionReadinessWarning,
  WorkspaceAgentExecutionReadinessRisk
} from "./readiness-types";
import { WORKSPACE_AGENT_EXECUTION_READINESS_POLICY } from "./readiness-policy";
import { sanitizeReadinessInput, detectReadinessIntents } from "./readiness-sanitizer";

/**
 * Evaluates the readiness of a workspace agent plan for future execution.
 * This function ONLY performs readiness assessment and NEVER triggers execution.
 */
export function evaluateWorkspaceAgentExecutionReadiness(
  request: WorkspaceAgentExecutionReadinessRequest
): WorkspaceAgentExecutionReadinessResult {
  const evaluatedAt = new Date().toISOString();
  const warnings: WorkspaceAgentExecutionReadinessWarning[] = [];
  const risks: WorkspaceAgentExecutionReadinessRisk[] = [];

  // 1. Policy check: Mode must be readiness_only
  if (request.requestedMode !== WORKSPACE_AGENT_EXECUTION_READINESS_POLICY.mode) {
    return {
      planId: request.planId,
      status: "blocked",
      preflightChecks: [{
        checkId: "invalid_mode",
        type: "no_execution_available",
        status: "blocked",
        message: "Only 'readiness_only' mode is supported in this phase.",
        blocking: true
      }],
      permissions: [],
      warnings: [{ code: "INVALID_MODE", message: "Requested mode not supported." }],
      risks: [{ code: "SECURITY_VIOLATION", level: "critical", message: "Attempted execution mode in readiness-only phase." }],
      evaluatedAt,
      isReadyForFuturePhase: false
    };
  }

  // 2. Sanitization
  const cleanSummary = sanitizeReadinessInput(
    request.userVisibleSummary, 
    WORKSPACE_AGENT_EXECUTION_READINESS_POLICY.maxSummaryLength
  );
  const cleanConfirmation = sanitizeReadinessInput(
    request.userConfirmationText, 
    WORKSPACE_AGENT_EXECUTION_READINESS_POLICY.maxConfirmationLength
  );

  // 3. Intent Detection
  const summaryIntent = detectReadinessIntents(cleanSummary);
  const confirmationIntent = detectReadinessIntents(cleanConfirmation);

  if (summaryIntent.hasCommandIntent || confirmationIntent.hasCommandIntent) {
    risks.push({ 
      code: "COMMAND_INTENT_DETECTED", 
      level: "high", 
      message: "Input contains intent that looks like a shell command. Execution is disabled." 
    });
  }

  if (summaryIntent.hasWriteIntent || confirmationIntent.hasWriteIntent) {
    risks.push({ 
      code: "WRITE_INTENT_DETECTED", 
      level: "medium", 
      message: "Input contains intent that looks like a file write. File system is read-only." 
    });
  }

  // 4. Preflight Checks Skeleton
  const preflightChecks: WorkspaceAgentExecutionPreflightCheck[] = [
    {
      checkId: "exec_gate",
      type: "no_execution_available",
      status: "pass",
      message: "Execution engine is physically disconnected (Readiness Boundary).",
      blocking: false
    },
    {
      checkId: "write_gate",
      type: "no_file_write_available",
      status: "pass",
      message: "File writer is physically disconnected.",
      blocking: false
    },
    {
      checkId: "reg_gate",
      type: "no_registry_available",
      status: "pass",
      message: "Command Registry is not reachable from this module.",
      blocking: false
    }
  ];

  if (!cleanSummary) {
    warnings.push({ code: "MISSING_SUMMARY", message: "No user-visible summary provided for review." });
  } else {
    preflightChecks.push({
      checkId: "summary_check",
      type: "safe_summary_present",
      status: "pass",
      message: "User summary is present and sanitized.",
      blocking: false
    });
  }

  // 5. Permission Requirements (always unsatisfied in this phase)
  const permissions: WorkspaceAgentExecutionPermissionRequirement[] = [];
  
  if (request.approvedStepIds.length > 0) {
    permissions.push({
      requirementId: "future_review",
      type: "future_manual_confirmation",
      required: true,
      satisfied: false,
      description: "Manual review of approved steps in an authorized execution environment.",
      riskLevel: "medium",
      blocking: true
    });
  }

  // 6. Final Status
  let status: WorkspaceAgentExecutionReadinessResult["status"] = "ready_for_future_review";
  const hasBlockingRisk = risks.some(r => r.level === "critical" || r.level === "high");
  
  if (hasBlockingRisk) {
    status = "blocked";
  } else if (request.approvedStepIds.length === 0) {
    status = "not_ready";
    warnings.push({ code: "NO_APPROVED_STEPS", message: "No steps have been approved for future execution." });
  }

  return {
    planId: request.planId,
    status,
    preflightChecks,
    permissions,
    warnings,
    risks,
    evaluatedAt,
    isReadyForFuturePhase: status === "ready_for_future_review"
  };
}
