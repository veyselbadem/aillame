import * as fs from "fs/promises";
import * as path from "path";
import { LearningCard, MemorySummary } from "./types";
import { MemoryPolicy } from "./memory-policy";

export class MemoryStore {
  private memoryDir: string;
  private cardsFile: string;

  constructor() {
    this.memoryDir = path.join(process.cwd(), ".aillame-data", "agent-memory");
    this.cardsFile = path.join(this.memoryDir, "learning-cards.jsonl");
  }

  private async ensureDir() {
    try {
      await fs.mkdir(this.memoryDir, { recursive: true });
    } catch {}
  }

  async saveCard(card: LearningCard): Promise<boolean> {
    const validation = MemoryPolicy.validate(card);
    if (!validation.valid) {
      console.warn(`[Memory] Invalid card: ${validation.reason}`);
      return false;
    }

    await this.ensureDir();
    const line = JSON.stringify(card) + "\n";
    await fs.appendFile(this.cardsFile, line, "utf-8");
    return true;
  }

  async getRecentCards(limit = 20): Promise<LearningCard[]> {
    try {
      const content = await fs.readFile(this.cardsFile, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);
      return lines
        .slice(-limit)
        .map(l => JSON.parse(l))
        .reverse();
    } catch {
      return [];
    }
  }

  async getSummary(): Promise<MemorySummary> {
    const cards = await this.getRecentCards(100);
    const summary: MemorySummary = {
      totalCards: cards.length,
      byCategory: {},
      topLessons: [],
      recentInsights: [],
      safetyWarnings: [],
      lastUpdated: Date.now()
    };

    const lessons = new Set<string>();
    const warnings = new Set<string>();

    for (const card of cards) {
      summary.byCategory[card.taskCategory] = (summary.byCategory[card.taskCategory] || 0) + 1;
      card.lessons.forEach(l => lessons.add(l));
      card.safetyNotes.forEach(w => warnings.add(w));
    }

    summary.topLessons = Array.from(lessons).slice(0, 5);
    summary.safetyWarnings = Array.from(warnings).slice(0, 5);
    summary.recentInsights = cards.slice(0, 3).map(c => `${c.taskCategory}: ${c.taskSummary}`);

    return summary;
  }
}
