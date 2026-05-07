import { AillameProviderIntegration, PROJECT_CONTRACTS } from "../contracts/provider-contract";

export const BADEM_AKADEMI_INTEGRATION: AillameProviderIntegration = {
  name: "Badem Akademi Education Provider",
  description: "Aillame provides worksheet generation and classroom assistance for Badem Akademi.",
  contract: PROJECT_CONTRACTS["badem-akademi"],
  examplePayload: {
    projectId: "badem-akademi",
    mode: "education",
    taskType: "worksheet-generation",
    sourceApp: "badem-akademi",
    message: "3. sınıf öğrencileri için kısa bir okuma-anlama etkinliği hazırla."
  },
  safetyNotes: [
    "Yaşa uygun dil kullanımı zorunludur.",
    "Öğrenci verisi gizliliği korunmalıdır.",
    "Aillame çıktıları öğretmen onayıyla kullanılmalıdır."
  ]
};
