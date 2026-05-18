import { NanoMemoryItem, NanoMemorySettings, DEFAULT_NANO_MEMORY_SETTINGS } from "./memory-types";
import { sanitizeNanoMemoryText } from "./memory-sanitizer";

export class NanoMemoryPolicy {
  private settings: NanoMemorySettings;

  constructor(settings: Partial<NanoMemorySettings> = {}) {
    this.settings = { ...DEFAULT_NANO_MEMORY_SETTINGS, ...settings };
  }

  getSettings(): NanoMemorySettings {
    return { ...this.settings };
  }

  canWrite(scope: "session" | "project" | "user"): boolean {
    if (!this.settings.memoryEnabled) return false;
    
    switch (scope) {
      case "session": return this.settings.sessionMemoryEnabled;
      case "project": return this.settings.projectMemoryEnabled;
      case "user": return this.settings.longTermMemoryEnabled;
      default: return false;
    }
  }

  validateItem(item: Partial<NanoMemoryItem>): { valid: boolean; reason?: string } {
    if (!item.text || item.text.trim().length === 0) {
      return { valid: false, reason: "EMPTY_TEXT" };
    }

    const sanitization = sanitizeNanoMemoryText(item.text);
    if (sanitization.isSensitive && this.settings.longTermMemoryEnabled) {
      // Long term memory should never contain sensitive data
      return { valid: false, reason: "CONTAINS_SENSITIVE_DATA" };
    }

    return { valid: true };
  }

  static getPrivacyNotice(): string {
    return "Aillame Nano, gizlilik odaklı bir hafıza politikası izler. Şifreler, dosya yolları ve özel veriler otomatik olarak hafızadan elenir. Kalıcı hafıza sadece sizin onayınızla aktifleşir.";
  }
}
