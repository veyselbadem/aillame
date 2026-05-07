import fs from 'fs';
import path from 'path';
import { 
  CodePatchApplyRequest, 
  CodePatchApplyResult, 
  CodePatchWorkflow 
} from './patch-workflow-types';
import { approvalGateService } from './approval-gate';

export class PatchApplyService {
  async applyPatch(workflow: CodePatchWorkflow, request: CodePatchApplyRequest): Promise<CodePatchApplyResult> {
    const { mode, approvalToken } = request;
    const diagnostics: any = { mode, startTime: Date.now() };

    // 1. Validate Approval
    if (workflow.approvalRequired) {
      const auth = approvalGateService.validateToken(workflow.workflowId, approvalToken);
      if (!auth.valid) {
        return {
          success: false,
          workflowId: workflow.workflowId,
          appliedFiles: [],
          failedFiles: [],
          error: `Approval failed: ${auth.reason}`,
          diagnostics
        };
      }
    }

    // 2. Dry-Run / Preview check
    if (mode === "preview-only") {
      return {
        success: true,
        workflowId: workflow.workflowId,
        appliedFiles: [],
        failedFiles: [],
        diagnostics: { ...diagnostics, status: "preview-completed" }
      };
    }

    const appliedFiles: string[] = [];
    const failedFiles: string[] = [];

    // 3. Process changes
    for (const fileChange of workflow.proposal.files) {
      try {
        const fullPath = path.join(process.cwd(), fileChange.filePath);
        
        // Safety: Check if path is within cwd
        if (!fullPath.startsWith(process.cwd())) {
          throw new Error("Target path is outside project root.");
        }

        // Safety: Block sensitive files
        if (fileChange.riskLevel === "blocked") {
          throw new Error("File is blocked by safety policy.");
        }

        if (mode === "dry-run") {
          // Check if file exists for update
          if (fileChange.changeType === "update" && !fs.existsSync(fullPath)) {
            throw new Error("File not found for update.");
          }
          continue;
        }

        if (mode === "apply") {
          if (fileChange.changeType === "update" || fileChange.changeType === "create") {
            // Limited apply: only text files
            if (fileChange.afterSnippet) {
              // Ensure directory exists
              fs.mkdirSync(path.dirname(fullPath), { recursive: true });
              fs.writeFileSync(fullPath, fileChange.afterSnippet, 'utf8');
              appliedFiles.push(fileChange.filePath);
            }
          } else {
            throw new Error(`Change type ${fileChange.changeType} not supported in foundation apply.`);
          }
        }
      } catch (err) {
        failedFiles.push(`${fileChange.filePath}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const success = failedFiles.length === 0;
    diagnostics.endTime = Date.now();

    return {
      success,
      workflowId: workflow.workflowId,
      appliedFiles,
      failedFiles,
      error: success ? undefined : "One or more files failed to apply.",
      diagnostics
    };
  }
}

export const patchApplyService = new PatchApplyService();
