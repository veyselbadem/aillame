/**
 * Manual Context Warning Message Helper
 *
 * Normalize warning messages for consistent UX.
 * No path leaks, no raw content, safe copy.
 */

import type { ChatMessageAuditWarning } from "./message-audit-types";
import type { ManualContextBoundaryWarning } from "../indexing/manual-context-boundary";
import type { ManualContextCleanupWarning } from "./manual-context-cleanup-types";

export type ManualContextWarning =
  | ChatMessageAuditWarning
  | ManualContextBoundaryWarning
  | ManualContextCleanupWarning;

/**
 * Get safe, user-friendly warning message.
 * Never exposes paths, secrets, raw content.
 */
export function getSafeWarningCopy(warning: ManualContextWarning): string {
  // Handle boundary warnings
  if ("type" in warning) {
    const boundaryWarning = warning as ManualContextBoundaryWarning;
    switch (boundaryWarning.type) {
      case "unterminated_block":
        return "Context bloğu tamamlanmamış. Metni kontrol et.";
      case "marker_mismatch":
        return "Context marker'ları çakışık. Metni düzenle.";
      case "size_large":
        return "Context bloğu çok büyük. Boyutu azalt.";
      case "path_pattern":
        return "Context'te Path pattern tespit edildi.";
      case "secret_pattern":
        return "Context'te hassas bilgi pattern'i tespit edildi.";
      default:
        return "Context uyarısı var. Metni kontrol et.";
    }
  }

  // Handle cleanup warnings
  if (warning.code && warning.code.includes("cleanup")) {
    return "Context temizlenirken uyarı. Metni kontrol et.";
  }

  // Handle audit warnings (use existing message or generic)
  if ("code" in warning && "severity" in warning) {
    const auditWarning = warning as ChatMessageAuditWarning;
    if (auditWarning.code.includes("injection_pattern")) {
      return "Sistem prompt pattern tespit edildi.";
    }
    if (auditWarning.code.includes("unterminated")) {
      return "Context bloğu tamamlanmamış.";
    }
    if (auditWarning.code.includes("path")) {
      return "Path pattern tespit edildi.";
    }
    if (auditWarning.code.includes("secret")) {
      return "Hassas bilgi pattern tespit edildi.";
    }
  }

  return "Uyarı var. Lütfen metni kontrol et.";
}

/**
 * Get safe warning icon emoji.
 */
export function getWarningIcon(warning: ManualContextWarning): string {
  if ("severity" in warning) {
    const auditWarning = warning as ChatMessageAuditWarning;
    switch (auditWarning.severity) {
      case "alert":
        return "🔴";
      case "warning":
        return "🟡";
      case "info":
        return "🔵";
      default:
        return "ℹ️";
    }
  }

  return "⚠️";
}

/**
 * Should this warning be shown to user?
 */
export function shouldShowWarning(warning: ManualContextWarning): boolean {
  // Don't show info-level audit warnings
  if ("severity" in warning && warning.severity === "info") {
    return false;
  }

  return true;
}
