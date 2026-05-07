import type { AillameMode } from "@core/aillame-router/types";
import type { AillameTaskType } from "@core/contracts/aillame-request";
import type { ModelCapability } from "@core/models/registry";

export type AillameMemoryScopeKind = "none" | "global" | "project" | "session";
export type AillameResponseFormat = "text" | "json" | "openai-chat" | "diagnostic";

export type AillameProjectMode =
  | AillameMode
  | "finance"
  | "provider"
  | "game-dev"
  | "classroom";

export type AillameProjectIdentity = {
  projectId: string;
  mode?: AillameProjectMode;
  taskType?: AillameTaskType | string;
  sourceApp?: string;
  memoryScope: AillameMemoryScopeKind;
  responseFormat: AillameResponseFormat;
  sessionId?: string;
  userId?: string;
  requestId: string;
  requiredCapabilities?: ModelCapability[];
};

export type AillameProjectPreset = {
  projectId: string;
  label: string;
  defaultMode: AillameProjectMode;
  defaultMemoryScope: AillameMemoryScopeKind;
  allowedModes: AillameProjectMode[];
  description: string;
};

export type ProjectIdentityValidationResult =
  | { ok: true; identity: AillameProjectIdentity; preset: AillameProjectPreset }
  | { ok: false; code: string; message: string; details: { field: string; value?: string } };

export const AILLAME_PROJECT_PRESETS: Record<string, AillameProjectPreset> = {
  general: {
    projectId: "general",
    label: "General",
    defaultMode: "general",
    defaultMemoryScope: "session",
    allowedModes: ["general", "education", "code", "economy"],
    description: "Default shared Aillame context.",
  },
  aillame: {
    projectId: "aillame",
    label: "Aillame",
    defaultMode: "general",
    defaultMemoryScope: "project",
    allowedModes: ["general", "code"],
    description: "Independent local AI center and runtime foundation.",
  },
  "boss-ai": {
    projectId: "boss-ai",
    label: "BOSS AI",
    defaultMode: "economy",
    defaultMemoryScope: "project",
    allowedModes: ["economy", "finance", "provider"],
    description: "Finance, crypto, market signal, and portfolio project.",
  },
  "doomsgame-engine": {
    projectId: "doomsgame-engine",
    label: "Doomsgame Engine",
    defaultMode: "code",
    defaultMemoryScope: "project",
    allowedModes: ["code", "game-dev"],
    description: "AI-assisted software and game development project.",
  },
  "badem-akademi": {
    projectId: "badem-akademi",
    label: "Badem Akademi",
    defaultMode: "education",
    defaultMemoryScope: "project",
    allowedModes: ["education", "classroom"],
    description: "Education, classroom, student, parent, teacher, and admin platform.",
  },
};

const SAFE_PROJECT_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;

function makeRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeProjectId(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "general";
  return value.trim().toLocaleLowerCase("en-US").replace(/\s+/g, "-");
}

export function isValidProjectId(projectId: string): boolean {
  return SAFE_PROJECT_ID.test(projectId);
}

function normalizeMemoryScope(value: unknown, preset: AillameProjectPreset): AillameMemoryScopeKind {
  if (value === "none" || value === "global" || value === "project" || value === "session") return value;
  return preset.defaultMemoryScope;
}

function normalizeResponseFormat(value: unknown): AillameResponseFormat {
  if (value === "text" || value === "json" || value === "openai-chat" || value === "diagnostic") return value;
  return "json";
}

function normalizeRequiredCapabilities(value: unknown): ModelCapability[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const capabilities = value.filter((item): item is ModelCapability => typeof item === "string");
  return capabilities.length > 0 ? Array.from(new Set(capabilities)) : undefined;
}

export function listProjectPresets(): AillameProjectPreset[] {
  return Object.values(AILLAME_PROJECT_PRESETS);
}

export function getProjectPreset(projectId: string): AillameProjectPreset {
  return AILLAME_PROJECT_PRESETS[projectId] ?? {
    projectId,
    label: projectId,
    defaultMode: "general",
    defaultMemoryScope: "project",
    allowedModes: ["general", "code", "education", "economy"],
    description: "External project preset inferred from projectId.",
  };
}

export function normalizeCoreMode(mode: AillameProjectMode | undefined): AillameMode | undefined {
  if (mode === "general" || mode === "education" || mode === "code" || mode === "economy") return mode;
  if (mode === "finance" || mode === "provider") return "economy";
  if (mode === "game-dev") return "code";
  if (mode === "classroom") return "education";
  return undefined;
}

export function normalizeProjectIdentity(input: {
  projectId?: unknown;
  mode?: unknown;
  taskType?: unknown;
  sourceApp?: unknown;
  memoryScope?: unknown;
  responseFormat?: unknown;
  sessionId?: unknown;
  userId?: unknown;
  requestId?: unknown;
  requiredCapabilities?: unknown;
}): ProjectIdentityValidationResult {
  const projectId = normalizeProjectId(input.projectId);
  if (!isValidProjectId(projectId)) {
    return {
      ok: false,
      code: "INVALID_PROJECT_ID",
      message: "projectId must use only a-z, 0-9, dash, or underscore.",
      details: { field: "projectId", value: typeof input.projectId === "string" ? input.projectId : undefined },
    };
  }

  const preset = getProjectPreset(projectId);
  const requestedMode = typeof input.mode === "string" && input.mode.trim()
    ? input.mode.trim() as AillameProjectMode
    : undefined;
  const mode = requestedMode && preset.allowedModes.includes(requestedMode)
    ? requestedMode
    : preset.defaultMode;

  return {
    ok: true,
    preset,
    identity: {
      projectId,
      mode,
      taskType: typeof input.taskType === "string" && input.taskType.trim() ? input.taskType.trim() : undefined,
      sourceApp: typeof input.sourceApp === "string" && input.sourceApp.trim() ? input.sourceApp.trim() : undefined,
      memoryScope: normalizeMemoryScope(input.memoryScope, preset),
      responseFormat: normalizeResponseFormat(input.responseFormat),
      sessionId: typeof input.sessionId === "string" && input.sessionId.trim() ? input.sessionId.trim() : undefined,
      userId: typeof input.userId === "string" && input.userId.trim() ? input.userId.trim() : undefined,
      requestId: typeof input.requestId === "string" && input.requestId.trim() ? input.requestId.trim() : makeRequestId(),
      requiredCapabilities: normalizeRequiredCapabilities(input.requiredCapabilities),
    },
  };
}
