import { 
  WorkspaceAgentExecutionReadinessResult,
  WorkspaceAgentExecutionPermissionRequirement,
  WorkspaceAgentExecutionPreflightCheck,
  WorkspaceAgentExecutionReadinessWarning,
  WorkspaceAgentExecutionReadinessRisk
} from "./readiness-types";

export interface WorkspaceAgentReadinessRenderData {
  planId: string;
  status: string;
  statusColor: "gray" | "yellow" | "red" | "green";
  isReadyForFuturePhase: boolean;
  preflightChecks: Array<{
    id: string;
    label: string;
    status: "pass" | "warning" | "blocked";
    message: string;
    isBlocking: boolean;
  }>;
  permissions: Array<{
    id: string;
    type: string;
    description: string;
    riskLevel: "low" | "medium" | "high" | "critical";
    isSatisfied: boolean;
    isRequired: boolean;
  }>;
  warnings: Array<{
    code: string;
    message: string;
  }>;
  risks: Array<{
    code: string;
    level: string;
    message: string;
  }>;
  evaluatedAt: string;
  securityNotice: string;
}

/**
 * Maps the execution readiness result to a safe, UI-ready render data structure.
 * Ensures no sensitive data leaks into the UI layer.
 */
export function mapReadinessResultToRenderData(
  result: WorkspaceAgentExecutionReadinessResult
): WorkspaceAgentReadinessRenderData {
  const statusColors: Record<string, WorkspaceAgentReadinessRenderData["statusColor"]> = {
    "not_ready": "gray",
    "blocked": "red",
    "ready_for_future_review": "green"
  };

  return {
    planId: result.planId,
    status: result.status.toUpperCase().replace(/_/g, " "),
    statusColor: statusColors[result.status] || "gray",
    isReadyForFuturePhase: result.isReadyForFuturePhase,
    preflightChecks: result.preflightChecks.map(check => ({
      id: check.checkId,
      label: formatPreflightLabel(check.type),
      status: check.status,
      message: check.message,
      isBlocking: check.blocking
    })),
    permissions: result.permissions.map(perm => ({
      id: perm.requirementId,
      type: formatPermissionType(perm.type),
      description: perm.description,
      riskLevel: perm.riskLevel,
      isSatisfied: perm.satisfied,
      isRequired: perm.required
    })),
    warnings: result.warnings.map(w => ({
      code: w.code,
      message: w.message
    })),
    risks: result.risks.map(r => ({
      code: r.code,
      level: r.level.toUpperCase(),
      message: r.message
    })),
    evaluatedAt: new Date(result.evaluatedAt).toLocaleString(),
    securityNotice: "BU EKRAN YALNIZCA ÖNİZLEMEDİR. HİÇBİR DOSYA DEĞİŞTİRİLMEZ VEYA KOMUT ÇALIŞTIRILMAZ."
  };
}

function formatPreflightLabel(type: string): string {
  return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function formatPermissionType(type: string): string {
  return type.replace(/^future_/, "").replace(/_/g, " ").toUpperCase();
}
