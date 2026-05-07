import { ApiKeyPermission } from "../../security/models";

export type AillameProviderMode = "general" | "code" | "education" | "economy" | "finance" | "classroom" | "game-dev";

export interface AillameProviderProjectContract {
  projectId: string;
  sourceApp: string;
  defaultMode: AillameProviderMode;
  requiredScopes: ApiKeyPermission[];
  allowedTaskTypes: string[];
  capabilities: {
    memoryAccess: boolean;
    codeExecution?: boolean; // Plan-only in foundation
    multimodal?: boolean;
  };
}

export interface AillameProviderIntegration {
  name: string;
  description: string;
  contract: AillameProviderProjectContract;
  examplePayload: any;
  safetyNotes: string[];
}

export const PROJECT_CONTRACTS: Record<string, AillameProviderProjectContract> = {
  "boss-ai": {
    projectId: "boss-ai",
    sourceApp: "boss-ai",
    defaultMode: "economy",
    requiredScopes: ["chat:write", "project:read", "memory:read"],
    allowedTaskTypes: ["market-analysis", "recommendation-context", "portfolio-summary"],
    capabilities: { memoryAccess: true }
  },
  "doomsgame-engine": {
    projectId: "doomsgame-engine",
    sourceApp: "doomsgame-engine",
    defaultMode: "code",
    requiredScopes: ["chat:write", "project:read", "task:create"],
    allowedTaskTypes: ["project-scan", "code-plan", "patch-proposal"],
    capabilities: { memoryAccess: false, codeExecution: true }
  },
  "badem-akademi": {
    projectId: "badem-akademi",
    sourceApp: "badem-akademi",
    defaultMode: "education",
    requiredScopes: ["chat:write", "project:read", "memory:read"],
    allowedTaskTypes: ["worksheet-generation", "z-kitap-content", "classroom-announcement"],
    capabilities: { memoryAccess: true }
  }
};
