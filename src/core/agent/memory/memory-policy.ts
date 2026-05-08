import { LearningCard } from "./types";

export class MemoryPolicy {
  private static SENSITIVE_KEYWORDS = [
    "apiKey", "api_key", "secret", "password", "token", "auth", 
    "credential", "private_key", "passwd", "connection_string"
  ];

  static redact(text: string): string {
    let redacted = text;
    for (const keyword of this.SENSITIVE_KEYWORDS) {
      const regex = new RegExp(`\\b(${keyword})\\s*[:=]\\s*[^\\s,;]+`, "gi");
      redacted = redacted.replace(regex, (_match, key) => `${key}: [REDACTED]`);
    }
    // Mask absolute paths (heuristic)
    redacted = redacted.replace(/[a-zA-Z]:\\[^\s,;]+/g, "[LOCAL_PATH]");
    return redacted;
  }

  static validate(card: LearningCard): { valid: boolean; reason?: string } {
    if (!card.projectId || !card.taskSummary) {
      return { valid: false, reason: "Missing projectId or taskSummary" };
    }

    if (card.taskSummary.length > 500) {
      return { valid: false, reason: "Summary too long" };
    }

    // Check for obvious leaks in summary
    for (const keyword of this.SENSITIVE_KEYWORDS) {
      if (card.taskSummary.toLowerCase().includes(keyword.toLowerCase())) {
        return { valid: false, reason: `Potential sensitive keyword detected: ${keyword}` };
      }
    }

    return { valid: true };
  }
}
