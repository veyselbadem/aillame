import {
  findTextRuntimesByCapability,
  getTextRuntimeByModelId,
  listTextRuntimeInstances,
} from "./text-runtime-registry";
import { checkModelAvailability } from "../../models/model-availability-guard";
import type { AillameTextRuntime } from "./text-runtime-interface";
import type {
  AillameTextGenerateRequest,
  AillameTextGenerateResult,
  AillameTextRuntimeCapability,
} from "./text-runtime-types";

export type AillameTextRuntimeRouteDecision = {
  success: boolean;
  runtime?: AillameTextRuntime;
  selectedModelId?: string;
  requiredCapabilities: AillameTextRuntimeCapability[];
  reason: string;
  warnings: string[];
};

export type AillameBestTextRuntimeResult = {
  route: AillameTextRuntimeRouteDecision;
  generation: AillameTextGenerateResult;
};

function capabilityForTask(taskType: string | undefined): AillameTextRuntimeCapability {
  if (taskType === "chat") return "chat";
  if (taskType === "code") return "code-generation";
  if (taskType === "analysis") return "analysis";
  if (taskType === "decision") return "decision";
  return "text-generation";
}

export function routeTextRuntimeRequest(
  request: AillameTextGenerateRequest
): AillameTextRuntimeRouteDecision {
  const requiredCapabilities = [
    capabilityForTask(request.taskType),
    ...(request.stream ? ["streaming" as const] : []),
  ];

  if (request.modelId) {
    const preferred = getTextRuntimeByModelId(request.modelId);
    if (!preferred) {
      return {
        success: false,
        selectedModelId: request.modelId,
        requiredCapabilities,
        reason: "Preferred text runtime model was not registered.",
        warnings: [`Unknown text runtime modelId=${request.modelId}.`],
      };
    }

    if (!preferred.canHandle(request, requiredCapabilities)) {
      return {
        success: false,
        selectedModelId: request.modelId,
        requiredCapabilities,
        reason: "Preferred text runtime cannot handle the requested capabilities.",
        warnings: [`Text runtime modelId=${request.modelId} cannot handle ${requiredCapabilities.join(", ")}.`],
      };
    }

    const availability = checkModelAvailability({
      modelId: request.modelId,
      requiredCapabilities,
      requireCanGenerate: true,
    });

    if (!availability.available) {
      return {
        success: false,
        selectedModelId: request.modelId,
        requiredCapabilities,
        reason: `Preferred text runtime is not available for generation: ${availability.reasonCode}.`,
        warnings: availability.warnings,
      };
    }

    return {
      success: true,
      runtime: preferred,
      selectedModelId: preferred.model.id,
      requiredCapabilities,
      reason: "Preferred text runtime selected.",
      warnings: [],
    };
  }

  const candidates = requiredCapabilities.length === 0
    ? listTextRuntimeInstances()
    : findTextRuntimesByCapability(requiredCapabilities[0]);
  const runtime = candidates.find((candidate) => {
    if (!candidate.canHandle(request, requiredCapabilities)) return false;
    return checkModelAvailability({
      modelId: candidate.model.id,
      requiredCapabilities,
      requireCanGenerate: true,
    }).available;
  });

  if (!runtime) {
    return {
      success: false,
      requiredCapabilities,
      reason: "No registered text runtime can handle the request.",
      warnings: [`No text runtime supports ${requiredCapabilities.join(", ")} in this phase.`],
    };
  }

  return {
    success: true,
    runtime,
    selectedModelId: runtime.model.id,
    requiredCapabilities,
    reason: "Best available text runtime selected.",
    warnings: [],
  };
}

export async function generateWithBestTextRuntime(
  request: AillameTextGenerateRequest
): Promise<AillameBestTextRuntimeResult> {
  const route = routeTextRuntimeRequest(request);

  if (!route.success || !route.runtime) {
    return {
      route,
      generation: {
        success: false,
        modelId: route.selectedModelId ?? request.modelId ?? "unselected",
        runtimeKind: "placeholder",
        content: "",
        finishReason: "unsupported",
        usedLocalRuntime: false,
        degraded: true,
        warnings: route.warnings,
        diagnostics: {
          reasonCode: "TEXT_RUNTIME_ROUTE_NOT_FOUND",
          runtimeStatus: "unavailable",
        },
        error: {
          code: "TEXT_RUNTIME_ROUTE_NOT_FOUND",
          message: route.reason,
        },
      },
    };
  }

  return {
    route,
    generation: await route.runtime.generate(request, {
      requiredCapabilities: route.requiredCapabilities,
      reason: route.reason,
    }),
  };
}
