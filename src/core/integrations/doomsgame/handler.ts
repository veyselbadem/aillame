import { DoomsgameResponse } from "./response-contracts";
import { createFallbackDoomsgameResponse, parseDoomsgameResponse } from "./schemas";

export type DoomsgameIntent =
  | "game_design"
  | "game_scene"
  | "game_asset"
  | "game_script"
  | "game_error_fix"
  | "engine_query";

const DOOMSGAME_INTENTS: Set<string> = new Set([
  "game_design",
  "game_scene",
  "game_asset",
  "game_script",
  "game_error_fix",
  "engine_query",
]);

/**
 * Aillame / Nano intent değerini Doomsgame response type değerine çevirir.
 */
export function mapIntentToDoomsgameResponseType(intent: string): DoomsgameResponse["type"] {
  switch (intent) {
    case "game_design": return "game_plan";
    case "game_scene": return "scene_plan";
    case "game_asset": return "asset_plan";
    case "game_script": return "script_plan";
    case "game_error_fix": return "error_fix";
    case "engine_query": return "engine_query";
    default: return "engine_query";
  }
}

/**
 * Intent değerinin Doomsgame intentlerinden biri olup olmadığını kontrol eder.
 */
export function isDoomsgameIntent(intent: string): intent is DoomsgameIntent {
  return DOOMSGAME_INTENTS.has(intent);
}

/**
 * Model cevabı içinden JSON objesini güvenli şekilde ayıklar.
 */
export function extractJsonFromModelOutput(rawContent: string): any {
  if (!rawContent || typeof rawContent !== "string") return null;

  const trimmed = rawContent.trim();

  // 1. Direkt JSON string
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Devam et
    }
  }

  // 2. Markdown code block içindeki JSON (```json ... ``` veya ``` ... ```)
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(rawContent)) !== null) {
    try {
      const candidate = match[1].trim();
      return JSON.parse(candidate);
    } catch {
      // Bir sonraki bloğa bak
    }
  }

  // 3. Metin içinde gömülü ilk { ... } bloğu
  const firstBrace = rawContent.indexOf("{");
  const lastBrace = rawContent.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      const candidate = rawContent.substring(firstBrace, lastBrace + 1);
      return JSON.parse(candidate);
    } catch {
      // Başarısız
    }
  }

  return null;
}

/**
 * Ham model yanıtını güvenli ve doğrulanmış DoomsgameResponse formatına çevirir.
 */
export function handleDoomsgameModelResponse(params: {
  intent: string;
  rawContent: string;
  projectId: string;
  requestId?: string;
  fallbackMessage?: string;
}): DoomsgameResponse {
  const responseType = mapIntentToDoomsgameResponseType(params.intent);
  const rawJson = extractJsonFromModelOutput(params.rawContent);

  if (!rawJson) {
    return createFallbackDoomsgameResponse(responseType);
  }

  // DoomsgameResponseSchema ile doğrula
  // Not: rawJson içinde 'type' alanı eksikse mapIntentToDoomsgameResponseType sonucunu ekliyoruz
  const result = parseDoomsgameResponse({
    ...rawJson,
    type: rawJson.type || responseType,
  });

  // Güvenlik Kurallarını Uygula (Zorunlu Override)
  if (result.type === "script_plan") {
    result.requiresApproval = true;
  }
  if (result.type === "error_fix") {
    result.needsApproval = true;
  }
  
  // Safety alanındaki canAutoApply değerini zorla false yap (Tasarım kararı)
  if ("safety" in result && result.safety) {
    result.safety.canAutoApply = false;
  }

  return result;
}
