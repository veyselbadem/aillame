import type {
  AillameTextGenerateRequest,
  AillameTextGenerateResult,
  AillameTextRuntimeCapability,
  AillameTextRuntimeModelInfo,
  AillameTextRuntimeStatus,
} from "./text-runtime-types";

export type AillameTextRuntimeHealth = {
  modelId: string;
  runtimeKind: AillameTextRuntimeModelInfo["runtimeKind"];
  status: AillameTextRuntimeStatus;
  available: boolean;
  canGenerate: boolean;
  supportsStreaming: boolean;
  warnings: string[];
  diagnostics?: Record<string, unknown>;
};

export type AillameTextRuntimeGenerateContext = {
  requiredCapabilities?: AillameTextRuntimeCapability[];
  reason?: string;
};

export interface AillameTextRuntime {
  readonly model: AillameTextRuntimeModelInfo;
  canHandle(request: AillameTextGenerateRequest, capabilities?: readonly AillameTextRuntimeCapability[]): boolean;
  getHealth(): AillameTextRuntimeHealth;
  generate(
    request: AillameTextGenerateRequest,
    context?: AillameTextRuntimeGenerateContext
  ): Promise<AillameTextGenerateResult>;
}
