/**
 * Message Metadata Builder for Chat History UI Labels
 *
 * Creates safe UI metadata from audit results without exposing raw content,
 * paths, or secrets.
 */

import type { ChatMessageAuditResult, ChatMessageAuditWarning } from "./message-audit-types";
import {
  ChatMessageUiMetadata,
  ManualContextMessageMetadata,
  MESSAGE_UI_METADATA_LIMITS,
  FORBIDDEN_METADATA_KEYS,
} from "./message-metadata-types";

/**
 * Create safe UI metadata from audit result.
 * Does NOT expose: raw message, raw context, paths, secrets, hidden prompts.
 */
export function createMessageUiMetadata(
  auditResult: ChatMessageAuditResult
): ChatMessageUiMetadata {
  const warnings = auditResult.warnings || [];
  const warningCodes = warnings
    .filter((w: ChatMessageAuditWarning) => !FORBIDDEN_METADATA_KEYS.includes(w.code))
    .map((w: ChatMessageAuditWarning) => w.code)
    .slice(0, MESSAGE_UI_METADATA_LIMITS.maxWarningsShown);

  return {
    hasManualWorkspaceContext: auditResult.hasManualContext,
    manualContextItemCount: auditResult.hasManualContext
      ? Math.min(
          auditResult.warnings
            .filter((w: ChatMessageAuditWarning) => w.code.includes("context"))
            .length || 0,
          MESSAGE_UI_METADATA_LIMITS.maxItemCountDisplay
        )
      : undefined,
    manualContextApproxChars: auditResult.hasManualContext
      ? Math.min(
          auditResult.approximateCharCount,
          MESSAGE_UI_METADATA_LIMITS.maxCharCountDisplay
        )
      : undefined,
    manualContextBoundaryValid: auditResult.hasManualContext
      ? auditResult.isBoundaryIntact
      : undefined,
    warningCount: warnings.length,
    warningCodes,
    detectedAt: Date.now(),
  };
}

/**
 * Create manual context metadata for safe display.
 */
export function createManualContextMetadata(
  auditResult: ChatMessageAuditResult
): ManualContextMessageMetadata | null {
  if (!auditResult.hasManualContext) {
    return null;
  }

  const warnings = auditResult.warnings
    .filter((w: ChatMessageAuditWarning) => !FORBIDDEN_METADATA_KEYS.includes(w.code))
    .slice(0, MESSAGE_UI_METADATA_LIMITS.maxWarningsShown)
    .map((w: ChatMessageAuditWarning) => ({
      code: w.code,
      severity: w.severity,
    }));

  return {
    source: "manual_workspace_context",
    itemCount: Math.min(
      auditResult.warnings.filter((w: ChatMessageAuditWarning) => w.code.includes("context")).length || 0,
      MESSAGE_UI_METADATA_LIMITS.maxItemCountDisplay
    ),
    approxChars: Math.min(
      auditResult.approximateCharCount,
      MESSAGE_UI_METADATA_LIMITS.maxCharCountDisplay
    ),
    boundaryStatus: auditResult.isBoundaryIntact
      ? "intact"
      : auditResult.isValid
        ? "unknown"
        : "compromised",
    warnings,
  };
}

/**
 * Generate safe UI label for chat history display.
 * Safe: no paths, secrets, raw content.
 */
export function generateContextMetadataLabel(
  metadata: ChatMessageUiMetadata | null
): string | null {
  if (!metadata || !metadata.hasManualWorkspaceContext) {
    return null;
  }

  const parts: string[] = [];

  if (metadata.manualContextItemCount) {
    const count = metadata.manualContextItemCount;
    parts.push(`${count} ${count === 1 ? "kaynak" : "kaynak snippet"}`);
  }

  if (!metadata.manualContextBoundaryValid) {
    parts.push("⚠️ Boundary check");
  } else {
    parts.push("✓ Doğrulandı");
  }

  if (metadata.warningCount > 0) {
    parts.push(`${metadata.warningCount} uyarı`);
  }

  return parts.length > 0 ? `[Manuel Context: ${parts.join(", ")}]` : null;
}

/**
 * Validate metadata doesn't contain forbidden keys.
 */
export function isMetadataClean(metadata: Record<string, unknown>): boolean {
  const keys = Object.keys(metadata);
  return !keys.some((key) => FORBIDDEN_METADATA_KEYS.includes(key));
}

/**
 * Safe log message for metadata operation.
 */
export function getMetadataSafeLogMessage(metadata: ChatMessageUiMetadata): string {
  return `metadata: manual_context=${metadata.hasManualWorkspaceContext}, warnings=${metadata.warningCount}`;
}
