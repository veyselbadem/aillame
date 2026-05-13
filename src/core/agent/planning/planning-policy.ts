import type { WorkspaceAgentPlanRequest, WorkspaceAgentPlanStepType } from "./planning-types";

export const WORKSPACE_AGENT_PLANNING_POLICY = {
  mode: "plan_only" as const,
  allowsExecution: false,
  allowsFileWrites: false,
  allowsShellCommands: false,
  allowsActionExecutor: false,
  allowsCommandRegistry: false,
  allowedStepTypes: ["inspect", "edit_proposal", "test_proposal", "manual_review", "ask_user"] as WorkspaceAgentPlanStepType[],
};

export function isPlanOnlyRequest(request: WorkspaceAgentPlanRequest): boolean {
  return request.mode === WORKSPACE_AGENT_PLANNING_POLICY.mode;
}

export function getPlanOnlyPolicyNotes(): string[] {
  return [
    "Plan steps are non-executable in this phase.",
    "File write proposals require explicit future permission.",
    "Shell command suggestions are informational only.",
    "Future execution surfaces remain disabled in this phase."
  ];
}