/**
 * Message Audit Contract for Chat Submit Boundary
 *
 * Defines types for auditing visible user message during Chat submit.
 * Ensures manual workspace context stays within visible boundaries.
 * No hidden prompt, no RAG trigger, no memory write, no file access.
 */

export type ChatMessageAuditSeverity = "info" | "warning" | "alert";

export interface ChatMessageAuditWarning {
  severity: ChatMessageAuditSeverity;
  code:
    | "no_manual_context"
    | "manual_context_boundary_ok"
    | "manual_context_unterminated"
    | "manual_context_mismatched"
    | "manual_context_large"
    | "manual_context_path_pattern"
    | "manual_context_secret_pattern"
    | "hidden_prompt_pattern"
    | "system_prompt_pattern"
    | "injection_pattern"
    | "message_too_large";
  message: string;
  createdAt: number;
}

export interface ChatMessageAuditResult {
  isValid: boolean;
  hasManualContext: boolean;
  isBoundaryIntact: boolean;
  approximateCharCount: number;
  warnings: ChatMessageAuditWarning[];
  safeToSend: boolean;
}

export interface ChatMessageAuditInput {
  userVisibleMessage: string;
  conversationId?: string;
}

export const MESSAGE_AUDIT_LIMITS = {
  maxMessageChars: 10000,
  pathPatternMinSuspicion: 0,
  secretPatternMinSuspicion: 0,
  contextBlockMaxChars: 2000,
};

export const INJECTION_PATTERNS = [
  /system\s*:/gi,
  /system_prompt/gi,
  /hidden_instruction/gi,
  /<system>/gi,
  /ignore_previous/gi,
  /\\x00/g, // Null byte
  /\\x1a/g, // EOF character
];

export const FORBIDDEN_AUDIT_INPUT_KEYS = [
  "fullPath",
  "canonicalPath",
  "absolutePath",
  "physicalPath",
  "rawContent",
  "fileContent",
  "stdout",
  "stderr",
  "stack",
  "stackTrace",
  "pid",
  "napi",
];
