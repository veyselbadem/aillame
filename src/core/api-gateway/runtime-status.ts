import {
  getAillameEngine,
  getNanoCheckpointStatus,
  getNativeModuleStatus,
  getProEngine,
  probeAillameTextRuntime,
} from "../engine/rust-core";
import { listModels } from "../models/registry";
import { getTextRuntimeHealthSummary, type AillameTextRuntimeHealthSummary } from "../runtime/text/text-runtime-health";
import { listTextRuntimeInstances } from "../runtime/text/text-runtime-registry";

import { buildApiDiagnosticsEnvelope, createSuccessDiagnostic, type AillameApiDiagnosticsEnvelope } from "./api-diagnostics";

export type AillameRuntimeStatus = {
  success: true;
  runtime: {
    gateway: "available";
    auth: "enabled" | "disabled";
    rustCore: "available" | "unavailable";
    proEngine: "available" | "unavailable";
    textRuntime: {
      available: boolean;
      nativeModuleLoaded: boolean;
      checkpointConfigured: boolean;
      checkpointPathExists: boolean;
      checkpointPath: string;
      canGenerate: boolean;
      lastProbe: {
        success: boolean;
        reason?: string;
        generatedTokenCount: number;
        decodedLength: number;
      };
    };
    textRuntimeRegistry: AillameTextRuntimeHealthSummary;
  };
  models: {
    count: number;
    available: number;
    disabled: number;
    unknown: number;
  };
  diagnostics?: AillameApiDiagnosticsEnvelope;
};

export function getRuntimeStatus(): AillameRuntimeStatus {
  const models = listModels();
  const rustCore = getAillameEngine();
  const proEngine = getProEngine();
  const nativeModule = getNativeModuleStatus();
  const checkpoint = getNanoCheckpointStatus();
  const probe = probeAillameTextRuntime();
  const textRuntimeRegistry = getTextRuntimeHealthSummary(listTextRuntimeInstances());

  return {
    success: true,
    runtime: {
      gateway: "available",
      auth: (process.env.AILLAME_API_KEYS ?? "").trim() ? "enabled" : "disabled",
      rustCore: rustCore ? "available" : "unavailable",
      proEngine: proEngine ? "available" : "unavailable",
      textRuntime: {
        available: Boolean(rustCore && checkpoint.checkpointPathExists),
        nativeModuleLoaded: nativeModule.nativeModuleLoaded,
        checkpointConfigured: checkpoint.checkpointConfigured,
        checkpointPathExists: checkpoint.checkpointPathExists,
        checkpointPath: checkpoint.checkpointPath,
        canGenerate: probe.success,
        lastProbe: {
          success: probe.success,
          reason: probe.reason,
          generatedTokenCount: probe.generatedTokenCount,
          decodedLength: probe.decodedLength,
        },
      },
      textRuntimeRegistry,
    },
    models: {
      count: models.length,
      available: models.filter((model) => model.enabled !== false).length,
      disabled: models.filter((model) => model.enabled === false).length,
      unknown: 0,
    },
    diagnostics: buildApiDiagnosticsEnvelope([
      probe.success
        ? createSuccessDiagnostic("All core runtimes are operational.")
        : {
            code: "TEXT_RUNTIME_UNAVAILABLE",
            severity: "error",
            message: probe.reason || "Text runtime probe failed.",
          },
    ]),
  };
}
