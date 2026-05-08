import { TaskIntent } from "./types";

export class TaskIntentDetector {
  detect(userTask: string): TaskIntent {
    const lowerTask = userTask.toLowerCase();
    
    const categories: Record<TaskIntent["category"], string[]> = {
      bugfix: ["hata", "bug", "error", "fail", "crash", "çalışmıyor", "düzelt", "fix", "issue"],
      feature: ["ekle", "oluştur", "yeni", "özellik", "entegrasyon", "sistem kur", "add", "create", "feature"],
      refactor: ["refactor", "sadeleştir", "temizle", "yeniden düzenle", "cleanup", "simplify", "organize"],
      test: ["test", "smoke", "doğrula", "validate", "typecheck", "build", "check"],
      docs: ["doküman", "readme", "açıklama", "kullanım kılavuzu", "docs", "documentation"],
      ui: ["arayüz", "tasarım", "buton", "sayfa", "panel", "görünüm", "ui", "ux", "layout", "style"],
      runtime: ["runtime", "llm", "igm", "model", "server", "worker", "acceptance"],
      security: ["güvenlik", "secret", "api key", "auth", "token", "yetki", "security", "permission"],
      unknown: []
    };

    let bestCategory: TaskIntent["category"] = "unknown";
    let maxMatches = 0;
    const foundKeywords: string[] = [];

    for (const [category, keywords] of Object.entries(categories)) {
      const matches = keywords.filter(kw => lowerTask.includes(kw));
      if (matches.length > 0) {
        foundKeywords.push(...matches);
        if (matches.length > maxMatches) {
          maxMatches = matches.length;
          bestCategory = category as TaskIntent["category"];
        }
      }
    }

    // Heuristic confidence
    const confidence = Math.min(0.5 + (maxMatches * 0.1), 0.95);
    
    return {
      category: bestCategory,
      confidence,
      keywords: Array.from(new Set(foundKeywords)),
      likelyAreas: this.predictLikelyAreas(bestCategory, lowerTask),
      riskLevel: this.estimateRisk(bestCategory, lowerTask)
    };
  }

  private predictLikelyAreas(category: string, task: string): string[] {
    const areas = [];
    if (category === "ui") areas.push("src/components", "src/app");
    if (category === "runtime") areas.push("src/core/runtime", "src/core/models");
    if (category === "security") areas.push("src/core/security", ".env");
    if (category === "bugfix") areas.push("src/core", "src/app/api");
    if (task.includes("api")) areas.push("src/app/api", "src/core/provider-api");
    return Array.from(new Set(areas));
  }

  private estimateRisk(category: string, task: string): TaskIntent["riskLevel"] {
    if (category === "security" || category === "runtime") return "high";
    if (category === "bugfix" || category === "feature") return "medium";
    return "low";
  }
}
