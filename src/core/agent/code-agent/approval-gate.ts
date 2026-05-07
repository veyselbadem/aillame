import crypto from 'crypto';
import { CodePatchApproval, CodePatchApprovalState } from './patch-workflow-types';

export class ApprovalGateService {
  private approvals = new Map<string, CodePatchApproval>();

  requestApproval(workflowId: string): CodePatchApproval {
    const requestId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');
    
    const approval: CodePatchApproval = {
      requestId,
      workflowId,
      status: "required",
      token,
      requestedAt: Date.now(),
      expiresAt: Date.now() + (30 * 60 * 1000) // 30 mins
    };

    this.approvals.set(workflowId, approval);
    return approval;
  }

  validateToken(workflowId: string, token: string): { valid: boolean; reason?: string } {
    const approval = this.approvals.get(workflowId);
    
    if (!approval) return { valid: false, reason: "No approval request found for this workflow." };
    if (approval.status !== "approved" && approval.status !== "required") {
        return { valid: false, reason: `Invalid approval state: ${approval.status}` };
    }
    if (approval.token !== token) return { valid: false, reason: "Invalid approval token." };
    if (approval.expiresAt && approval.expiresAt < Date.now()) {
      return { valid: false, reason: "Approval token has expired." };
    }

    return { valid: true };
  }

  approve(workflowId: string, token: string): boolean {
    const val = this.validateToken(workflowId, token);
    if (!val.valid) return false;

    const approval = this.approvals.get(workflowId)!;
    approval.status = "approved";
    approval.processedAt = Date.now();
    return true;
  }

  reject(workflowId: string, token: string): boolean {
    const approval = this.approvals.get(workflowId);
    if (!approval || approval.token !== token) return false;

    approval.status = "rejected";
    approval.processedAt = Date.now();
    return true;
  }

  getApprovalState(workflowId: string): CodePatchApprovalState {
    const approval = this.approvals.get(workflowId);
    return approval ? approval.status : "not-required";
  }
}

export const approvalGateService = new ApprovalGateService();
