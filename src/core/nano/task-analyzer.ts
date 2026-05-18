import type { NanoDifficulty, NanoLanguage, NanoRiskLevel, NanoTaskAnalysis, NanoTaskKind } from "./types";

const TASK_KEYWORDS: Record<NanoTaskKind, readonly string[]> = {
  conversation: ["sohbet", "konuş", "selam", "nasılsın"],
  analysis: ["analiz", "karşılaştır", "neden", "sonuç", "çıkarım", "değerlendir"],
  planning: ["plan", "yol haritası", "adım", "strateji", "takvim", "öncelik"],
  coding: ["kod", "bug", "hata", "typescript", "javascript", "python", "api", "refactor", "test"],
  math: ["hesapla", "denklem", "olasılık", "istatistik", "matematik", "oran", "formül"],
  research: ["araştır", "kaynak", "literatür", "özetle", "bilgi", "rapor", "seo", "içerik", "yazı", "makale"],
  education: ["öğret", "ders", "öğrenci", "sınav", "quiz", "konu anlatımı", "ödev", "açıkla", "nedir"],
  creative: ["hikaye", "metin yaz", "şiir", "senaryo", "tasarım", "yaratıcı", "reklam", "blog"],
  image: ["görsel", "resim", "fotoğraf", "çiz", "poster", "afiş", "thumbnail"],
  game_design: ["oyun tasarımı", "mekanik", "level design"],
  game_scene: ["sahne", "environment", "level", "map"],
  game_asset: ["asset", "model", "sprite", "dokulama"],
  game_script: ["script", "oyun mantığı", "gameplay logic"],
  game_error_fix: ["bug fix", "oyun hatası", "crash"],
  engine_query: ["motor", "unity", "unreal", "godot", "nasıl yapılır", "hukuk", "dava", "psikoloji", "terapi"],
  unknown: [],
};

const HIGH_RISK_KEYWORDS = [
  "sağlık",
  "ilaç",
  "hukuk",
  "dava",
  "yatırım tavsiyesi",
  "borsa",
  "kripto",
  "güvenlik açığı",
  "şifre",
];

const CURRENT_INFO_KEYWORDS = [
  "bugün",
  "son",
  "güncel",
  "en yeni",
  "fiyat",
  "haber",
  "kim kazandı",
  "2026",
];

const COMPLEXITY_KEYWORDS = [
  "karmaşık",
  "detaylı",
  "uzun",
  "mimari",
  "tasarla",
  "optimize",
  "kanıtla",
  "nedenlerini",
  "adım adım",
];

function normalize(text: string): string {
  return text.trim().toLocaleLowerCase("tr-TR");
}

function detectLanguage(text: string): NanoLanguage {
  const lower = normalize(text);
  const turkishHits = ["ğ", "ü", "ş", "ı", "ö", "ç", "bir", "ve", "için"].filter((item) => lower.includes(item)).length;
  const englishHits = ["the", "and", "for", "with", "how", "why"].filter((item) => lower.includes(item)).length;
  if (turkishHits > 0 && englishHits > 0) return "mixed";
  if (englishHits > turkishHits) return "en";
  return "tr";
}

function scoreKind(text: string, kind: NanoTaskKind): number {
  return TASK_KEYWORDS[kind].reduce((score, keyword) => score + (text.includes(keyword) ? 1 : 0), 0);
}

function selectKind(text: string): { kind: NanoTaskKind; keywords: string[] } {
  let bestKind: NanoTaskKind = "unknown";
  let bestScore = 0;
  for (const kind of Object.keys(TASK_KEYWORDS) as NanoTaskKind[]) {
    const score = scoreKind(text, kind);
    if (score > bestScore) {
      bestKind = kind;
      bestScore = score;
    }
  }

  const keywords = bestKind === "unknown"
    ? []
    : TASK_KEYWORDS[bestKind].filter((keyword) => text.includes(keyword));

  return {
    kind: bestKind === "unknown" && text.length > 0 ? "conversation" : bestKind,
    keywords,
  };
}

function getDifficulty(text: string): NanoDifficulty {
  const lengthScore = text.length > 900 ? 2 : text.length > 260 ? 1 : 0;
  const complexityScore = COMPLEXITY_KEYWORDS.filter((keyword) => text.includes(keyword)).length;
  const total = lengthScore + complexityScore;
  if (total >= 4) return "high";
  if (total >= 2) return "medium";
  return "low";
}

function getRiskLevel(text: string): NanoRiskLevel {
  const hits = HIGH_RISK_KEYWORDS.filter((keyword) => text.includes(keyword)).length;
  if (hits >= 2) return "high";
  if (hits === 1) return "medium";
  return "low";
}

export function analyzeNanoTask(prompt: string): NanoTaskAnalysis {
  const text = normalize(prompt);
  const { kind, keywords } = selectKind(text);
  const difficulty = getDifficulty(text);
  const riskLevel = getRiskLevel(text);
  const needsCurrentInformation = CURRENT_INFO_KEYWORDS.some((keyword) => text.includes(keyword));

  return {
    kind,
    difficulty,
    language: detectLanguage(prompt),
    riskLevel,
    needsClarification: prompt.trim().length < 3 || text === "yardım",
    needsCurrentInformation,
    requiresStepByStepReasoning: difficulty !== "low" || kind === "math" || kind === "coding" || kind === "analysis",
    keywords,
  };
}
