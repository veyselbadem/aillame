import { WORKSPACE_AGENT_EXECUTION_GATE_POLICY } from "./gate-policy";

/**
 * Sanitizes execution gate request data by masking sensitive patterns and limiting length.
 */
export function sanitizeExecutionGateInput(text: string | undefined, maxLength: number): string {
  if (!text) return "";
  
  let sanitized = text.slice(0, maxLength);

  // Mask Windows paths
  sanitized = sanitized.replace(/[a-zA-Z]:\\[\\\w.-]+/g, "[PATH_MASKED]");
  // Mask Unix paths
  sanitized = sanitized.replace(/\/[/\w.-]+/g, (match) => {
    if (match.length > 5 && match.includes("/")) return "[PATH_MASKED]";
    return match;
  });

  // Mask secrets (key, token, password, etc.)
  const secretPatterns = [
    /(key|token|password|secret|auth|api)[-_\w]*\s*(:|=|\bis\b|\s+is\s+)\s*[^\s,;]+/gi,
    /[a-f0-9]{32,}/gi,
  ];

  for (const pattern of secretPatterns) {
    sanitized = sanitized.replace(pattern, (match) => {
      const prefixMatch = match.match(/(key|token|password|secret|auth|api)[-_\w]*\s*(:|=|\bis\b|\s+is\s+)\s*/i);
      if (prefixMatch) return prefixMatch[0] + "[SECRET_MASKED]";
      return "[SECRET_MASKED]";
    });
  }

  return sanitized;
}

/**
 * Detects unsafe intents in gate input.
 */
export function detectExecutionGateIntents(text: string | undefined): { hasCommandIntent: boolean; hasWriteIntent: boolean } {
  if (!text) return { hasCommandIntent: false, hasWriteIntent: false };

  const commandPatterns = [
    /npm\s+install/i, /npm\s+run/i, /node\s+/i, /python\s+/i, /sh\s+/i, /bash\s+/i,
    /sudo\s+/i, /rm\s+-rf/i, /curl\s+/i, /wget\s+/i
  ];
  
  const writePatterns = [
    /write\s+to/i, /save\s+to/i, /overwrite/i, /create\s+file/i, /update\s+file/i,
    /modify\s+content/i, /patch\s+/i
  ];

  return {
    hasCommandIntent: commandPatterns.some(p => p.test(text)),
    hasWriteIntent: writePatterns.some(p => p.test(text))
  };
}
