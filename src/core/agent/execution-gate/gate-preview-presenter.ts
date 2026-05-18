import { WorkspaceAgentExecutionGateResult } from "./gate-types";

export interface WorkspaceAgentGateRenderData {
  planId: string;
  requestId: string;
  status: string;
  decision: "blocked" | "requires_more_review" | "not_supported";
  decisionLabel: string;
  safeMessage: string;
  blocking: boolean;
  canExecute: boolean;
  canWrite: boolean;
  canRunShell: boolean;
  issuedCapability: null;
  sanitizedSummary: string;
  sanitizedConfirmation: string;
  checks: Array<{
    id: string;
    label: string;
    status: "pass" | "warning" | "blocked";
    message: string;
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
  notice: string;
}

/**
 * Maps a raw gate result to safe, presentation-ready data.
 */
export function mapGateResultToRenderData(result: WorkspaceAgentExecutionGateResult): WorkspaceAgentGateRenderData {
  const decisionLabels: Record<string, string> = {
    blocked: "ENGELENDİ",
    requires_more_review: "EK İNCELEME GEREKİYOR",
    not_supported: "DESTEKLENMİYOR"
  };

  return {
    planId: result.planId,
    requestId: result.requestId,
    status: result.status,
    decision: result.decision,
    decisionLabel: decisionLabels[result.decision] || result.decision.toUpperCase(),
    safeMessage: result.safeMessage,
    blocking: result.blocking,
    canExecute: false, // Force false for security
    canWrite: false,   // Force false for security
    canRunShell: false, // Force false for security
    issuedCapability: null,
    sanitizedSummary: result.sanitizedSummary,
    sanitizedConfirmation: result.sanitizedConfirmation,
    checks: result.checks.map(c => ({
      id: c.checkId,
      label: c.type.replace(/_/g, " ").toUpperCase(),
      status: c.status,
      message: c.message
    })),
    warnings: result.warnings,
    risks: result.risks,
    evaluatedAt: result.evaluatedAt,
    notice: "BU EKRAN YALNIZCA GATE PREVIEW'DUR. HİÇBİR YETKİ VERİLMEZ VE HİÇBİR İŞLEM YAPILMAZ."
  };
}
