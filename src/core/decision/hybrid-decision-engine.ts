import { routeAillameRequest } from "../aillame-router/router";
import type { AillameRouteInput } from "../aillame-router/types";
import type {
  AillameContentType,
  AillameOutputType,
  AillameRoutingDecision,
  AillameTaskType,
} from "../contracts/aillame-request";
import { checkModelAvailability, type AillameModelAvailabilityCheckResult } from "../models/model-availability-guard";
import { listModels, type ModelCapability as AillameModelCapability, type ManagedModel as AillameModelDefinition } from "../models/registry";
import { decodeNanoConstrainedDecision } from "../nano/decision/nano-constrained-decision-decoder";
import { buildNanoDecisionPrompt } from "../nano/decision/nano-decision-prompt";
import { AillameNanoController } from "../nano/nano-controller";

export type AillameHybridDecisionInput = {
  prompt: string;
  projectId?: string;
  mode?: string;
  taskType?: string;
  contentType?: string;
  outputType?: string;
  preferredModelId?: string;
  metadata?: Record<string, unknown>;
};

export type AillameHybridDecisionResult = {
  success: boolean;
  finalDecision: {
    taskType: string;
    contentType: string;
    outputType: string;
    domain: string;
    requiredCapabilities: string[];
    decision: string;
    selectedModelId?: string;
  };
  routingDecision: AillameRoutingDecision;
  sources: {
    routerUsed: boolean;
    nanoAttempted: boolean;
    nanoJsonParsed: boolean;
    nanoAssisted: boolean;
    routerFallbackUsed: boolean;
  };
  confidence: number;
  reason: string;
  diagnostics: {
    routerReason?: string;
    nanoRawPreview?: string;
    constrainedSource?: "nano-json" | "nano-assisted" | "router-fallback";
    reasonCode?: string;
    modelAvailability?: {
      preferredModelId?: string;
      preferredAvailable?: boolean;
      preferredRejectReason?: string;
      selectedModelId?: string;
      selectedAvailable?: boolean;
      selectedReason?: string;
    };
    warnings: string[];
  };
};

const TASK_TYPES = ["chat", "text", "code", "analysis", "image", "vision", "agent", "mixed", "unknown"] as const;
const CONTENT_TYPES = ["text", "image", "code", "project", "mixed"] as const;
const OUTPUT_TYPES = ["text", "image", "json", "patch", "report", "mixed"] as const;
const CAPABILITIES = [
  "text-generation",
  "chat",
  "code",
  "analysis",
  "image-generation",
  "vision-image-understanding",
  "agent-task",
] as const;

function pickAllowed<TValue extends string>(
  value: string | undefined,
  allowed: readonly TValue[]
): TValue | undefined {
  return value && allowed.includes(value as TValue) ? value as TValue : undefined;
}

function toRouteInput(input: AillameHybridDecisionInput): AillameRouteInput {
  return {
    prompt: input.prompt,
    projectId: input.projectId,
    preferredModelId: input.preferredModelId,
    taskType: pickAllowed(input.taskType, TASK_TYPES),
    contentType: pickAllowed(input.contentType, CONTENT_TYPES),
    outputType: pickAllowed(input.outputType, OUTPUT_TYPES),
  };
}

function toCapabilities(values: readonly string[]): AillameModelCapability[] {
  return values
    .filter((value): value is AillameModelCapability => CAPABILITIES.includes(value as never));
}

function shouldAttemptNanoDecision(input: AillameHybridDecisionInput): boolean {
  if (input.metadata?.nanoDecision === false) return false;
  if (input.metadata?.disableNanoDecision === true) return false;
  return true;
}

function buildRoutingDecision(
  routerDecision: AillameRoutingDecision,
  finalDecision: AillameHybridDecisionResult["finalDecision"],
  selectedModelId?: string
): AillameRoutingDecision {
  const capabilities = toCapabilities(finalDecision.requiredCapabilities);

  return {
    ...routerDecision,
    taskType: pickAllowed(finalDecision.taskType, TASK_TYPES) ?? routerDecision.taskType,
    contentType: pickAllowed(finalDecision.contentType, CONTENT_TYPES) ?? routerDecision.contentType,
    outputType: pickAllowed(finalDecision.outputType, OUTPUT_TYPES) ?? routerDecision.outputType,
    capabilities: capabilities.length > 0 ? capabilities : routerDecision.capabilities,
    selectedModelId,
  };
}

function rawContainsJsonObject(raw: string | undefined): boolean {
  if (!raw) return false;
  return raw.includes("{") && raw.includes("}");
}

function confidenceForSource(source: "nano-json" | "nano-assisted" | "router-fallback", routerConfidence: number): number {
  if (source === "nano-json") return Math.min(0.98, Math.max(routerConfidence, 0.88));
  if (source === "nano-assisted") return Math.min(0.9, Math.max(routerConfidence, 0.72));
  return Math.min(0.86, Math.max(routerConfidence, 0.55));
}

function modelHasCapabilities(model: AillameModelDefinition, capabilities: readonly AillameModelCapability[]): boolean {
  return capabilities.every((capability) => model.capabilities.includes(capability));
}

function sortedCapabilityCandidates(capabilities: readonly AillameModelCapability[]): AillameModelDefinition[] {
  return listModels()
    .filter((model) => modelHasCapabilities(model, capabilities))
    .sort((a, b) => {
        const tierScore = (m: AillameModelDefinition) => m.tier === 'pro' ? 2 : 1;
        return tierScore(b) - tierScore(a);
    });
}

