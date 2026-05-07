import crypto from 'crypto';
import { 
  CodePatchWorkflow, 
  CodePatchWorkflowStatus,
  CodePatchApplyRequest,
  CodePatchApplyResult
} from './patch-workflow-types';
import { PatchFormatter } from './patch-formatter';
import { approvalGateService } from './approval-gate';
import { patchApplyService } from './patch-apply-service';
import { verifierService } from './verifier-service';
import { CodeAgentTaskRequest } from './code-agent-types';

export class PatchWorkflowService {
  private workflows = new Map<string, CodePatchWorkflow>();

  createWorkflow(request: CodeAgentTaskRequest): CodePatchWorkflow {
    const workflowId = `wf-${crypto.randomBytes(8).toString('hex')}`;
    
    const workflow: CodePatchWorkflow = {
      workflowId,
      projectId: request.identity.projectId,
      sourceApp: request.identity.sourceApp || "aillame",
      taskType: request.taskType || "edit",
      status: "awaiting-approval",
      riskLevel: "medium",
      approvalRequired: true,
      approvalState: "required",
      proposal: {
        summary: `Patch proposal for: ${request.userRequest}`,
        files: [],
        totalAdditions: 0,
        totalDeletions: 0,
        riskLevel: "medium"
      },
      safety: {
        allowed: true,
        blockedFiles: [],
        warnings: []
      },
      verifierPlan: verifierService.getVerifierPlan(["npm run typecheck", "npm run build"]),
      rollbackNotes: {
        canRollback: true,
        restoreInstructions: "Use 'git restore .' or apply the inverse patch."
      },
      auditEventIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      diagnostics: {}
    };

    // Generate a mock file change for foundation
    if (request.targetFiles && request.targetFiles.length > 0) {
      for (const file of request.targetFiles) {
        const change = PatchFormatter.createPreview({
          filePath: file,
          changeType: "update",
          before: "// original content",
          after: "// updated content by Aillame Code Agent"
        });
        workflow.proposal.files.push(change);
        workflow.proposal.totalAdditions += change.additions;
        workflow.proposal.totalDeletions += change.deletions;
        
        if (change.riskLevel === "blocked") {
            workflow.safety.allowed = false;
            workflow.safety.blockedFiles.push(file);
            workflow.status = "blocked";
        }
      }
    }

    this.workflows.set(workflowId, workflow);
    
    // Auto-request approval token
    approvalGateService.requestApproval(workflowId);

    return workflow;
  }

  getWorkflow(workflowId: string): CodePatchWorkflow | undefined {
    return this.workflows.get(workflowId);
  }

  async approveWorkflow(workflowId: string, token: string): Promise<boolean> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return false;

    const success = approvalGateService.approve(workflowId, token);
    if (success) {
      workflow.approvalState = "approved";
      workflow.status = "approved";
      workflow.updatedAt = Date.now();
    }
    return success;
  }

  async applyWorkflow(request: CodePatchApplyRequest): Promise<CodePatchApplyResult> {
    const workflow = this.workflows.get(request.workflowId);
    if (!workflow) {
      return {
        success: false,
        workflowId: request.workflowId,
        appliedFiles: [],
        failedFiles: [],
        error: "Workflow not found.",
        diagnostics: {}
      };
    }

    const result = await patchApplyService.applyPatch(workflow, request);
    
    if (result.success) {
      if (request.mode === "apply") {
        workflow.status = "applied";
      } else if (request.mode === "dry-run") {
        // Keep as approved or proposed
      }
      workflow.updatedAt = Date.now();
    } else {
      workflow.status = "failed";
      workflow.updatedAt = Date.now();
    }

    return result;
  }
}

export const patchWorkflowService = new PatchWorkflowService();
