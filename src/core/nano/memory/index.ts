import { NanoMemoryItem, NanoMemorySettings } from "./memory-types";
import { NanoMemoryPolicy } from "./memory-policy";

export * from "./memory-types";
export * from "./memory-policy";
export * from "./memory-sanitizer";

export class AillameNanoMemoryEngine {
  private policy: NanoMemoryPolicy;
  private sessionMemory: NanoMemoryItem[] = [];

  constructor(settings: Partial<NanoMemorySettings> = {}) {
    this.policy = new NanoMemoryPolicy(settings);
  }

  // --- SKELETON METHODS ---

  async saveItem(item: Partial<NanoMemoryItem>): Promise<{ success: boolean; id?: string }> {
    const validation = this.policy.validateItem(item);
    if (!validation.valid) return { success: false };

    // Phase 21: Real persistence is out of scope. 
    // We only simulate session memory for now.
    if (item.scope === "session") {
      const fullItem: NanoMemoryItem = {
        id: Math.random().toString(36).substring(7),
        category: item.category || "temporary_session_note",
        scope: "session",
        text: item.text!,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        source: item.source || "system_suggested",
        isSensitive: false,
        status: "active",
      };
      this.sessionMemory.push(fullItem);
      return { success: true, id: fullItem.id };
    }

    return { success: false }; // Long-term writing blocked in Phase 21
  }

  async clearSessionMemory(): Promise<void> {
    this.sessionMemory = [];
  }

  async clearProjectMemory(projectId: string): Promise<void> {
    // Skeleton: Real file delete not allowed in Phase 21
    console.log(`[Memory] Clearing project memory for: ${projectId}`);
  }

  async clearAllNanoMemory(): Promise<void> {
    this.sessionMemory = [];
    console.log("[Memory] Global Nano memory clear requested.");
  }

  async exportNanoMemorySummary(): Promise<string> {
    return JSON.stringify({
      sessionItemsCount: this.sessionMemory.length,
      policy: this.policy.getSettings(),
      notice: NanoMemoryPolicy.getPrivacyNotice(),
    });
  }

  getRecentSessionContext(): string[] {
    return this.sessionMemory
      .filter(item => item.status === "active")
      .map(item => `[${item.category}]: ${item.text}`);
  }
}
