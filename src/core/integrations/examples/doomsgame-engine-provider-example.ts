import { AillameProviderIntegration, PROJECT_CONTRACTS } from "../contracts/provider-contract";

export const DOOMSGAME_ENGINE_INTEGRATION: AillameProviderIntegration = {
  name: "Doomsgame Engine Code Provider",
  description: "Aillame provides code planning and agentic patch proposals for Doomsgame Engine.",
  contract: PROJECT_CONTRACTS["doomsgame-engine"],
  examplePayload: {
    projectId: "doomsgame-engine",
    mode: "code",
    taskType: "code-plan",
    sourceApp: "doomsgame-engine",
    message: "Bu oyun motoru projesi için güvenli refactor planı çıkar."
  },
  safetyNotes: [
    "Code Agent planları sadece plan seviyesindedir (plan-only).",
    "Tüm değişiklikler kullanıcı onayı (approval-gated) gerektirir.",
    "Proje promptları 'DOOMSGAME ENGINE PROJESİ' ibaresiyle başlamalıdır."
  ]
};
