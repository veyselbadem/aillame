export type NanoConstrainedDecisionDecodeInput = {
  prompt: string;
  projectId?: string;
  mode?: string;
  rawNanoOutput: string;
  routerFallback?: {
    taskType?: string;
    contentType?: string;
    outputType?: string;
    domain?: string;
    requiredCapabilities?: string[];
    memoryScope?: string;
  };
};

export type NanoConstrainedDecisionDecodeResult = {
  success: boolean;
  decision: {
    projectId: string;
    mode?: string;
    intent: string;
    taskType: string;
    contentType: string;
    outputType: string;
    domain: string;
    taskScore: number;
    riskLevel: "low" | "medium" | "high";
    needsMemory: boolean;
    memoryScope: "none" | "global" | "project" | "session";
    needsRuntime: boolean;
    requiredCapabilities: string[];
    fallbackRecommended: boolean;
    confidence: number;
    decision: string;
    longTermCapabilityHooks: {
      planningReady: boolean;
      toolUseReady: boolean;
      memoryUseReady: boolean;
      codeUseReady: boolean;
      multimodalReady: boolean;
      selfImproveReady: boolean;
      autonomousActionsEnabled: false;
      diagnosticsOnly: true;
    };
  };
  source: "nano-json" | "nano-assisted" | "router-fallback";
  diagnostics: {
    rawStartedWithJson: boolean;
    rawContainedJsonHints: boolean;
    usedRouterFallback: boolean;
    repaired: boolean;
    reasonCode?: string;
    rawPreview: string;
  };
};

const TASK_TYPES = ["chat", "text", "code", "analysis", "image", "vision", "agent", "mixed", "unknown"] as const;
const CONTENT_TYPES = ["text", "image", "code", "project", "mixed"] as const;
const OUTPUT_TYPES = ["text", "image", "json", "patch", "report", "mixed"] as const;
const DOMAINS = ["general", "education", "code", "economy"] as const;
const MEMORY_SCOPES = ["none", "global", "project", "session"] as const;
const RISK_LEVELS = ["low", "medium", "high"] as const;
const CAPABILITIES = [
  "text-generation",
  "chat",
  "code-generation",
  "analysis",
  "image-generation",
  "image-understanding",
  "agent-task",
] as const;

type DecisionObject = NanoConstrainedDecisionDecodeResult["decision"];
type DecodeSource = NanoConstrainedDecisionDecodeResult["source"];

