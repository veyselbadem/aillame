import { PatchApplyRequest } from "./types";

export class ApprovalGate {
  validate(request: PatchApplyRequest): { ok: boolean; reason?: string } {
    if (!request.approval.approved) {
      return { ok: false, reason: "Explicit approval is required to apply patches." };
    }

    if (!request.approval.approvalText || request.approval.approvalText.trim().length < 5) {
      return { ok: false, reason: "Approval text must be at least 5 characters long for audit purposes." };
    }

    // High risk checks
    const hasHighRisk = request.proposal.riskSummary.overallRisk === "high";
    const approvalText = request.approval.approvalText.toUpperCase();
    
    if (hasHighRisk && !approvalText.includes("ONAYLIYORUM") && !approvalText.includes("APPROVE")) {
      return { ok: false, reason: "High-risk changes require explicit 'ONAYLIYORUM' or 'APPROVE' in the approval text." };
    }

    return { ok: true };
  }
}
