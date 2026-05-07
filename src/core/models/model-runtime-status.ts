import { getTextRuntimeHealthSummary } from "../runtime/text/text-runtime-health";
import { listTextRuntimeInstances } from "../runtime/text/text-runtime-registry";
import type { AillameTextRuntimeHealthSummary } from "../runtime/text/text-runtime-health";
import { type ManagedModel } from "./registry";

export type AillameModelRuntimeStatusView = {
  modelId: string;
  label?: string;
  type?: string;
  runtime?: string;
  capabilities: string[];
  registryStatus?: string;
  runtimeLinked: boolean;
  runtimeKind?: string;
  runtimeStatus?: string;
  canGenerate: boolean;
  supportsStreaming?: boolean;
  availableForUse: boolean;
  reason?: string;
  warnings: string[];
  ggufReadiness?: {
    formatDetected: boolean;
    quantizationDetected: boolean;
    hardwareFit: string;
    canEnable: boolean;
  };
};

export type AillameModelsRuntimeStatusView = {
  models: AillameModelRuntimeStatusView[];
  runtimeOnly: AillameModelRuntimeStatusView[];
  summary: {
    totalModels: number;
    linkedModels: number;
    availableForUse: number;
    runtimeOnly: number;
  };
};

function modelUnavailableReason(model: ManagedModel): string | undefined {
  if (model.enabled === false) return "Model is disabled in the model registry.";
  if (model.type !== "text") return "No text runtime is expected for this non-text model in this phase.";
  return "No linked text runtime was found for this model.";
}

function buildWarnings(
  model: ManagedModel | undefined,
  runtimeWarnings: string[] | undefined,
  runtimeLinked: boolean
): string[] {
  const warnings = [...(runtimeWarnings ?? [])];

  if (model && !runtimeLinked && model.type === "text") {
    warnings.push("Model is registered but no text runtime is linked.");
  }

  if (!model) {
    warnings.push("Runtime is registered but no model registry entry is linked.");
  }

  return Array.from(new Set(warnings));
}

function viewForModel(
  model: ManagedModel,
  runtimeHealth: AillameTextRuntimeHealthSummary["runtimes"][number] | undefined
): AillameModelRuntimeStatusView {
  const runtimeLinked = Boolean(runtimeHealth);
  const registryUsable = model.enabled !== false;
  const runtimeUsable = Boolean(runtimeHealth?.canGenerate);
  const availableForUse = registryUsable && (
    model.type === "text"
      ? runtimeLinked && runtimeUsable
      : false
  );

  return {
    modelId: model.id,
    label: model.label,
    type: model.type,
    runtime: model.runtime,
    capabilities: [...model.capabilities],
    registryStatus: model.enabled !== false ? "available" : "disabled",
    runtimeLinked,
    runtimeKind: runtimeHealth?.kind,
    runtimeStatus: runtimeHealth?.status,
    canGenerate: runtimeUsable,
    supportsStreaming: runtimeHealth?.supportsStreaming,
    availableForUse,
    reason: runtimeHealth?.reason ?? (!availableForUse ? modelUnavailableReason(model) : undefined),
    warnings: buildWarnings(model, runtimeHealth?.warnings, runtimeLinked),
  };
}

function viewForRuntimeOnly(
  runtimeHealth: AillameTextRuntimeHealthSummary["runtimes"][number]
): AillameModelRuntimeStatusView {
  return {
    modelId: runtimeHealth.id,
    label: runtimeHealth.label,
    capabilities: runtimeHealth.capabilities,
    runtimeLinked: false,
    runtimeKind: runtimeHealth.kind,
    runtimeStatus: runtimeHealth.status,
    canGenerate: runtimeHealth.canGenerate,
    supportsStreaming: runtimeHealth.supportsStreaming,
    availableForUse: false,
    reason: runtimeHealth.reason ?? "Runtime is not linked to a model registry entry.",
    warnings: buildWarnings(undefined, runtimeHealth.warnings, false),
  };
}

export function buildModelRuntimeStatusView(
  models: readonly ManagedModel[]
): AillameModelsRuntimeStatusView {
  const textRuntimeHealth = getTextRuntimeHealthSummary(listTextRuntimeInstances());
  const runtimeById = new Map(textRuntimeHealth.runtimes.map((runtime) => [runtime.id, runtime]));
  const modelIds = new Set(models.map((model) => model.id));
  const modelViews = models.map((model) => viewForModel(model, runtimeById.get(model.id)));
  const runtimeOnly = textRuntimeHealth.runtimes
    .filter((runtime) => !modelIds.has(runtime.id))
    .map((runtime) => viewForRuntimeOnly(runtime));

  return {
    models: modelViews,
    runtimeOnly,
    summary: {
      totalModels: modelViews.length,
      linkedModels: modelViews.filter((model) => model.runtimeLinked).length,
      availableForUse: modelViews.filter((model) => model.availableForUse).length,
      runtimeOnly: runtimeOnly.length,
    },
  };
}
