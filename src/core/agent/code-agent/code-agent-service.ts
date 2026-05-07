import { normalizeProjectIdentity } from "@core/projects/project-identity";
import { scanProjectSafe } from "../project-scanner/project-scanner";
import type { ProjectScanRequest } from "../project-scanner/project-scanner-types";
import { checkCodeAgentSafety, type CodeAgentSafetyCheckRequest, type CodeAgentSafetyCheckResult } from "./code-agent-safety";
import { planCodeAgentTask } from "./code-agent-planner";
import type { CodeAgentPlan, CodeAgentTaskRequest, CodeAgentTaskResult } from "./code-agent-types";
import { proposePatch, type PatchProposal, type PatchProposalInput } from "./patch-generator";
import { planVerification, type VerificationRequest, type VerificationResult } from "./test-runner";

export function scanProject(request: ProjectScanRequest) {
  return scanProjectSafe(request);
}

export function planTask(request: CodeAgentTaskRequest): CodeAgentPlan {
  return planCodeAgentTask(request);
}

export function proposeCodeAgentPatch(request: PatchProposalInput): PatchProposal {
  return proposePatch(request);
}

export function verifyPlan(request: VerificationRequest): VerificationResult[] {
  return planVerification(request);
}

export function safetyCheck(request: CodeAgentSafetyCheckRequest): CodeAgentSafetyCheckResult {
  return checkCodeAgentSafety(request);
}

export function createCodeAgentTask(input: {
  projectId?: string;
  mode?: string;
  sourceApp?: string;
  rootPath?: string;
  userRequest: string;
  taskType?: CodeAgentTaskRequest["taskType"];
  targetFiles?: string[];
}): CodeAgentTaskResult | { success: false; error: { code: string; message: string } } {
  const identity = normalizeProjectIdentity({
    projectId: input.projectId,
    mode: input.mode,
    sourceApp: input.sourceApp,
    memoryScope: "project",
    taskType: input.taskType,
    responseFormat: "diagnostic",
  });

  if (!identity.ok) {
    return {
      success: false,
      error: {
        code: identity.code,
        message: identity.message,
      },
    };
  }

  const scan = input.rootPath
    ? scanProjectSafe({
        rootPath: input.rootPath,
        sanitizePaths: true,
        includeContentPreview: false,
      })
    : undefined;
  const plan = planCodeAgentTask({
    identity: identity.identity,
    rootPath: input.rootPath,
    userRequest: input.userRequest,
    taskType: input.taskType,
    targetFiles: input.targetFiles,
  });
  const safety = checkCodeAgentSafety({
    rootPath: input.rootPath,
    categories: ["file-read"],
  });

  return {
    success: true,
    projectId: identity.identity.projectId,
    taskId: `code_task_${Date.now().toString(36)}`,
    scan,
    plan,
    safety,
    diagnostics: {
      planOnly: true,
      fileWritesEnabled: false,
      commandExecutionEnabled: false,
    },
  };
}
