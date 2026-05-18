export const SENSITIVE_PATTERNS = {
  // Passwords and Secrets
  SECRET: /(password|passwd|pwd|secret|token|api_key|apikey|private_key|auth_key|bearer|credential|shifre|şifre)/i,
  // API Keys and Tokens (common formats)
  API_KEY: /[a-zA-Z0-9]{32,}/, 
  // Financial
  CREDIT_CARD: /\b(?:\d[ -]*?){13,16}\b/,
  // PII
  EMAIL: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  PHONE: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
  TC_KIMLIK: /\b[1-9]\d{10}\b/,
  // System Paths (Windows and Unix)
  PATH: /([a-zA-Z]:\\[^:<>"|?*]+|\/[^:<>"|?*]+)/,
  // Sensitive Files
  SENSITIVE_FILES: /(\.env|\.git|\.ssh|secrets|logs|memory|aillame-data)/i,
};

export interface SanitizationResult {
  safeText: string;
  isSensitive: boolean;
  redactedCount: number;
}

export function sanitizeNanoMemoryText(text: string): SanitizationResult {
  let safeText = text;
  let redactedCount = 0;
  let isSensitive = false;

  // 1. Path Redaction (Highest Priority)
  if (SENSITIVE_PATTERNS.PATH.test(safeText) || SENSITIVE_PATTERNS.SENSITIVE_FILES.test(safeText)) {
    safeText = safeText.replace(SENSITIVE_PATTERNS.PATH, "[REDACTED_PATH]");
    isSensitive = true;
    redactedCount++;
  }

  // 2. Secret and PII Redaction
  for (const [key, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
    if (key === "PATH" || key === "SENSITIVE_FILES") continue;
    
    if (pattern.test(safeText)) {
      safeText = safeText.replace(pattern, `[REDACTED_${key}]`);
      isSensitive = true;
      redactedCount++;
    }
  }

  // 3. Length Limit for Blobs
  if (safeText.length > 1000) {
    safeText = safeText.substring(0, 997) + "...";
    isSensitive = true; // Large blobs are suspicious
  }

  return { safeText, isSensitive, redactedCount };
}

export function isTextSafeForMemory(text: string): boolean {
  const result = sanitizeNanoMemoryText(text);
  // Privacy-first: if it contains any redacted info, we might want to reject it from long-term memory
  return result.redactedCount === 0;
}
