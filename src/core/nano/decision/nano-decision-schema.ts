import { z } from "zod";

export const TASK_TYPES = [
  "chat", "text", "code", "analysis", "image", "vision", "agent", "mixed", "unknown",
  "game_design", "game_scene", "game_asset", "game_script", "game_error_fix", "engine_query"
] as const;
export const CONTENT_TYPES = ["text", "image", "code", "project", "mixed"] as const;
export const OUTPUT_TYPES = ["text", "image", "json", "patch", "report", "mixed"] as const;
export const DOMAINS = ["general", "education", "code", "economy"] as const;
export const MEMORY_SCOPES = ["none", "global", "project", "session"] as const;
export const RISK_LEVELS = ["low", "medium", "high"] as const;
export const CAPABILITIES = [
  "text-generation",
  "chat",
  "code-generation",
  "analysis",
  "image-generation",
  "image-understanding",
  "agent-task",
  "game-design",
  "game-scene-planning",
  "game-asset-planning",
  "game-scripting",
  "game-debugging",
  "engine-knowledge",
] as const;

export const NanoLongTermCapabilityHooksSchema = z.object({
  planningReady: z.boolean().default(true),
  toolUseReady: z.boolean().default(false),
  memoryUseReady: z.boolean().default(true),
  codeUseReady: z.boolean().default(false),
  multimodalReady: z.boolean().default(false),
  selfImproveReady: z.boolean().default(false),
  autonomousActionsEnabled: z.literal(false).default(false),
  diagnosticsOnly: z.literal(true).default(true),
});

export const NanoDecisionSchema = z.object({
  projectId: z.string().default("general"),
  mode: z.string().optional(),
  intent: z.string().default("unknown"),
  taskType: z.enum(TASK_TYPES).default("text"),
  contentType: z.enum(CONTENT_TYPES).default("text"),
  outputType: z.enum(OUTPUT_TYPES).default("text"),
  domain: z.enum(DOMAINS).default("general"),
  taskScore: z.number().min(0).max(1).default(0.5),
  riskLevel: z.enum(RISK_LEVELS).default("low"),
  needsMemory: z.boolean().default(true),
  memoryScope: z.enum(MEMORY_SCOPES).default("session"),
  needsRuntime: z.boolean().default(true),
  requiredCapabilities: z.array(z.enum(CAPABILITIES)).default(["text-generation"]),
  fallbackRecommended: z.boolean().default(false),
  confidence: z.number().min(0).max(1).default(0.5),
  decision: z.string().default("Nano decision produced via schema validation"),
  longTermCapabilityHooks: NanoLongTermCapabilityHooksSchema.default({
    planningReady: true,
    toolUseReady: false,
    memoryUseReady: true,
    codeUseReady: false,
    multimodalReady: false,
    selfImproveReady: false,
    autonomousActionsEnabled: false,
    diagnosticsOnly: true,
  }),
});

export type NanoDecisionFromSchema = z.infer<typeof NanoDecisionSchema>;

/**
 * Nano karar çıktısını Zod şeması ile doğrular ve eksik alanları varsayılan değerlerle tamamlar.
 */
export function parseNanoDecisionWithSchema(input: unknown): NanoDecisionFromSchema {
  const result = NanoDecisionSchema.safeParse(input);
  if (result.success) {
    return result.data;
  }
  
  // Şema doğrulaması başarısız olursa, güvenli bir fallback objesi dönüyoruz.
  return NanoDecisionSchema.parse({});
}

/**
 * Tamamen güvenli bir varsayılan Nano kararı oluşturur.
 */
export function createFallbackNanoDecision(overrides: Partial<NanoDecisionFromSchema> = {}): NanoDecisionFromSchema {
  return NanoDecisionSchema.parse(overrides);
}
