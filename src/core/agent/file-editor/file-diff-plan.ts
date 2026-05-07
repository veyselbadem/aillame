import * as path from "path";
import { evaluateFileEditPolicy } from "./file-edit-policy";
import type { AillameFileDiffPlan, AillameFileEditRequest } from "./file-edit-types";

const PREVIEW_LIMIT = 500;

function preview(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return value.length > PREVIEW_LIMIT ? `${value.slice(0, PREVIEW_LIMIT)}...` : value;
}

function buildAfterText(request: AillameFileEditRequest): string | undefined {
  if (request.operation === "replace-text") return request.afterText;
  if (request.operation === "insert-text") return `${request.insertText ?? ""}${request.beforeText ?? ""}`;
  if (request.operation === "append-text") return `${request.beforeText ?? ""}${request.insertText ?? ""}`;
  if (request.operation === "create-file") return request.createContent ?? "";
  return undefined;
}

function buildDiffPreview(beforeText: string | undefined, afterText: string | undefined): string | undefined {
  if (beforeText === undefined && afterText === undefined) return undefined;
  return [
    "--- before",
    `- ${preview(beforeText ?? "")}`,
    "+++ after",
    `+ ${preview(afterText ?? "")}`,
  ].join("\n");
}

function backupPathFor(request: AillameFileEditRequest): string {
  const safeRelative = request.relativePath.replace(/[\\/]/g, "__");
  return path.join(request.rootPath, ".aillame-backups", `${safeRelative}.bak`);
}

export function buildFileDiffPlan(request: AillameFileEditRequest): AillameFileDiffPlan {
  const policy = evaluateFileEditPolicy(request);
  const afterText = buildAfterText(request);
  const backupRequired = request.operation !== "create-file" && request.operation !== "unknown";
  const backupBlocked = policy.risk === "blocked";

  return {
    success: true,
    mode: "dry-run",
    rootPath: request.rootPath,
    relativePath: request.relativePath,
    operation: request.operation,
    risk: policy.risk,
    beforePreview: preview(request.beforeText),
    afterPreview: preview(afterText),
    diffPreview: buildDiffPreview(request.beforeText, afterText),
    policy,
    backupPlan: {
      required: backupRequired,
      strategy: backupBlocked ? "blocked" : backupRequired ? "copy-before-write" : "not-needed",
      backupPath: backupBlocked || !backupRequired ? undefined : backupPathFor(request),
    },
    rollbackPlan: {
      available: !backupBlocked && backupRequired,
      description: backupRequired
        ? "Future write mode must copy the original file before writing so rollback can restore it."
        : "Rollback is not needed for dry-run create-file planning.",
    },
    safetyNotes: [
      "Dry-run only; no file is written.",
      "No patch is applied.",
      "No file is deleted or renamed.",
      "Backup and rollback are design plans only in this phase.",
    ],
  };
}
