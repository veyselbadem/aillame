import { AillameProviderIntegration, PROJECT_CONTRACTS } from "../contracts/provider-contract";

export const BOSS_AI_INTEGRATION: AillameProviderIntegration = {
  name: "BOSS AI Economy Provider",
  description: "Aillame provides economic analysis and portfolio context for BOSS AI.",
  contract: PROJECT_CONTRACTS["boss-ai"],
  examplePayload: {
    projectId: "boss-ai",
    mode: "economy",
    taskType: "market-analysis",
    sourceApp: "boss-ai",
    message: "Bugünkü piyasa sinyallerini risk ve haber bağlamıyla analiz et."
  },
  safetyNotes: [
    "Aillame yatırım tavsiyesi vermez.",
    "Çıktılar karar destek ve analiz bağlamındadır.",
    "BOSS AI kendi risk/fallback kurallarını korur."
  ]
};