function reasonForAvailability(check: AillameModelAvailabilityCheckResult | undefined): string | undefined {
  if (!check) return undefined;
  if (check.reasonCode === "AVAILABLE") return "AVAILABLE";
  return check.reasonCode;
}

function selectAvailableModelForCapabilities(
  capabilities: readonly AillameModelCapability[],
  preferredModelId?: string
): {
  selectedModelId?: string;
  selectedAvailability?: AillameModelAvailabilityCheckResult;
  preferredAvailability?: AillameModelAvailabilityCheckResult;
  warnings: string[];
} {
  const warnings: string[] = [];
  let preferredAvailability: AillameModelAvailabilityCheckResult | undefined;

  if (preferredModelId) {
    preferredAvailability = checkModelAvailability({
      modelId: preferredModelId,
      requiredCapabilities: [...capabilities],
      requireCanGenerate: true,
    });

    if (preferredAvailability.available) {
      return {
        selectedModelId: preferredModelId,
        selectedAvailability: preferredAvailability,
        preferredAvailability,
        warnings,
      };
    }

    warnings.push(`preferred-model:${preferredModelId}:${preferredAvailability.reasonCode}`);
    warnings.push(...preferredAvailability.warnings.map((warning) => `preferred-model:${warning}`));
  }

  for (const candidate of sortedCapabilityCandidates(capabilities)) {
    if (candidate.id === preferredModelId) continue;
    const availability = checkModelAvailability({
      modelId: candidate.id,
      requiredCapabilities: [...capabilities],
      requireCanGenerate: true,
    });

    if (availability.available) {
      return {
        selectedModelId: candidate.id,
        selectedAvailability: availability,
        preferredAvailability,
        warnings,
      };
    }
  }

  return {
    preferredAvailability,
    warnings: [
      ...warnings,
      `model-selection:NO_AVAILABLE_MODEL_FOR_CAPABILITIES:${capabilities.join(",") || "none"}`,
    ],
  };
}

export async function decideAillameHybrid(
  input: AillameHybridDecisionInput
): Promise<AillameHybridDecisionResult> {
  const router = routeAillameRequest(toRouteInput(input));
  const warnings: string[] = [];
  const nanoAttempted = shouldAttemptNanoDecision(input);
  let rawNanoOutput = "";

  if (nanoAttempted) {
    try {
      const controller = new AillameNanoController();
      const answer = await controller.answer({
        prompt: buildNanoDecisionPrompt({
          prompt: input.prompt,
          projectId: input.projectId,
          mode: input.mode,
        }),
        maxTokens: 8,
        temperature: 0.1,
      });
      rawNanoOutput = answer.rawContent ?? answer.content;
      warnings.push(...answer.warnings.map((warning) => `nano-decision:${warning}`));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown Nano decision error.";
      warnings.push(`nano-decision:${message}`);
    }
  } else {
    warnings.push("nano-decision:skipped");
  }

  const constrained = decodeNanoConstrainedDecision({
    prompt: input.prompt,
    projectId: input.projectId,
    mode: input.mode,
    rawNanoOutput,
    routerFallback: {
      taskType: router.taskType,
      contentType: router.contentType,
      outputType: router.outputType,
      domain: router.primaryMode,
      requiredCapabilities: router.capabilities,
    },
  });
  const capabilities = toCapabilities(constrained.decision.requiredCapabilities);
  const modelSelection = selectAvailableModelForCapabilities(capabilities, input.preferredModelId);
  warnings.push(...modelSelection.warnings);
  const finalDecision = {
    ...constrained.decision,
    selectedModelId: modelSelection.selectedModelId,
  };
  const routingDecision = buildRoutingDecision(router.routingDecision, finalDecision, modelSelection.selectedModelId);
  const confidence = confidenceForSource(constrained.source, router.confidence);

  return {
    success: true,
    finalDecision,
    routingDecision,
    sources: {
      routerUsed: true,
      nanoAttempted,
      nanoJsonParsed: constrained.source === "nano-json" && rawContainsJsonObject(rawNanoOutput),
      nanoAssisted: constrained.source === "nano-assisted",
      routerFallbackUsed: constrained.diagnostics.usedRouterFallback,
    },
    confidence,
    reason: constrained.source === "nano-json"
      ? "Hybrid decision used parseable Nano JSON constrained by the Aillame decision schema."
      : constrained.source === "nano-assisted"
        ? "Hybrid decision used Nano JSON-like hints constrained by router-safe fields."
        : "Hybrid decision used router-safe fallback because Nano did not produce decision JSON.",
    diagnostics: {
      routerReason: router.reason,
      nanoRawPreview: constrained.diagnostics.rawPreview,
      constrainedSource: constrained.source,
      reasonCode: constrained.diagnostics.reasonCode,
      modelAvailability: {
        preferredModelId: input.preferredModelId,
        preferredAvailable: modelSelection.preferredAvailability?.available,
        preferredRejectReason: modelSelection.preferredAvailability?.available === false
          ? reasonForAvailability(modelSelection.preferredAvailability)
          : undefined,
        selectedModelId: modelSelection.selectedModelId,
        selectedAvailable: modelSelection.selectedAvailability?.available,
        selectedReason: reasonForAvailability(modelSelection.selectedAvailability),
      },
      warnings,
    },
  };
}
