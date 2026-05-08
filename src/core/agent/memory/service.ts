import { MemoryStore } from "./memory-store";
import { LearningCardBuilder } from "./learning-card-builder";
import { ExecutionAuditResult } from "../execution-audit/types";
import { LearningCard, MemorySummary } from "./types";

export class AgentMemoryService {
  private static store = new MemoryStore();

  static async learnFromAudit(audit: ExecutionAuditResult, userTask: string, safeRootName: string): Promise<boolean> {
    const card = LearningCardBuilder.fromAudit(audit, userTask, safeRootName);
    return await this.store.saveCard(card);
  }

  static async getRecentCards(limit?: number): Promise<LearningCard[]> {
    return await this.store.getRecentCards(limit);
  }

  static async getSummary(): Promise<MemorySummary> {
    return await this.store.getSummary();
  }
}
