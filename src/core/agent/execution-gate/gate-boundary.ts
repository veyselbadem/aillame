import { 
  WorkspaceAgentExecutionGateRequest, 
  WorkspaceAgentExecutionGateResult, 
  WorkspaceAgentExecutionGateCheck,
  WorkspaceAgentExecutionGateRisk,
  WorkspaceAgentExecutionGateWarning
} from "./gate-types";
import { WORKSPACE_AGENT_EXECUTION_GATE_POLICY } from "./gate-policy";
import { sanitizeExecutionGateInput, detectExecutionGateIntents } from "./gate-sanitizer";

/**
 * Evaluates an execution request at the gate level.
 * This phase is strictly non-executable.
 */
export async function evaluateWorkspaceAgentExecutionGate(
  request: WorkspaceAgentExecutionGateRequest
): Promise<WorkspaceAgentExecutionGateResult> {
  const evaluatedAt = new Date().toISOString();
  const checks: WorkspaceAgentExecutionGateCheck[] = [];
  const warnings: WorkspaceAgentExecutionGateWarning[] = [];
  const risks: WorkspaceAgentExecutionGateRisk[] = [];

  // 1. Mode Validation
  if (request.requestedMode !== "gate_check_only") {
    return {
      requestId: request.requestId,
      planId: request.planId,
      status: "evaluated",
      decision: "blocked",
      reasonCode: "INVALID_MODE",
      safeMessage: "Yalnızca 'gate_check_only' modu desteklenmektedir.",
      blocking: true,
      canExecute: false,
      canWrite: false,
      canRunShell: false,
      issuedCapability: null,
      sanitizedSummary: "",
      sanitizedConfirmation: "",
      checks: [{
        checkId: "mode_validation",
        type: "execution_not_available",
        status: "blocked",
        message: "Geçersiz çalışma modu.",
        blocking: true
      }],
      warnings: [],
      risks: [],
      evaluatedAt
    };
  }

  // 2. Input Sanitization
  const sanitizedSummary = sanitizeExecutionGateInput(request.userVisibleSummary, WORKSPACE_AGENT_EXECUTION_GATE_POLICY.maxSummaryLength);
  const sanitizedConfirmation = sanitizeExecutionGateInput(request.userConfirmationText, WORKSPACE_AGENT_EXECUTION_GATE_POLICY.maxConfirmationLength);

  // 3. Intent Detection
  const summaryIntents = detectExecutionGateIntents(sanitizedSummary);
  const confirmationIntents = detectExecutionGateIntents(sanitizedConfirmation);

  if (summaryIntents.hasCommandIntent || confirmationIntents.hasCommandIntent) {
    warnings.push({ code: "COMMAND_INTENT_DETECTED", message: "Komut yürütme benzeri niyet tespit edildi." });
    risks.push({ code: "COMMAND_RISK", level: "high", message: "Kullanıcı girdisinde komut yürütme riski var." });
  }

  if (summaryIntents.hasWriteIntent || confirmationIntents.hasWriteIntent) {
    warnings.push({ code: "WRITE_INTENT_DETECTED", message: "Dosya yazma benzeri niyet tespit edildi." });
    risks.push({ code: "WRITE_RISK", level: "medium", message: "Kullanıcı girdisinde dosya yazma riski var." });
  }

  // 4. Basic Checks Skeleton
  checks.push({
    checkId: "readiness_check",
    type: "readiness_status_checked",
    status: request.readinessStatus === "ready_for_future_review" ? "pass" : "warning",
    message: request.readinessStatus === "ready_for_future_review" ? "Readiness durumu doğrulandı." : "Readiness durumu belirsiz.",
    blocking: false
  });

  checks.push({
    checkId: "permission_check",
    type: "permission_not_granted",
    status: "blocked",
    message: "Gerçek yetki (permission grant) tanımlı değil.",
    blocking: true
  });

  checks.push({
    checkId: "engine_check",
    type: "action_executor_not_available",
    status: "blocked",
    message: "ActionExecutor motoru bu fazda kapalıdır.",
    blocking: true
  });

  // 5. Decision Logic
  const isBlocking = checks.some(c => c.blocking);
  const decision = isBlocking ? "blocked" : "requires_more_review";

  return {
    requestId: request.requestId,
    planId: request.planId,
    status: "evaluated",
    decision: decision,
    reasonCode: isBlocking ? "GATE_BLOCKING" : "FURTHER_REVIEW_REQUIRED",
    safeMessage: isBlocking 
      ? "Yürütme isteği güvenlik bariyeri (gate) tarafından engellendi. Gerçek yürütme yetkisi tanımlı değil."
      : "İstek incelenmek üzere işaretlendi.",
    blocking: true,
    canExecute: false,
    canWrite: false,
    canRunShell: false,
    issuedCapability: null,
    sanitizedSummary: sanitizedSummary,
    sanitizedConfirmation: sanitizedConfirmation,
    checks,
    warnings,
    risks,
    evaluatedAt
  };
}