function normalizeRaw(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function preview(value: string): string {
  return normalizeRaw(value).slice(0, 160);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function pickAllowed(value: unknown, allowed: readonly string[], fallback: string): string {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}

function pickCapabilities(value: unknown, fallback: string[]): string[] {
  if (!isStringArray(value)) return fallback;
  const filtered = value.filter((item) => CAPABILITIES.includes(item as never));
  return filtered.length > 0 ? filtered : fallback;
}

function defaultCapabilityForTask(taskType: string): string[] {
  if (taskType === "image") return ["image-generation"];
  if (taskType === "vision") return ["image-understanding"];
  if (taskType === "code") return ["code-generation"];
  if (taskType === "analysis") return ["analysis"];
  if (taskType === "agent") return ["agent-task"];
  if (taskType === "chat") return ["chat"];
  return ["text-generation"];
}

function defaultHooks(): DecisionObject["longTermCapabilityHooks"] {
  return {
    planningReady: true,
    toolUseReady: false,
    memoryUseReady: true,
    codeUseReady: false,
    multimodalReady: false,
    selfImproveReady: false,
    autonomousActionsEnabled: false,
    diagnosticsOnly: true,
  };
}

function fallbackDecision(input: NanoConstrainedDecisionDecodeInput): DecisionObject {
  const taskType = pickAllowed(input.routerFallback?.taskType, TASK_TYPES, "text");
  const contentType = pickAllowed(input.routerFallback?.contentType, CONTENT_TYPES, "text");
  const outputType = pickAllowed(input.routerFallback?.outputType, OUTPUT_TYPES, "text");
  const domain = pickAllowed(input.routerFallback?.domain ?? input.mode, DOMAINS, "general");
  const requiredCapabilities = pickCapabilities(
    input.routerFallback?.requiredCapabilities,
    defaultCapabilityForTask(taskType)
  );

  return {
    projectId: input.projectId ?? "general",
    mode: input.mode,
    intent: taskType,
    taskType,
    contentType,
    outputType,
    domain,
    taskScore: 0.5,
    riskLevel: "low",
    needsMemory: taskType !== "image",
    memoryScope: pickAllowed(input.routerFallback?.memoryScope, MEMORY_SCOPES, input.projectId ? "project" : "session") as DecisionObject["memoryScope"],
    needsRuntime: true,
    requiredCapabilities,
    fallbackRecommended: true,
    confidence: 0.5,
    decision: "router fallback decision used because Nano output was not valid decision JSON",
    longTermCapabilityHooks: defaultHooks(),
  };
}

function extractJsonCandidate(raw: string): string | undefined {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  return raw.slice(start, end + 1);
}

function parseJsonObject(raw: string): Record<string, unknown> | undefined {
  const candidate = extractJsonCandidate(raw);
  if (!candidate) return undefined;

  try {
    const parsed = JSON.parse(candidate);
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}

function buildDecisionFromObject(
  value: Record<string, unknown>,
  fallback: DecisionObject
): { valid: boolean; decision: DecisionObject; repaired: boolean } {
  const taskType = pickAllowed(value.taskType, TASK_TYPES, fallback.taskType);
  const contentType = pickAllowed(value.contentType, CONTENT_TYPES, fallback.contentType);
  const outputType = pickAllowed(value.outputType, OUTPUT_TYPES, fallback.outputType);
  const domain = pickAllowed(value.domain, DOMAINS, fallback.domain);
  const requiredCapabilities = pickCapabilities(value.requiredCapabilities, fallback.requiredCapabilities);
  const taskScore = typeof value.taskScore === "number" && Number.isFinite(value.taskScore) ? Math.max(0, Math.min(1, value.taskScore)) : fallback.taskScore;
  const confidence = typeof value.confidence === "number" && Number.isFinite(value.confidence) ? Math.max(0, Math.min(1, value.confidence)) : fallback.confidence;
  const decision = typeof value.decision === "string" && value.decision.trim()
    ? value.decision.trim()
    : "Nano JSON decision repaired with fallback fields";

  const valid = (
    value.taskType === taskType
    && value.contentType === contentType
    && value.outputType === outputType
    && value.domain === domain
    && isStringArray(value.requiredCapabilities)
    && value.requiredCapabilities.length === requiredCapabilities.length
    && typeof value.decision === "string"
  );

  return {
    valid,
    repaired: !valid,
    decision: {
      taskType,
      contentType,
      outputType,
      domain,
      projectId: typeof value.projectId === "string" && value.projectId.trim() ? value.projectId.trim() : fallback.projectId,
      mode: typeof value.mode === "string" && value.mode.trim() ? value.mode.trim() : fallback.mode,
      intent: typeof value.intent === "string" && value.intent.trim() ? value.intent.trim() : fallback.intent,
      taskScore,
      riskLevel: pickAllowed(value.riskLevel, RISK_LEVELS, fallback.riskLevel) as DecisionObject["riskLevel"],
      needsMemory: typeof value.needsMemory === "boolean" ? value.needsMemory : fallback.needsMemory,
      memoryScope: pickAllowed(value.memoryScope, MEMORY_SCOPES, fallback.memoryScope) as DecisionObject["memoryScope"],
      needsRuntime: typeof value.needsRuntime === "boolean" ? value.needsRuntime : fallback.needsRuntime,
      requiredCapabilities,
      fallbackRecommended: typeof value.fallbackRecommended === "boolean" ? value.fallbackRecommended : fallback.fallbackRecommended,
      confidence,
      decision,
      longTermCapabilityHooks: defaultHooks(),
    },
  };
}

function containsAny(raw: string, values: readonly string[]): boolean {
  return values.some((value) => raw.includes(value));
}

function inferFromNanoHints(raw: string, fallback: DecisionObject): DecisionObject | undefined {
  const normalized = raw.toLocaleLowerCase("tr-TR");
  const hasJsonFieldHint = [
    "tasktype",
    "contenttype",
    "outputtype",
    "requiredcapabilities",
    "decision",
    "domain",
    "content",
    "null",
  ].some((hint) => normalized.includes(hint));

  if (!hasJsonFieldHint) return undefined;

  const taskType = containsAny(normalized, ["image-generation", "image"]) ? "image"
    : containsAny(normalized, ["code-generation", "code"]) ? "code"
      : containsAny(normalized, ["agent-task", "agent"]) ? "agent"
        : containsAny(normalized, ["analysis"]) ? "analysis"
          : fallback.taskType;

  return {
    ...fallback,
    taskType,
    intent: taskType,
    requiredCapabilities: containsAny(normalized, ["text-generation", "image-generation", "code-generation", "analysis", "image-understanding", "agent-task"])
      ? defaultCapabilityForTask(taskType)
      : fallback.requiredCapabilities,
    decision: "Nano output contained JSON-like hints; fallback fields constrained the final decision",
  };
}

function result(
  input: NanoConstrainedDecisionDecodeInput,
  decision: DecisionObject,
  source: DecodeSource,
  params: {
    rawStartedWithJson: boolean;
    rawContainedJsonHints: boolean;
    usedRouterFallback: boolean;
    repaired: boolean;
    reasonCode?: string;
  }
): NanoConstrainedDecisionDecodeResult {
  return {
    success: true,
    decision,
    source,
    diagnostics: {
      ...params,
      rawPreview: preview(input.rawNanoOutput),
    },
  };
}

export function decodeNanoConstrainedDecision(
  input: NanoConstrainedDecisionDecodeInput
): NanoConstrainedDecisionDecodeResult {
  const raw = input.rawNanoOutput.trim();
  const fallback = fallbackDecision(input);
  const rawStartedWithJson = raw.startsWith("{");
  const rawContainedJsonHints = containsAny(raw.toLocaleLowerCase("tr-TR"), [
    "{",
    "}",
    "tasktype",
    "contenttype",
    "outputtype",
    "domain",
    "requiredcapabilities",
    "decision",
    "content",
    "null",
  ]);
  const parsed = parseJsonObject(raw);

  if (parsed) {
    const parsedDecision = buildDecisionFromObject(parsed, fallback);
    return result(input, parsedDecision.decision, "nano-json", {
      rawStartedWithJson,
      rawContainedJsonHints,
      usedRouterFallback: parsedDecision.repaired,
      repaired: parsedDecision.repaired,
      reasonCode: parsedDecision.valid ? undefined : "NANO_JSON_REPAIRED_WITH_FALLBACK",
    });
  }

  const hinted = inferFromNanoHints(raw, fallback);
  if (hinted) {
    return result(input, hinted, "nano-assisted", {
      rawStartedWithJson,
      rawContainedJsonHints,
      usedRouterFallback: true,
      repaired: true,
      reasonCode: "NANO_HINTS_WITH_ROUTER_CONSTRAINTS",
    });
  }

  return result(input, fallback, "router-fallback", {
    rawStartedWithJson,
    rawContainedJsonHints,
    usedRouterFallback: true,
    repaired: true,
    reasonCode: "NANO_OUTPUT_NOT_JSON",
  });
}
