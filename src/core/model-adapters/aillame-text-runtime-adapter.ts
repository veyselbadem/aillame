import type {
  AillameRequest,
  AillameRoutingDecision,
  AillameTaskType,
} from "../contracts/aillame-request";
import { AillameNanoController } from "../nano/nano-controller";

export type AillameTextRuntimeResult = {
  success: true;
  content: string;
  runtime: "aillame-nano";
  usedModelIds: string[];
  usedLocalEngine: boolean;
  warnings: string[];
  metadata: {
    taskType: AillameTaskType;
    selectedModelId?: string;
    routeConfidence: number;
    engineDebug?: {
      nativeEngineAvailable: boolean;
      checkpointLoaded: boolean;
      checkpointPath?: string;
      generatedTokenCount: number;
      decodedLength: number;
      usefulOutput: boolean;
      cleanupReason?: string;
      removedPromptEcho?: boolean;
      reason?: string;
    };
  };
};

const SAFE_TEXT_TASK_TYPES: readonly AillameTaskType[] = ["chat", "text", "analysis"];

function isSafeTextTask(routingDecision: AillameRoutingDecision): boolean {
  return (
    SAFE_TEXT_TASK_TYPES.includes(routingDecision.taskType)
    && routingDecision.outputType !== "image"
    && !routingDecision.capabilities.includes("image-generation")
    && !routingDecision.capabilities.includes("agent-task")
  );
}

function readNumberMetadata(
  metadata: Record<string, unknown> | undefined,
  key: string,
  min: number,
  max: number
): number | undefined {
  const value = metadata?.[key];
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return Math.min(max, Math.max(min, value));
}

export async function generateWithAillameTextRuntime(
  request: AillameRequest,
  routingDecision: AillameRoutingDecision
): Promise<AillameTextRuntimeResult> {
  if (!isSafeTextTask(routingDecision)) {
    throw new Error(`Aillame text runtime cannot execute taskType=${routingDecision.taskType}.`);
  }

  const controller = new AillameNanoController();
  const answer = await controller.answer({
    prompt: request.prompt,
    maxTokens: readNumberMetadata(request.metadata, "maxTokens", 1, 2048),
    temperature: readNumberMetadata(request.metadata, "temperature", 0, 2),
  });

  return {
    success: true,
    content: answer.content,
    runtime: "aillame-nano",
    usedModelIds: [routingDecision.selectedModelId ?? "aillame-nano"],
    usedLocalEngine: answer.usedLocalEngine,
    warnings: answer.warnings,
    metadata: {
      taskType: routingDecision.taskType,
      selectedModelId: routingDecision.selectedModelId,
      routeConfidence: routingDecision.confidence,
      engineDebug: answer.engineDebug,
    },
  };
}

export function canUseAillameTextRuntime(routingDecision: AillameRoutingDecision): boolean {
  return isSafeTextTask(routingDecision);
}
