import { approvalGateService } from "./approval-gate";
import { CodePatchVerifierPlan } from "./patch-workflow-types";

export interface VerifierRunRequest {
  workflowId: string;
  approvalToken: string;
  command: string;
}

export class VerifierService {
  private readonly ALLOWLIST = [
    "npm run typecheck",
    "npm run build",
    "npm test",
    "npm run lint",
    "cargo check",
    "npm run smoke:foundation",
    "npm run smoke:project-provider",
    "npm run smoke:code-agent",
    "npm run smoke:persistent-storage",
    "npm run smoke:security-api-keys",
    "npm run smoke:provider-e2e"
  ];

  validateCommand(command: string): { allowed: boolean; reason?: string } {
    const isAllowlisted = this.ALLOWLIST.some(pattern => command.startsWith(pattern));
    if (!isAllowlisted) {
      return { allowed: false, reason: "Command is not in the verifier allowlist." };
    }

    const blockedPatterns = [";", "&&", "||", ">", "|", "rm ", "del ", "rd ", "git push", "npm install"];
    const hasBlocked = blockedPatterns.some(p => command.includes(p));
    if (hasBlocked) {
      return { allowed: false, reason: "Command contains blocked shell operators or destructive actions." };
    }

    return { allowed: true };
  }

  async runVerifier(request: VerifierRunRequest): Promise<{ success: boolean; output: string; error?: string }> {
    const { workflowId, approvalToken, command } = request;

    // 1. Approval Check
    const auth = approvalGateService.validateToken(workflowId, approvalToken);
    if (!auth.valid) {
      return { success: false, output: "", error: `Approval failed: ${auth.reason}` };
    }

    // 2. Allowlist Check
    const validation = this.validateCommand(command);
    if (!validation.allowed) {
      return { success: false, output: "", error: validation.reason };
    }

    // 3. Execution (Simulated for foundation)
    // In a real app, this would use child_process.exec
    return {
      success: true,
      output: `[Simulated] Running verifier: ${command}\nResult: Success (Foundation Mode)`,
    };
  }

  getVerifierPlan(commands: string[]): CodePatchVerifierPlan {
    return {
      commands,
      requiresApproval: true,
      allowlistedOnly: true
    };
  }
}

export const verifierService = new VerifierService();
