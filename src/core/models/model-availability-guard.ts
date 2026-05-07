import { getTextRuntimeHealthSummary } from "../runtime/text/text-runtime-health";
import { listTextRuntimeInstances } from "../runtime/text/text-runtime-registry";
import { buildModelRuntimeStatusView } from "./model-runtime-status";
import { getModelById, listModels, type ManagedModel } from "./registry";

export type AillameModelAvailabilityCheckInput = {
  modelId?: string;
  requiredCapabilities?: string[];
  requireCanGenerate?: boolean;
};

export type AillameModelAvailabilityCheckResult = {
  available: boolean;
  modelId?: string;
  runtimeLinked: boolean;
  runtimeStatus?: string;
  canGenerate: boolean;
  availableForUse: boolean;
  reasonCode:
    | "AVAILABLE"
    | "MODEL_ID_MISSING"
    | "MODEL_NOT_FOUND"
    | "RUNTIME_NOT_LINKED"
    | "RUNTIME_DISABLED"
    | "RUNTIME_UNAVAILABLE"
    | "RUNTIME_CANNOT_GENERATE"
    | "CAPABILITY_MISMATCH"
    | "UNKNOWN";
  warnings: string[];
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function runtimeCapabilitiesForModel(modelId: string): string[] {
  const summary = getTextRuntimeHealthSummary(listTextRuntimeInstances());
  return summary.runtimes.find((runtime) => runtime.id === modelId)?.capabilities ?? [];
}

function hasRequiredCapabilities(modelId: string, modelCapabilities: string[], requiredCapabilities: string[]): boolean {
  if (requiredCapabilities.length === 0) return true;
  const available = new Set([...modelCapabilities, ...runtimeCapabilitiesForModel(modelId)]);
  return requiredCapabilities.every((capability) => available.has(capability));
}

function unavailable(
  input: AillameModelAvailabilityCheckInput,
  reasonCode: AillameModelAvailabilityCheckResult["reasonCode"],
  warnings: string[],
  extra?: Partial<AillameModelAvailabilityCheckResult>
): AillameModelAvailabilityCheckResult {
  return {
    available: false,
    modelId: input.modelId,
    runtimeLinked: false,
    canGenerate: false,
    availableForUse: false,
    reasonCode,
    warnings: unique(warnings),
    ...extra,
  };
}

export function checkModelAvailability(
  input: AillameModelAvailabilityCheckInput
): AillameModelAvailabilityCheckResult {
  if (!input.modelId) {
    return unavailable(input, "MODEL_ID_MISSING", ["modelId is required for availability checks."]);
  }

  const model = getModelById(input.modelId);
  if (!model) {
    return unavailable(input, "MODEL_NOT_FOUND", [`Model ${input.modelId} is not registered.`]);
  }

  const view = buildModelRuntimeStatusView(listModels()).models.find((entry) => entry.modelId === input.modelId);
  if (!view) {
    return unavailable(input, "UNKNOWN", [`Model ${input.modelId} did not produce a runtime status view.`]);
  }

  const requiredCapabilities = input.requiredCapabilities ?? [];
  if (!hasRequiredCapabilities(input.modelId, view.capabilities, requiredCapabilities)) {
    return unavailable(
      input,
      "CAPABILITY_MISMATCH",
      [
        ...view.warnings,
        `Model ${input.modelId} does not support required capabilities: ${requiredCapabilities.join(", ")}.`,
      ],
      {
        runtimeLinked: view.runtimeLinked,
        runtimeStatus: view.runtimeStatus,
        canGenerate: view.canGenerate,
        availableForUse: view.availableForUse,
      }
    );
  }

  if (!view.runtimeLinked) {
    return unavailable(input, "RUNTIME_NOT_LINKED", view.warnings, {
      runtimeLinked: false,
      runtimeStatus: view.runtimeStatus,
      canGenerate: view.canGenerate,
      availableForUse: view.availableForUse,
    });
  }

  if (view.runtimeStatus === "disabled") {
    return unavailable(input, "RUNTIME_DISABLED", view.warnings, {
      runtimeLinked: true,
      runtimeStatus: view.runtimeStatus,
      canGenerate: view.canGenerate,
      availableForUse: view.availableForUse,
    });
  }

  if (view.runtimeStatus === "unavailable") {
    return unavailable(input, "RUNTIME_UNAVAILABLE", view.warnings, {
      runtimeLinked: true,
      runtimeStatus: view.runtimeStatus,
      canGenerate: view.canGenerate,
      availableForUse: view.availableForUse,
    });
  }

  if (input.requireCanGenerate !== false && !view.canGenerate) {
    return unavailable(input, "RUNTIME_CANNOT_GENERATE", view.warnings, {
      runtimeLinked: true,
      runtimeStatus: view.runtimeStatus,
      canGenerate: view.canGenerate,
      availableForUse: view.availableForUse,
    });
  }

  if (!view.availableForUse) {
    return unavailable(input, "UNKNOWN", view.warnings, {
      runtimeLinked: view.runtimeLinked,
      runtimeStatus: view.runtimeStatus,
      canGenerate: view.canGenerate,
      availableForUse: view.availableForUse,
    });
  }

  return {
    available: true,
    modelId: input.modelId,
    runtimeLinked: view.runtimeLinked,
    runtimeStatus: view.runtimeStatus,
    canGenerate: view.canGenerate,
    availableForUse: view.availableForUse,
    reasonCode: "AVAILABLE",
    warnings: view.warnings,
  };
}

/**
 * Helper to determine if a model definition is compatible with the Aillame Text Runtime Router.
 * Centralizes the policy of which runtimes are allowed to use the high-performance text pipeline.
 */
export function isTextRuntimeRouterCompatible(model: ManagedModel | undefined): boolean {
  if (!model) return false;
  // Currently, only the native Rust runtime or internal GGUF is allowed for high-perf.
  return model.runtime === "rust-candle" || model.runtime === "internal-text";
}
