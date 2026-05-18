import { BossAnalysisRequest, BossAnalysisResult } from "./boss.types";

export class BossSourceBoundedAnalyzer {
  private static NEGATIVE_KEYWORDS = ["düştü", "kayıp", "zarar", "risk", "belirsiz", "kriz", "tehlike", "olumsuz", "maliyet artışı", "enflasyon", "faiz artışı"];
  private static POSITIVE_KEYWORDS = ["arttı", "kâr", "fırsat", "büyüme", "olumlu", "kazanç", "başarı", "gelir artışı", "iyileşme", "güçlü", "stabil"];

  static analyze(request: BossAnalysisRequest): BossAnalysisResult {
    const allContent = request.sources.map(s => s.content.toLowerCase()).join(" ");
    
    // Heuristic sentiment analysis
    let posCount = 0;
    let negCount = 0;
    
    this.POSITIVE_KEYWORDS.forEach(kw => {
      if (allContent.includes(kw)) posCount++;
    });
    this.NEGATIVE_KEYWORDS.forEach(kw => {
      if (allContent.includes(kw)) negCount++;
    });

    let sentiment: BossAnalysisResult["sentiment"] = "neutral";
    if (posCount > negCount + 2) sentiment = "positive";
    else if (negCount > posCount + 2) sentiment = "negative";
    else if (posCount > 0 && negCount > 0) sentiment = "mixed";

    // Heuristic risk level
    let riskLevel: BossAnalysisResult["riskLevel"] = "medium";
    if (negCount === 0) riskLevel = "low";
    else if (negCount > 5) riskLevel = "high";

    // Extract opportunities and risks based on keywords
    const opportunities: string[] = [];
    const risks: string[] = [];
    
    request.sources.forEach(source => {
      const content = source.content.toLowerCase();
      this.POSITIVE_KEYWORDS.forEach(kw => {
        if (content.includes(kw) && opportunities.length < 5) {
          const sentence = this.extractSentenceWithKeyword(source.content, kw);
          if (sentence && !opportunities.includes(sentence)) opportunities.push(sentence);
        }
      });
      this.NEGATIVE_KEYWORDS.forEach(kw => {
        if (content.includes(kw) && risks.length < 5) {
          const sentence = this.extractSentenceWithKeyword(source.content, kw);
          if (sentence && !risks.includes(sentence)) risks.push(sentence);
        }
      });
    });

    const summary = `Verilen ${request.sources.length} kaynağa dayalı analiz: ` + 
      (sentiment === "positive" ? "Görünüm genel olarak olumlu." : 
       sentiment === "negative" ? "Görünüm genel olarak olumsuz ve riskli." : 
       "Görünüm karışık veya belirsiz.");

    return {
      summary,
      sentiment,
      riskLevel,
      opportunities: opportunities.length > 0 ? opportunities : ["Belirgin bir fırsat tespit edilemedi."],
      risks: risks.length > 0 ? risks : ["Belirgin bir risk tespit edilemedi."],
      scenarios: [
        "Olumlu verilerin devam etmesi durumunda büyüme beklenebilir.",
        "Tespit edilen risklerin derinleşmesi durumunda baskı oluşabilir."
      ],
      uncertainties: [
        "Verilen kaynaklar sınırlı kapsamda bilgi içermektedir.",
        "Dış piyasa koşulları ve makroekonomik veriler analize dahil edilmemiştir."
      ],
      ungroundedClaims: [],
      sources: request.sources.map(s => ({ title: s.title, url: s.url, used: true })),
      decisionSupportNote: "Bu çıktı yatırım tavsiyesi değildir. Yalnızca verilen kaynaklara dayalı karar destek analizidir."
    };
  }

  private static extractSentenceWithKeyword(text: string, keyword: string): string | null {
    const regex = new RegExp(`[^.!?]*${keyword}[^.!?]*[.!?]`, 'i');
    const match = text.match(regex);
    if (match) {
      return match[0].trim();
    }
    return null;
  }
}
