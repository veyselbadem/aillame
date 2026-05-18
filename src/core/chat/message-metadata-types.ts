/**
 * Chat Message UI Metadata Contract for Manual Context Label
 *
 * Defines safe metadata types for displaying manual workspace context information
 * in chat history without exposing raw content, paths, or secrets.
 */

export interface ChatMessageUiMetadata {
  hasManualWorkspaceContext: boolean;
  manualContextItemCount?: number;
  manualContextApproxChars?: number;
  manualContextBoundaryValid?: boolean;
  warningCount: number;
  warningCodes: string[];
  detectedAt: number;
}

export interface ManualContextMessageMetadata {
  source: "manual_workspace_context";
  itemCount: number;
  approxChars: number;
  boundaryStatus: "intact" | "compromised" | "unknown";
  warnings: {
    code: string;
    severity: "info" | "warning" | "alert";
  }[];
}

export interface ChatMessageMetadataWarning {
  code: string;
  severity: "info" | "warning" | "alert";
}

export const MESSAGE_UI_METADATA_LIMITS = {
  maxWarningsShown: 3,
  maxItemCountDisplay: 99,
  maxCharCountDisplay: 9999,
};

export const SAFE_METADATA_KEYS = [
  "hasManualWorkspaceContext",
  "manualContextItemCount",
  "manualContextApproxChars",
  "manualContextBoundaryValid",
  "warningCount",
  "warningCodes",
  "detectedAt",
] as const;

export const FORBIDDEN_METADATA_KEYS = [
  "fullPath",
  "canonicalPath",
  "absolutePath",
  "physicalPath",
  "userHomePath",
  "rawContent",
  "rawMessage",
  "rawContextBlock",
  "fileContent",
  "stdout",
  "stderr",
  "stack",
  "stackTrace",
  "pid",
  "secret",
  "token",
  "password",
  "apiKey",
  "hiddenPrompt",
  "systemPrompt",
  "napi",
];
