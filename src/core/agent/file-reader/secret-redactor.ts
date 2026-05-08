export class SecretRedactor {
  private static SECRET_PATTERNS = [
    // API Keys and Tokens (including standalone 'key')
    /(?:api[_-]?key|token|auth|secret|private[_-]?key|access[_-]?key|password)["']?\s*[:=]\s*["']?([a-zA-Z0-9_\-\.]{16,})["']?/gi,
    // Connection Strings
    /(mongodb\+srv|postgres|mysql|redis):\/\/[a-zA-Z0-9_]+:[a-zA-Z0-9_]+@[a-zA-Z0-9_\-\.]+/gi,
    // Common env variables
    /(?:DATABASE_URL|GEMINI_API_KEY|OPENAI_API_KEY|AILLAME_API_KEY|JWT_SECRET|STRIPE_KEY)["']?\s*[:=]\s*["']?([^\s"']+)["']?/gi,
    // Bearer tokens
    /Bearer\s+([a-zA-Z0-9_\-\.]{20,})/gi
  ];

  redact(content: string): { content: string; redacted: boolean } {
    let newContent = content;
    let wasRedacted = false;

    for (const pattern of SecretRedactor.SECRET_PATTERNS) {
      pattern.lastIndex = 0;
      if (pattern.test(newContent)) {
        wasRedacted = true;
        pattern.lastIndex = 0;
        newContent = newContent.replace(pattern, (match, group1) => {
          // If we have a captured value group, redact it
          if (group1) {
            return match.replace(group1, "[REDACTED]");
          }
          return "[REDACTED_SECRET]";
        });
      }
    }

    return { content: newContent, redacted: wasRedacted };
  }
}
