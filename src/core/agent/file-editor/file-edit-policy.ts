import * as path from "path";
import { isPathInsideRoot, isSensitiveFileName, resolveWorkspaceRoot } from "../workspace/workspace-safety";
import type {
  AillameFileEditPolicyResult,
  AillameFileEditRequest,
  AillameFileEditRisk,
} from "./file-edit-types";

function normalizeRelativePath(relativePath: string): string {
  return relativePath.replace(/\\/g, "/").trim();
}

function riskFor(request: AillameFileEditRequest, blockedReasons: readonly string[]): AillameFileEditRisk {
  if (blockedReasons.length > 0) return "blocked";
  if (request.operation === "replace-text" || request.operation === "insert-text" || request.operation === "append-text") return "medium";
  if (request.operation === "create-file") return "high";
  if (request.operation === "delete-file" || request.operation === "rename-file") return "blocked";
  return "blocked";
}

function buildBlockedReasons(request: AillameFileEditRequest, rootPath: string, targetPath: string): string[] {
  const reasons: string[] = [];
  const relativePath = normalizeRelativePath(request.relativePath);

  if (!request.description.trim()) reasons.push("MISSING_EDIT_DESCRIPTION");
  if (!relativePath) reasons.push("EMPTY_RELATIVE_PATH");
  if (path.isAbsolute(relativePath)) reasons.push("ABSOLUTE_PATH_NOT_ALLOWED");
  if (relativePath.startsWith("../") || relativePath === "..") reasons.push("PATH_TRAVERSAL_BLOCKED");
  if (!isPathInsideRoot(rootPath, targetPath)) reasons.push("TARGET_OUTSIDE_ROOT");
  if (isSensitiveFileName(path.basename(relativePath)) && !request.allowSensitiveFileEdit) reasons.push("SENSITIVE_FILE_EDIT_BLOCKED");
  if (request.operation === "create-file" && !request.allowCreateFile) reasons.push("CREATE_FILE_REQUIRES_EXPLICIT_ALLOW");
  if (request.operation === "delete-file") reasons.push("DELETE_FILE_BLOCKED_IN_DRY_RUN_PHASE");
  if (request.operation === "rename-file") reasons.push("RENAME_FILE_BLOCKED_IN_DRY_RUN_PHASE");
  if (request.operation === "unknown") reasons.push("UNKNOWN_EDIT_OPERATION");
  if (request.operation === "replace-text" && request.beforeText === undefined) reasons.push("REPLACE_TEXT_REQUIRES_BEFORE_TEXT");
  if (request.operation === "replace-text" && request.afterText === undefined) reasons.push("REPLACE_TEXT_REQUIRES_AFTER_TEXT");

  return reasons;
}

export function evaluateFileEditPolicy(request: AillameFileEditRequest): AillameFileEditPolicyResult {
  const root = resolveWorkspaceRoot(request.rootPath);
  const relativePath = normalizeRelativePath(request.relativePath);
  const targetPath = path.resolve(root.rootPath, relativePath);
  const blockedReasons = [
    ...root.errors.map((error) => `ROOT_ERROR:${error}`),
    ...buildBlockedReasons(request, root.rootPath, targetPath),
  ];
  const risk = riskFor(request, blockedReasons);
  const allowed = false;
  const warnings = [
    "Dry-run only: file edits are not applied in this phase.",
    "A user approval gate is required before any future write operation.",
  ];

  if (risk === "high") warnings.push("This edit type may create new project surface and needs careful review.");

  return {
    allowed,
    risk,
    requiresUserApproval: true,
    reason: blockedReasons.length > 0
      ? "File edit request is blocked by safety policy."
      : "File edit request is structurally valid but remains dry-run only in this phase.",
    blockedReasons,
    warnings,
    dryRunOnly: true,
  };
}
