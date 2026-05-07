import type { AillameTextWorkerConfig } from "./text-worker-types";

export const DEFAULT_AILLAME_MANAGED_TEXT_WORKER_ID = "aillame-managed-text-worker-placeholder";

export const DEFAULT_AILLAME_TEXT_WORKER_CONFIG: AillameTextWorkerConfig = {
  id: DEFAULT_AILLAME_MANAGED_TEXT_WORKER_ID,
  label: "Aillame Managed Text Worker Placeholder",
  enabled: false,
  kind: "placeholder",
  modelId: DEFAULT_AILLAME_MANAGED_TEXT_WORKER_ID,
  modelFormat: "unknown",
  supportsStreaming: true,
  capabilities: [
    "chat",
    "completion",
    "text-generation",
    "code-generation",
    "analysis",
    "summarization",
    "streaming",
  ],
  notes: [
    "Aillame-managed text worker skeleton is present.",
    "No model loading or worker process startup is enabled in this phase.",
  ],
};

function readBooleanEnv(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  return value === "1" || value.toLocaleLowerCase("en-US") === "true";
}

function readNumberEnv(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function getAillameTextWorkerConfig(): AillameTextWorkerConfig {
  return {
    ...DEFAULT_AILLAME_TEXT_WORKER_CONFIG,
    enabled: readBooleanEnv(process.env.AILLAME_TEXT_WORKER_ENABLED, DEFAULT_AILLAME_TEXT_WORKER_CONFIG.enabled),
    kind: (process.env.AILLAME_TEXT_WORKER_KIND as AillameTextWorkerConfig["kind"] | undefined)
      ?? DEFAULT_AILLAME_TEXT_WORKER_CONFIG.kind,
    modelPath: process.env.AILLAME_TEXT_WORKER_MODEL_PATH,
    command: process.env.AILLAME_TEXT_WORKER_COMMAND,
    workingDirectory: process.env.AILLAME_TEXT_WORKER_CWD,
    port: readNumberEnv(process.env.AILLAME_TEXT_WORKER_PORT),
    healthUrl: process.env.AILLAME_TEXT_WORKER_HEALTH_URL,
  };
}
