import type { AillameProjectIdentity } from "@core/projects/project-identity";
import type {
  CodeAgentApprovalRequirement,
  CodeAgentPlan,
  CodeAgentRiskLevel,
  CodeAgentStep,
  CodeAgentTaskRequest,
  CodeAgentTaskType,
} from "./code-agent-types";

function inferTaskType(text: string, explicit?: CodeAgentTaskType): CodeAgentTaskType {
  if (explicit) return explicit;
  const value = text.toLocaleLowerCase("tr-TR");
  if (/(refactor|yeniden düzenle)/.test(value)) return "refactor";
  if (/(fix|bug|hata|düzelt|duzelt)/.test(value)) return "fix";
  if (/(edit|değiştir|degistir|patch)/.test(value)) return "edit";
  if (/(test|typecheck|build|doğrula|dogrula)/.test(value)) return value.includes("build") ? "build" : "test";
  if (/(açıkla|acikla|explain)/.test(value)) return "explain";
  if (/(prompt)/.test(value)) return "generate-prompt";
  if (/(scan|tara|dosya listesi)/.test(value)) return "project-scan";
  if (/(analiz|incele|analyze)/.test(value)) return "analyze";
  return "unknown";
}

function riskForTask(taskType: CodeAgentTaskType): CodeAgentRiskLevel {
  if (taskType === "analyze" || taskType === "explain" || taskType === "generate-prompt" || taskType === "project-scan") return "low";
  if (taskType === "test" || taskType === "build") return "medium";
  if (taskType === "edit" || taskType === "refactor" || taskType === "fix") return "high";
  return "medium";
}

function approvalFor(risk: CodeAgentRiskLevel): CodeAgentApprovalRequirement {
  if (risk === "blocked") return "blocked";
  if (risk === "high" || risk === "medium") return "user-approval";
  return "none";
}

function step(input: Omit<CodeAgentStep, "approvalRequired">): CodeAgentStep {
  return {
    ...input,
    approvalRequired: input.requiresFileWrite || input.requiresCommand || input.riskLevel === "high" || input.riskLevel === "blocked",
  };
}

function makeSteps(identity: AillameProjectIdentity, request: CodeAgentTaskRequest, taskType: CodeAgentTaskType): CodeAgentStep[] {
  const targetFiles = request.targetFiles;
  const steps: CodeAgentStep[] = [
    step({
      id: "scan",
      title: "Scan project safely",
      description: "Build a project map while skipping generated, dependency, cache, git, and sensitive files.",
      actionType: "project-scan",
      requiresFileRead: true,
      requiresFileWrite: false,
      requiresCommand: false,
      riskLevel: "low",
      expectedOutput: "Project scan summary with warnings and package scripts.",
    }),
    step({
      id: "analyze",
      title: "Analyze task and risks",
      description: `Classify the request for project ${identity.projectId} and identify files, risks, and approval gates.`,
      actionType: "analyze",
      targetFiles,
      requiresFileRead: true,
      requiresFileWrite: false,
      requiresCommand: false,
      riskLevel: "low",
      expectedOutput: "Structured task analysis and relevant target files.",
    }),
  ];

  if (taskType === "edit" || taskType === "refactor" || taskType === "fix") {
    steps.push(step({
      id: "propose-patch",
      title: "Propose patch",
      description: "Generate a diff proposal without applying file writes.",
      actionType: "patch-proposal",
      targetFiles,
      requiresFileRead: true,
      requiresFileWrite: true,
      requiresCommand: false,
      riskLevel: "high",
      expectedOutput: "Patch proposal with rollback notes and approvalRequired=true.",
    }));
  }

  if (taskType === "test" || taskType === "build" || taskType === "fix" || taskType === "refactor") {
    steps.push(step({
      id: "verify",
      title: "Plan verification",
      description: "Select safe allowlisted verification commands in preview mode.",
      actionType: "verification",
      requiresFileRead: false,
      requiresFileWrite: false,
      requiresCommand: true,
      riskLevel: "medium",
      expectedOutput: "Verification plan with command allowlist decision and summarized expected output.",
    }));
  }

  steps.push(step({
    id: "report",
    title: "Return structured report",
    description: "Return plan-only response; do not write files or execute commands automatically.",
    actionType: "safety-check",
    requiresFileRead: false,
    requiresFileWrite: false,
    requiresCommand: false,
    riskLevel: "low",
    expectedOutput: "Structured Code Agent report.",
  }));

  return steps;
}

function highestRisk(steps: CodeAgentStep[]): CodeAgentRiskLevel {
  if (steps.some((item) => item.riskLevel === "blocked")) return "blocked";
  if (steps.some((item) => item.riskLevel === "high")) return "high";
  if (steps.some((item) => item.riskLevel === "medium")) return "medium";
  return "low";
}

export function planCodeAgentTask(request: CodeAgentTaskRequest): CodeAgentPlan {
  const taskType = inferTaskType(request.userRequest, request.taskType);
  const steps = makeSteps(request.identity, request, taskType);
  const riskLevel = highestRisk(steps);
  const approvalRequired = steps.some((item) => item.approvalRequired);

  return {
    success: true,
    projectId: request.identity.projectId,
    taskType,
    summary: "Code Agent produced a plan-only workflow. File writes and command execution remain disabled until explicit approval.",
    steps,
    approval: approvalFor(riskLevel),
    riskLevel,
    diagnostics: {
      advisoryOnly: true,
      selectedTaskType: taskType,
      highestRisk: riskLevel,
      approvalRequired,
      nanoAdvisoryUsed: Boolean(request.nanoAdvisory),
    },
  };
}
