import { listModels } from "../../models/registry";
import { getTextRuntimeHealthSummary } from "../text/text-runtime-health";
import { listTextRuntimeInstances } from "../text/text-runtime-registry";
import type {
  AillameRuntimeManagerSummary,
  AillameRuntimeLifecycleEntry,
  AillameRuntimeDomain,
  AillameRuntimeLifecycleState,
} from "./runtime-manager-types";

function mapModelTypeToDomain(type: string): AillameRuntimeDomain {
  switch (type) {
    case "text":
      return "text";
    case "image":
      return "image";
    case "vision":
      return "vision";
    case "agent":
      return "agent";
    default:
      return "unknown";
  }
}

function mapStatusToLifecycleState(status: string): AillameRuntimeLifecycleState {
  switch (status) {
    case "available":
      return "available";
    case "disabled":
      return "disabled";
    case "unavailable":
      return "unavailable";
    case "degraded":
      return "degraded";
    case "not-configured":
      return "not-configured";
    case "not-implemented":
      return "not-implemented";
    default:
      return "unknown";
  }
}

export function getRuntimeLifecycleSummary(): AillameRuntimeManagerSummary {
  const models = listModels();
  const textHealth = getTextRuntimeHealthSummary(listTextRuntimeInstances());
  const textHealthMap = new Map(textHealth.runtimes.map((r) => [r.id, r]));

  const entries: AillameRuntimeLifecycleEntry[] = models.map((model) => {
    const health = textHealthMap.get(model.id);
    const domain = mapModelTypeToDomain(model.type || 'text');

    // Default values for non-text or placeholder runtimes
    let state: AillameRuntimeLifecycleState = model.enabled !== false ? "available" : "disabled";
    let canGenerate = false;
    let canStart = false;
    let canStop = false;
    let supportsStreaming = false;
    let reason = model.notes;
    const warnings: string[] = [];

    if (domain === "text" && health) {
      state = mapStatusToLifecycleState(health.status);
      canGenerate = health.canGenerate;
      supportsStreaming = health.supportsStreaming;
      if (health.warnings) warnings.push(...health.warnings);
      if (health.reason) reason = health.reason;

      // Logic for canStart/canStop based on kind
      if (health.kind === "aillame-managed-worker") {
        canStart = true; // Potentially startable
        canStop = health.status === "available";
      }
    }

    return {
      id: model.id,
      label: model.label,
      domain,
      runtimeType: model.runtime,
      healthKind: health?.kind,
      modelId: model.id,
      state,
      canGenerate,
      canStart,
      canStop,
      supportsStreaming,
      capabilities: [...model.capabilities],
      reason,
      warnings,
    };
  });

  return {
    success: true,
    total: entries.length,
    available: entries.filter((e) => e.state === "available").length,
    disabled: entries.filter((e) => e.state === "disabled").length,
    unavailable: entries.filter((e) => e.state === "unavailable").length,
    degraded: entries.filter((e) => e.state === "degraded").length,
    entries,
    warnings: [],
  };
}
