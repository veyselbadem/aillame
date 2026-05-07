import * as path from "path";
import { isPathInsideProjectRoot, isSensitiveCodeAgentPath } from "../project-scanner/project-scanner";
import type { CodeAgentRiskLevel } from "./code-agent-types";

export type CodeAgentPermissionLevel = "allow" | "approval-required" | "blocked";
export type CodeAgentRiskCategory =
  | "file-read"
  | "file-write"
  | "file-delete"
  | "command-run"
  | "dependency-change"
  | "migration"
  | "git-operation"
  | "secret-access"
  | "network-access"
  | "model/checkpoint-access";

export type CodeAgentSafetyViolation = {
  category: CodeAgentRiskCategory;
  code: string;
  message: string;
};

export type CodeAgentSafetyCheckRequest = {
  rootPath?: string;
  targetPath?: string;
  command?: string;
  categories: CodeAgentRiskCategory[];
};

export type CodeAgentSafetyCheckResult = {
  allowed: boolean;
  approvalRequired: boolean;
  riskLevel: CodeAgentRiskLevel;
  violations: CodeAgentSafetyViolation[];
  warnings: string[];
  sanitizedMessage: string;
};

const BLOCKED_COMMAND_PATTERNS = [
  /\brm\b/i,
  /\bdel\b/i,
  /\brmdir\b/i,
  /\bformat\b/i,
  /\bnpm\s+install\b/i,
  /\bnpm\s+update\b/i,
  /\bgit\s+push\b/i,
  /\bcurl\b.*\|/i,
  /\binvoke-webrequest\b/i,
];

function maxRisk(values: CodeAgentRiskLevel[]): CodeAgentRiskLevel {
  if (values.includes("blocked")) return "blocked";
  if (values.includes("high")) return "high";
  if (values.includes("medium")) return "medium";
  return "low";
}

function categoryRisk(category: CodeAgentRiskCategory): CodeAgentRiskLevel {
  if (category === "secret-access" || category === "file-delete") return "blocked";
  if (category === "command-run" || category === "file-write" || category === "dependency-change" || category === "migration" || category === "git-operation" || category === "network-access") return "high";
  if (category === "model/checkpoint-access") return "medium";
  return "low";
}

export function checkCodeAgentSafety(request: CodeAgentSafetyCheckRequest): CodeAgentSafetyCheckResult {
  const violations: CodeAgentSafetyViolation[] = [];
  const warnings: string[] = [];
  const categories = new Set(request.categories);

  if (request.rootPath && request.targetPath) {
    const target = path.resolve(request.rootPath, request.targetPath);
    if (!isPathInsideProjectRoot(path.resolve(request.rootPath), target)) {
      violations.push({ category: "file-read", code: "PATH_OUTSIDE_ROOT", message: "Target path is outside project root." });
    }
    if (isSensitiveCodeAgentPath(target)) {
      violations.push({ category: "secret-access", code: "SENSITIVE_FILE_BLOCKED", message: "Sensitive files cannot be read or modified by Code Agent." });
    }
    if (/\.(safetensors|gguf|bin|onnx|pt|pth)$/i.test(target)) {
      warnings.push("Model/checkpoint binary paths are summary-only.");
    }
  }

  if (request.command) {
    if (BLOCKED_COMMAND_PATTERNS.some((pattern) => pattern.test(request.command || ""))) {
      violations.push({ category: "command-run", code: "COMMAND_BLOCKED", message: "Command is outside the safe verifier policy." });
    }
  }

  for (const category of categories) {
    if (category === "secret-access") violations.push({ category, code: "SECRET_ACCESS_BLOCKED", message: "Secret access is blocked by default." });
    if (category === "file-delete") violations.push({ category, code: "FILE_DELETE_BLOCKED", message: "File deletion is blocked by default." });
    if (category === "command-run") warnings.push("Command execution requires user approval and allowlist validation.");
    if (category === "file-write") warnings.push("File writes require user approval; this phase is proposal-only.");
    if (category === "dependency-change") warnings.push("Dependency changes require explicit approval.");
  }

  const risks = request.categories.map(categoryRisk);
  const riskLevel = violations.length > 0 ? "blocked" : maxRisk(risks);
  const approvalRequired = riskLevel === "high" || request.categories.some((category) => category !== "file-read");

  return {
    allowed: violations.length === 0 && !approvalRequired,
    approvalRequired: violations.length > 0 ? true : approvalRequired,
    riskLevel,
    violations,
    warnings,
    sanitizedMessage: violations.length > 0
      ? "Code Agent safety policy blocked or constrained this request."
      : "Code Agent safety policy allows this request in plan/preview mode.",
  };
}
