import { getNanoCheckpointStatus, getNativeModuleStatus, probeAillameTextRuntime } from "../../engine/rust-core";
import type { AillameTextRuntime, AillameTextRuntimeHealth } from "./text-runtime-interface";
import type { AillameTextRuntimeModelInfo, AillameTextRuntimeStatus } from "./text-runtime-types";

export type AillameTextRuntimeHealthSummary = {
  success: boolean;
  total: number;
  available: number;
  degraded: number;
  disabled: number;
  unavailable: number;
  runtimes: Array<{
    id: string;
    label: string;
    kind: string;
    status: string;
    canGenerate: boolean;
    supportsStreaming: boolean;
    capabilities: string[];
    reason?: string;
    warnings?: string[];
  }>;
};

function statusFromProbe(success: boolean, nativeLoaded: boolean, checkpointExists: boolean): AillameTextRuntimeStatus {
  if (!nativeLoaded) return "unavailable";
  if (!checkpointExists) return "unavailable";
  return success ? "available" : "degraded";
}

export function getNanoRustTextRuntimeHealth(model: AillameTextRuntimeModelInfo): AillameTextRuntimeHealth {
  const native = getNativeModuleStatus();
  const checkpoint = getNanoCheckpointStatus();
  const probe = probeAillameTextRuntime();
  const status = statusFromProbe(probe.success, native.nativeModuleLoaded, checkpoint.checkpointPathExists);
  const warnings = [
    ...(!native.nativeModuleLoaded ? ["Native Aillame text runtime module is not loaded."] : []),
    ...(!checkpoint.checkpointPathExists ? ["Aillame Nano checkpoint path does not exist."] : []),
    ...(!probe.success && probe.reason ? [probe.reason] : []),
  ];

  return {
    modelId: model.id,
    runtimeKind: model.runtimeKind,
    status,
    available: status === "available" || status === "degraded",
    canGenerate: probe.success,
    supportsStreaming: model.supportsStreaming,
    warnings,
    diagnostics: {
      nativeModuleLoaded: native.nativeModuleLoaded,
      nativeModulePath: native.nativeModulePath,
      checkpointConfigured: checkpoint.checkpointConfigured,
      checkpointPath: checkpoint.checkpointPath,
      checkpointPathExists: checkpoint.checkpointPathExists,
      generatedTokenCount: probe.generatedTokenCount,
      decodedLength: probe.decodedLength,
      reason: probe.reason,
    },
  };
}

export function getPlaceholderTextRuntimeHealth(model: AillameTextRuntimeModelInfo): AillameTextRuntimeHealth {
  return {
    modelId: model.id,
    runtimeKind: model.runtimeKind,
    status: model.status,
    available: false,
    canGenerate: false,
    supportsStreaming: model.supportsStreaming,
    warnings: ["Text runtime is registered as a placeholder and cannot generate yet."],
  };
}

function reasonFromHealth(health: AillameTextRuntimeHealth): string | undefined {
  const reason = health.diagnostics?.reason;
  if (typeof reason === "string" && reason.trim()) return reason;
  return health.warnings[0];
}

export function getTextRuntimeHealthSummary(
  runtimes: readonly AillameTextRuntime[]
): AillameTextRuntimeHealthSummary {
  const rows = runtimes.map((runtime) => {
    const health = runtime.getHealth();
    return {
      id: runtime.model.id,
      label: runtime.model.label,
      kind: runtime.model.runtimeKind,
      status: health.status,
      canGenerate: health.canGenerate,
      supportsStreaming: runtime.model.supportsStreaming,
      capabilities: [...runtime.model.capabilities],
      reason: reasonFromHealth(health),
      warnings: health.warnings.length > 0 ? health.warnings : undefined,
    };
  });

  return {
    success: rows.length > 0,
    total: rows.length,
    available: rows.filter((runtime) => runtime.status === "available").length,
    degraded: rows.filter((runtime) => runtime.status === "degraded").length,
    disabled: rows.filter((runtime) => runtime.status === "disabled").length,
    unavailable: rows.filter((runtime) => runtime.status === "unavailable").length,
    runtimes: rows,
  };
}
