/**
 * Manual Context Cleanup Helper
 *
 * Safely removes visible manual context blocks from Chat draft.
 * Preserves user text outside the context block.
 * No raw content logging, no file access, no hidden prompts.
 */

import {
  ManualContextCleanupResult,
  ManualContextCleanupWarning,
  ManualContextCleanupStatus,
  MANUAL_CONTEXT_CLEANUP_LIMITS,
  FORBIDDEN_CLEANUP_KEYS,
} from "./manual-context-cleanup-types";

const MANUAL_CONTEXT_START_MARKER = "[Workspace Context - Manuel Eklenen]";
const MANUAL_CONTEXT_END_MARKER = "[/Workspace Context - Manuel Eklenen]";

/**
 * Remove visible manual context block from draft text.
 * Returns cleaned draft or original if no block found or ambiguous state detected.
 */
export function removeManualContextFromDraft(draftText: string): ManualContextCleanupResult {
  const warnings: ManualContextCleanupWarning[] = [];
  const originalLength = draftText.length;

  if (!draftText || draftText.trim().length === 0) {
    return {
      status: "no_action_needed",
      cleanedDraft: draftText,
      removedBlockCount: 0,
      originalLength,
      cleanedLength: draftText.length,
      warnings: [
        {
          severity: "info",
          code: "no_cleanup_needed",
          message: "Draft boş veya temiz.",
        },
      ],
    };
  }

  const startIdx = draftText.indexOf(MANUAL_CONTEXT_START_MARKER);
  const endIdx = draftText.indexOf(MANUAL_CONTEXT_END_MARKER);

  // No context block at all
  if (startIdx === -1) {
    return {
      status: "not_found",
      cleanedDraft: draftText,
      removedBlockCount: 0,
      originalLength,
      cleanedLength: draftText.length,
      warnings: [
        {
          severity: "info",
          code: "context_not_found",
          message: "Manual workspace context bloğu draft'ta bulunamadı.",
        },
      ],
    };
  }

  // Start marker exists but no end marker
  if (endIdx === -1) {
    warnings.push({
      severity: "warning",
      code: "unterminated_block",
      message: "Context bloğu tamamlanmamış görünüyor; lütfen metni kontrol edin.",
    });

    return {
      status: "invalid_boundary",
      cleanedDraft: draftText,
      removedBlockCount: 0,
      originalLength,
      cleanedLength: draftText.length,
      warnings,
    };
  }

  // End marker before start marker
  if (endIdx < startIdx) {
    warnings.push({
      severity: "warning",
      code: "mismatched_markers",
      message: "Context marker'ları çakışık veya hatalı konumda.",
    });

    return {
      status: "ambiguous",
      cleanedDraft: draftText,
      removedBlockCount: 0,
      originalLength,
      cleanedLength: draftText.length,
      warnings,
    };
  }

  // Calculate block boundaries including markers
  const blockStartIdx = startIdx;
  const blockEndIdx = endIdx + MANUAL_CONTEXT_END_MARKER.length;
  const blockSize = blockEndIdx - blockStartIdx;

  // Check for suspiciously large blocks
  if (blockSize > MANUAL_CONTEXT_CLEANUP_LIMITS.maxDraftChars) {
    warnings.push({
      severity: "alert",
      code: "block_too_large",
      message: `Context bloğu ${blockSize} karakter; şüpheli görünüyor.`,
    });

    return {
      status: "ambiguous",
      cleanedDraft: draftText,
      removedBlockCount: 0,
      originalLength,
      cleanedLength: draftText.length,
      warnings,
    };
  }

  // Remove the context block
  const before = draftText.substring(0, blockStartIdx);
  const after = draftText.substring(blockEndIdx);

  // Normalize whitespace: if we created extra newlines, clean them up
  let cleanedDraft = (before + after).trim();

  // Add back single space if both before and after content existed
  if (before.trim().length > 0 && after.trim().length > 0) {
    cleanedDraft = before.trimEnd() + "\n" + after.trimStart();
  }

  return {
    status: "removed",
    cleanedDraft,
    removedBlockCount: 1,
    originalLength,
    cleanedLength: cleanedDraft.length,
    warnings,
  };
}

/**
 * Validate cleanup result doesn't contain forbidden keys/values.
 */
export function isCleanupResultSafe(result: Record<string, unknown>): boolean {
  const keys = Object.keys(result);
  return !keys.some((key) => FORBIDDEN_CLEANUP_KEYS.includes(key));
}

/**
 * Safe log message for cleanup operation.
 */
export function getCleanupSafeLogMessage(result: ManualContextCleanupResult): string {
  return `cleanup: status=${result.status}, removed=${result.removedBlockCount}, original=${result.originalLength}→cleaned=${result.cleanedLength}, warnings=${result.warnings.length}`;
}

/**
 * Generate safe UI label for cleanup status.
 */
export function generateCleanupStatusLabel(result: ManualContextCleanupResult): string | null {
  switch (result.status) {
    case "removed":
      return "✓ Context removed";
    case "not_found":
      return "No context found";
    case "invalid_boundary":
      return "⚠️ Boundary issue";
    case "ambiguous":
      return "⚠️ Ambiguous state";
    case "no_action_needed":
      return null;
    default:
      return null;
  }
}
