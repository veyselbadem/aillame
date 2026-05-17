export interface BossSource {
  id?: string;
  title: string;
  url?: string;
  publishedAt?: string;
  retrievedAt?: string;
  sourceType?: "news" | "filing" | "social" | "report" | "manual" | "other";
  content: string;
}

export interface BossAnalysisRequest {
  sources: BossSource[];
  analysisRequest: string;
  asset?: string;
  market?: string;
  language?: "tr" | "en";
  riskProfile?: "low" | "medium" | "high";
}

export interface BossAnalysisResult {
  summary: string;
  sentiment: "positive" | "neutral" | "negative" | "mixed" | "unknown";
  riskLevel: "low" | "medium" | "high" | "unknown";
  opportunities: string[];
  risks: string[];
  scenarios: string[];
  uncertainties: string[];
  ungroundedClaims: string[];
  sources: {
    title: string;
    url?: string;
    used: boolean;
  }[];
  decisionSupportNote: string;
}
