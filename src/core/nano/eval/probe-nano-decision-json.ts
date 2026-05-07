import { routeAillameRequest } from "../../aillame-router/router";
import type { AillameRouteInput } from "../../aillame-router/types";
import { decodeNanoConstrainedDecision } from "../decision/nano-constrained-decision-decoder";
import { buildNanoDecisionPrompt } from "../decision/nano-decision-prompt";
import { AillameNanoController } from "../nano-controller";
import { NANO_DECISION_EVAL_DATASET, type NanoDecisionEvalCase } from "./nano-decision-eval-dataset";

type ParsedDecisionJson = {
  taskType?: unknown;
  contentType?: unknown;
  outputType?: unknown;
  domain?: unknown;
  requiredCapabilities?: unknown;
  decision?: unknown;
};

type ValidDecisionJson = {
  taskType: string;
  contentType: string;
  outputType: string;
  domain: string;
  requiredCapabilities: string[];
  decision: string;
};

type NanoDecisionJsonProbeResult = {
  total: number;
  parseable: number;
  schemaValid: number;
  exactMatches: number;
  usedLocalEngine: number;
  constrainedMatches: number;
  nanoJsonSources: number;
  nanoAssistedSources: number;
  routerFallbackSources: number;
};

const DEFAULT_PROBE_LIMIT = 3;
const DEFAULT_PROBE_MAX_TOKENS = 8;
const DEFAULT_PROBE_TEMPERATURE = 0.1;

function readProbeLimit(): number {
  const raw = process.env.AILLAME_NANO_DECISION_PROBE_LIMIT;
  if (!raw) return DEFAULT_PROBE_LIMIT;
  if (raw.toLocaleLowerCase("tr-TR") === "all") return NANO_DECISION_EVAL_DATASET.length;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return DEFAULT_PROBE_LIMIT;
  return Math.min(NANO_DECISION_EVAL_DATASET.length, Math.max(1, Math.trunc(parsed)));
}

function readNumberEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function routeInputForCase(testCase: NanoDecisionEvalCase): AillameRouteInput {
  const input: AillameRouteInput = {
    prompt: testCase.prompt,
    projectId: testCase.projectId,
  };

  if (testCase.id === "explicit-image") {
    input.taskType = "image";
    input.outputType = "image";
  }

  if (testCase.id === "explicit-text" || testCase.id === "image-negative-text") {
    input.taskType = "text";
    input.outputType = "text";
  }

  if (testCase.id === "explicit-agent-patch") {
    input.taskType = "agent";
    input.outputType = "patch";
  }

  if (testCase.id === "json-output-explicit") {
    input.taskType = "analysis";
    input.outputType = "json";
  }

  return input;
}

function extractJsonCandidate(content: string): string | undefined {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  return content.slice(start, end + 1);
}

