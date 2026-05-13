/**
 * Message Audit Helper for Chat Submit Boundary
 *
 * Audits visible user message to ensure manual context boundaries are intact
 * and no hidden prompt injection patterns exist.
 *
 * Does NOT:
 * - Trigger RAG/search/retrieval
 * - Modify message content
 * - Write to memory/disk/storage
 * - Read files
 * - Call Nano/model
 * - Auto-reject submission (warnings only)
 */

import {
  ChatMessageAuditInput,
  ChatMessageAuditResult,
  ChatMessageAuditWarning,
  ChatMessageAuditSeverity,
  MESSAGE_AUDIT_LIMITS,
  INJECTION_PATTERNS,
} from "./message-audit-types";
import {
  MANUAL_CONTEXT_START_MARKER,
  MANUAL_CONTEXT_END_MARKER,
} from "../indexing/manual-context-boundary";

function makeWarning(
  severity: ChatMessageAuditSeverity,
  code: ChatMessageAuditWarning["code"],
  message: string
): ChatMessageAuditWarning {
  return {
    severity,
    code,
    message,
    createdAt: Date.now(),
  };
}

const PATH_LIKE_PATTERN = /(\/home\/|\/Users\/|[a-zA-Z]:\\|\\\\|\/mnt\/|\.aillame-data|\$\{)/gi;
const SECRET_LIKE_PATTERN = /(password|secret|token|bearer|api[_-]?key|apikey|private[_-]?key|private_key|authentication|credential|auth[_-]?token|authtoken)/gi;

function countContextItems(blockText: string): number {
  const matches = blockText.match(/\n\d+\.\s+[^\n]+/g);
  return matches ? matches.length : 0;
}

function extractContextBlock(
  message: string
): {
  hasBlock: boolean;
  startIdx: number;
  endIdx: number;
  blockText: string;
} {
  const startIdx = message.indexOf(MANUAL_CONTEXT_START_MARKER);
  const endIdx = message.indexOf(MANUAL_CONTEXT_END_MARKER);

  if (startIdx === -1) {
    return { hasBlock: false, startIdx: -1, endIdx: -1, blockText: "" };
  }

  if (endIdx === -1) {
    const blockText = message.substring(startIdx);
    return { hasBlock: true, startIdx, endIdx: -1, blockText };
  }

  const endMarkerEnd = endIdx + MANUAL_CONTEXT_END_MARKER.length;
  const blockText = message.substring(startIdx, endMarkerEnd);
  return { hasBlock: true, startIdx, endIdx, blockText };
}

export function auditChatMessage(input: ChatMessageAuditInput): ChatMessageAuditResult {
  const warnings: ChatMessageAuditWarning[] = [];
  const userMsg = input.userVisibleMessage || "";

  // Check message size
  const charCount = userMsg.length;
  if (charCount > MESSAGE_AUDIT_LIMITS.maxMessageChars) {
    warnings.push(
      makeWarning(
        "warning",
        "message_too_large",
        `Mesaj çok büyük (${charCount} karakter). Gönderim sırasında kesintiye uğrayabilir.`
      )
    );
  }

  // Extract and analyze context boundary
  const contextBlock = extractContextBlock(userMsg);

  if (!contextBlock.hasBlock) {
    warnings.push(
      makeWarning("info", "no_manual_context", "Bu mesajda manuel workspace context yok.")
    );
    return {
      isValid: true,
      hasManualContext: false,
      isBoundaryIntact: true,
      approximateCharCount: charCount,
      warnings,
      safeToSend: true,
    };
  }

  // Context block exists - validate boundary
  if (contextBlock.endIdx === -1) {
    warnings.push(
      makeWarning(
        "warning",
        "manual_context_unterminated",
        "Manual context bloğu tamamlanmamış. Bitiş marker'ı eksik olabilir."
      )
    );
    return {
      isValid: false,
      hasManualContext: true,
      isBoundaryIntact: false,
      approximateCharCount: charCount,
      warnings,
      safeToSend: false,
    };
  }

  if (contextBlock.endIdx < contextBlock.startIdx) {
    warnings.push(
      makeWarning(
        "warning",
        "manual_context_mismatched",
        "Manual context marker'ları uyumsuz. Bloğun yapısı bozuk olabilir."
      )
    );
    return {
      isValid: false,
      hasManualContext: true,
      isBoundaryIntact: false,
      approximateCharCount: charCount,
      warnings,
      safeToSend: false,
    };
  }

  const itemCount = countContextItems(contextBlock.blockText);
  const blockCharCount = contextBlock.blockText.length;

  if (blockCharCount > MESSAGE_AUDIT_LIMITS.contextBlockMaxChars) {
    warnings.push(
      makeWarning(
        "warning",
        "manual_context_large",
        `Manual context bloğu çok büyük (${blockCharCount} karakter). Mesaj çok uzun olabilir.`
      )
    );
  }

  // Safe pattern detection for user awareness
  if (PATH_LIKE_PATTERN.test(contextBlock.blockText)) {
    warnings.push(
      makeWarning(
        "warning",
        "manual_context_path_pattern",
        "Blok içinde yol benzeri içerik tespit edildi. Lütfen kişisel yolları manuel kontrol et."
      )
    );
  }

  if (SECRET_LIKE_PATTERN.test(contextBlock.blockText)) {
    warnings.push(
      makeWarning(
        "warning",
        "manual_context_secret_pattern",
        "Blok içinde gizli anahtar benzeri içerik tespit edildi. Lütfen sensitif bilgileri kontrol et."
      )
    );
  }

  // Success case: boundary intact
  warnings.push(
    makeWarning(
      "info",
      "manual_context_boundary_ok",
      `Manuel context bloğu güvenli: ${itemCount} oge, ~${blockCharCount} karakter.`
    )
  );

  return {
    isValid: true,
    hasManualContext: true,
    isBoundaryIntact: true,
    approximateCharCount: charCount,
    warnings,
    safeToSend: true,
  };
}

export function checkInjectionPatterns(message: string): ChatMessageAuditWarning[] {
  const warnings: ChatMessageAuditWarning[] = [];

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      warnings.push(
        makeWarning(
          "alert",
          "injection_pattern",
          "Mesajda sistem/hidden prompt enjeksiyonuna benzer yapı tespit edildi."
        )
      );
      break; // Report once
    }
  }

  return warnings;
}

export function getAuditSafeLogMessage(result: ChatMessageAuditResult): string {
  if (!result.hasManualContext) {
    return "Message audit: no manual context";
  }

  return `Message audit: manual context present, boundary ${result.isBoundaryIntact ? "intact" : "compromised"}, warnings=${result.warnings.length}`;
}
