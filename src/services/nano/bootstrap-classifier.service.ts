import { NanoDecision, AillameProject } from "./nano-decision.types";

export class BootstrapClassifier {
  private static KEYWORDS: Record<Exclude<AillameProject, "unknown">, string[]> = {
    bademakademi: [
      "bademakademi", "ilkokul", "sınıf", "ders", "matematik", "geometri", 
      "soru", "test", "görselli soru", "z kitap", "eğitim", "kazanım"
    ],
    boss: [
      "boss", "yatırım", "piyasa", "borsa", "hisse", "kripto", "finans", 
      "analiz", "kaynak", "risk", "senaryo"
    ],
    doomsgame: [
      "doomsgame", "oyun", "game", "engine", "sahne", "script", "asset", 
      "level", "karakter", "düşman", "platform oyunu"
    ],
    generic: [] // Fallback handles this
  };

  static classify(prompt: string): NanoDecision | null {
    const lowerPrompt = prompt.toLowerCase();

    // 1. Check Bademakademi
    if (this.containsAny(lowerPrompt, this.KEYWORDS.bademakademi)) {
      return {
        project: "bademakademi",
        task: "multimodal_question_generation",
        workflow: "bademakademi.contract_smoke_test",
        modelNeeds: ["text", "image"],
        permissionMode: "read_only",
        confidence: 0.82,
        classifierLayer: "bootstrap",
        fallbackWorkflow: "generic.chat",
        reasoningSummary: "Eğitim ve soru üretimi anahtar kelimeleri tespit edildi.",
        warnings: ["Gerçek prompttan soru üretimi henüz aktif değil; mevcut workflow contract smoke testtir."],
        createdAt: new Date().toISOString()
      };
    }

    // 2. Check Boss
    if (this.containsAny(lowerPrompt, this.KEYWORDS.boss)) {
      return {
        project: "boss",
        task: "source_bounded_analysis",
        workflow: "boss.source_bounded_analysis",
        modelNeeds: ["text"],
        permissionMode: "read_only",
        confidence: 0.75,
        classifierLayer: "bootstrap",
        fallbackWorkflow: "generic.chat",
        reasoningSummary: "Finans ve analiz anahtar kelimeleri tespit edildi.",
        warnings: ["Boss source-bounded analysis MVP aktif."],
        createdAt: new Date().toISOString()
      };
    }

    // 3. Check Doomsgame
    if (this.containsAny(lowerPrompt, this.KEYWORDS.doomsgame)) {
      return {
        project: "doomsgame",
        task: "game_plan_generation",
        workflow: "doomsgame.read_only_plan",
        modelNeeds: ["text", "code"],
        permissionMode: "read_only",
        confidence: 0.75,
        classifierLayer: "bootstrap",
        fallbackWorkflow: "generic.chat",
        reasoningSummary: "Oyun geliştirme anahtar kelimeleri tespit edildi.",
        warnings: ["Doomsgame read-only planning MVP aktif."],
        createdAt: new Date().toISOString()
      };
    }

    return null;
  }

  private static containsAny(text: string, keywords: string[]): boolean {
    return keywords.some(keyword => text.includes(keyword));
  }
}