function parseDecisionJson(content: string): ParsedDecisionJson | undefined {
  const candidate = extractJsonCandidate(content);
  if (!candidate) return undefined;

  try {
    const parsed = JSON.parse(candidate);
    return typeof parsed === "object" && parsed !== null ? parsed as ParsedDecisionJson : undefined;
  } catch {
    return undefined;
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function hasRequiredSchema(parsed: ParsedDecisionJson): parsed is ValidDecisionJson {
  return (
    typeof parsed.taskType === "string"
    && typeof parsed.contentType === "string"
    && typeof parsed.outputType === "string"
    && typeof parsed.domain === "string"
    && isStringArray(parsed.requiredCapabilities)
    && typeof parsed.decision === "string"
  );
}

function includesAll(actual: readonly string[], expected: readonly string[]): boolean {
  return expected.every((item) => actual.includes(item));
}

function matchesExpected(parsed: ParsedDecisionJson, testCase: NanoDecisionEvalCase): boolean {
  if (!hasRequiredSchema(parsed)) return false;
  const expected = testCase.expected;
  return (
    parsed.taskType === expected.taskType
    && parsed.contentType === expected.contentType
    && parsed.outputType === expected.outputType
    && parsed.domain === (expected.domain ?? "general")
    && includesAll(parsed.requiredCapabilities, expected.requiredCapabilities)
  );
}

function decisionMatchesExpected(
  decision: {
    taskType: string;
    contentType: string;
    outputType: string;
    domain: string;
    requiredCapabilities: string[];
  },
  testCase: NanoDecisionEvalCase
): boolean {
  const expected = testCase.expected;
  return (
    decision.taskType === expected.taskType
    && decision.contentType === expected.contentType
    && decision.outputType === expected.outputType
    && decision.domain === (expected.domain ?? "general")
    && includesAll(decision.requiredCapabilities, expected.requiredCapabilities)
  );
}

function shorten(content: string): string {
  return content.replace(/\s+/g, " ").trim().slice(0, 120);
}

export async function runNanoDecisionJsonProbe(): Promise<NanoDecisionJsonProbeResult> {
  const controller = new AillameNanoController();
  const cases = NANO_DECISION_EVAL_DATASET.slice(0, readProbeLimit());
  const maxTokens = Math.trunc(readNumberEnv(
    "AILLAME_NANO_DECISION_PROBE_MAX_TOKENS",
    DEFAULT_PROBE_MAX_TOKENS,
    1,
    256
  ));
  const temperature = readNumberEnv(
    "AILLAME_NANO_DECISION_PROBE_TEMPERATURE",
    DEFAULT_PROBE_TEMPERATURE,
    0,
    2
  );
  const result: NanoDecisionJsonProbeResult = {
    total: cases.length,
    parseable: 0,
    schemaValid: 0,
    exactMatches: 0,
    usedLocalEngine: 0,
    constrainedMatches: 0,
    nanoJsonSources: 0,
    nanoAssistedSources: 0,
    routerFallbackSources: 0,
  };

  for (const testCase of cases) {
    const prompt = buildNanoDecisionPrompt({
      prompt: testCase.prompt,
      projectId: testCase.projectId,
      mode: testCase.mode,
    });
    const answer = await controller.answer({
      prompt,
      maxTokens,
      temperature,
    });
    const rawContent = answer.rawContent ?? answer.content;
    const parsed = parseDecisionJson(rawContent);
    const parseable = Boolean(parsed);
    const schemaValid = parsed ? hasRequiredSchema(parsed) : false;
    const exactMatch = parsed ? matchesExpected(parsed, testCase) : false;
    const route = routeAillameRequest(routeInputForCase(testCase));
    const constrained = decodeNanoConstrainedDecision({
      prompt: testCase.prompt,
      projectId: testCase.projectId,
      mode: testCase.mode,
      rawNanoOutput: rawContent,
      routerFallback: {
        taskType: route.taskType,
        contentType: route.contentType,
        outputType: route.outputType,
        domain: route.primaryMode,
        requiredCapabilities: route.capabilities,
      },
    });
    const constrainedMatch = decisionMatchesExpected(constrained.decision, testCase);

    if (answer.usedLocalEngine) result.usedLocalEngine += 1;
    if (parseable) result.parseable += 1;
    if (schemaValid) result.schemaValid += 1;
    if (exactMatch) result.exactMatches += 1;
    if (constrainedMatch) result.constrainedMatches += 1;
    if (constrained.source === "nano-json") result.nanoJsonSources += 1;
    if (constrained.source === "nano-assisted") result.nanoAssistedSources += 1;
    if (constrained.source === "router-fallback") result.routerFallbackSources += 1;

    console.log(
      `[PROBE] ${testCase.id}: local=${answer.usedLocalEngine} parseable=${parseable} schema=${schemaValid} match=${exactMatch} constrained=${constrainedMatch} source=${constrained.source} tokens=${answer.engineDebug?.generatedTokenCount ?? 0}`
    );

    if (!parseable || !schemaValid || !exactMatch || !constrainedMatch) {
      console.log(`        raw="${shorten(rawContent)}"`);
      console.log(
        `        constrained=${JSON.stringify(constrained.decision)} reason=${constrained.diagnostics.reasonCode ?? "OK"}`
      );
      if (answer.warnings.length > 0) {
        console.log(`        warnings=${answer.warnings.join(", ")}`);
      }
    }
  }

  console.log(
    `[RESULT] decision-json probe total=${result.total} local=${result.usedLocalEngine}/${result.total} parseable=${result.parseable}/${result.total} schema=${result.schemaValid}/${result.total} exact=${result.exactMatches}/${result.total}`
  );
  console.log(
    `[RESULT] constrained-decision match=${result.constrainedMatches}/${result.total} sources=nano-json:${result.nanoJsonSources},nano-assisted:${result.nanoAssistedSources},router-fallback:${result.routerFallbackSources}`
  );

  return result;
}

runNanoDecisionJsonProbe().catch((error) => {
  const message = error instanceof Error ? error.message : "Unknown nano decision JSON probe error.";
  console.error(`[ERROR] ${message}`);
  throw error;
});
