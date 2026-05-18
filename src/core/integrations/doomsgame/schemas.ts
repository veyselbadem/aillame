import { z } from "zod";
import type {
  DoomsgameResponse,
  GamePlanResponse,
  ScenePlanResponse,
  AssetPlanResponse,
  ScriptPlanResponse,
  ErrorFixResponse,
  EngineQueryResponse,
} from "./response-contracts";

const Vector3Schema = z.object({
  x: z.number().default(0),
  y: z.number().default(0),
  z: z.number().default(0),
});

const SafetySchema = z.object({
  canAutoApply: z.boolean().default(false),
  reasoning: z.string().default("Standard safety assessment required."),
});

export const GamePlanResponseSchema = z.object({
  type: z.literal("game_plan"),
  title: z.string().default("Untitled Game Plan"),
  genre: z.string().default("Universal"),
  mechanics: z.array(z.string()).default([]),
  scenes: z.array(z.object({
    name: z.string(),
    description: z.string(),
    importance: z.enum(["primary", "secondary", "bonus"]).default("primary"),
  })).default([]),
  characters: z.array(z.object({
    name: z.string(),
    role: z.string(),
    traits: z.array(z.string()),
  })).default([]),
  goals: z.array(z.string()).default([]),
  rules: z.array(z.string()).default([]),
  safety: SafetySchema.default({ canAutoApply: false, reasoning: "Standard safety assessment required." }),
});

export const ScenePlanResponseSchema = z.object({
  type: z.literal("scene_plan"),
  sceneName: z.string().default("New Scene"),
  environment: z.string().default("Default Environment"),
  objects: z.array(z.object({
    id: z.string(),
    type: z.string(),
    position: Vector3Schema,
    scale: Vector3Schema,
  })).default([]),
  spawnPoints: z.array(z.object({
    id: z.string(),
    tag: z.string(),
    position: Vector3Schema,
  })).default([]),
  camera: z.object({
    type: z.string().default("Perspective"),
    fov: z.number().default(60),
    initialPosition: Vector3Schema,
  }).default({ type: "Perspective", fov: 60, initialPosition: { x: 0, y: 5, z: -10 } }),
  physics: z.object({
    gravity: z.number().default(-9.81),
    enabled: z.boolean().default(true),
  }).default({ gravity: -9.81, enabled: true }),
  safety: SafetySchema.default({ canAutoApply: false, reasoning: "Standard safety assessment required." }),
});

export const AssetPlanResponseSchema = z.object({
  type: z.literal("asset_plan"),
  assetType: z.enum(["sprite", "model", "audio", "texture"]).default("sprite"),
  prompt: z.string().default("A game asset"),
  style: z.string().default("Clean 2D"),
  dimensions: z.object({
    width: z.number().default(512),
    height: z.number().default(512),
    depth: z.number().optional(),
  }).default({ width: 512, height: 512 }),
  usage: z.string().default("General prop"),
  alternatives: z.array(z.string()).default([]),
  safety: SafetySchema.default({ canAutoApply: false, reasoning: "Standard safety assessment required." }),
});

export const ScriptPlanResponseSchema = z.object({
  type: z.literal("script_plan"),
  filename: z.string().default("NewScript.js"),
  targetObject: z.string().default("Global"),
  behavior: z.string().default("New behavior implementation"),
  codeSnippet: z.string().default("// Placeholder script\n"),
  safetyNotes: z.array(z.string()).default([]),
  requiresApproval: z.boolean().default(true),
});

export const ErrorFixResponseSchema = z.object({
  type: z.literal("error_fix"),
  errorSummary: z.string().default("Unspecified error"),
  probableCause: z.string().default("Unknown"),
  steps: z.array(z.string()).default([]),
  proposedPatch: z.object({
    targetFiles: z.array(z.string()).default([]),
    description: z.string().default("Fix attempt"),
    diff: z.string().optional(),
  }).default({ targetFiles: [], description: "Fix attempt" }),
  needsApproval: z.boolean().default(true),
});

export const EngineQueryResponseSchema = z.object({
  type: z.literal("engine_query"),
  explanation: z.string().default("Engine information query result"),
  relatedModule: z.string().default("Core"),
  usageExample: z.string().default("N/A"),
  precautions: z.array(z.string()).default([]),
});

export const DoomsgameResponseSchema = z.discriminatedUnion("type", [
  GamePlanResponseSchema,
  ScenePlanResponseSchema,
  AssetPlanResponseSchema,
  ScriptPlanResponseSchema,
  ErrorFixResponseSchema,
  EngineQueryResponseSchema,
]);

export function parseDoomsgameResponse(input: unknown): DoomsgameResponse {
  const result = DoomsgameResponseSchema.safeParse(input);
  if (result.success) {
    return result.data;
  }
  return createFallbackDoomsgameResponse();
}

export function createFallbackDoomsgameResponse(type: DoomsgameResponse["type"] = "engine_query"): DoomsgameResponse {
  const fallbackMap: Record<string, any> = {
    game_plan: { type: "game_plan" },
    scene_plan: { type: "scene_plan" },
    asset_plan: { type: "asset_plan" },
    script_plan: { type: "script_plan" },
    error_fix: { type: "error_fix" },
    engine_query: { type: "engine_query" },
  };
  
  return DoomsgameResponseSchema.parse(fallbackMap[type]);
}
