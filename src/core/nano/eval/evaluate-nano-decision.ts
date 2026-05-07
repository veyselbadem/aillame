import { routeAillameRequest } from "../../aillame-router/router";
import type { AillameRouteInput } from "../../aillame-router/types";
import { NANO_DECISION_EVAL_DATASET, type NanoDecisionEvalCase } from "./nano-decision-eval-dataset";

type DecisionEvalResult = {
  total: number;
  failed: number;
  accuracy: number;
};

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

function includesAll(actual: readonly string[], expected: readonly string[]): boolean {
  return expected.every((item) => actual.includes(item));
}

function matchesDomain(decision: ReturnType<typeof routeAillameRequest>, expectedDomain?: string): boolean {
  if (expectedDomain === undefined) return true;
  return decision.primaryMode === expectedDomain || decision.selectedModes.includes(expectedDomain as never);
}

function assertCase(testCase: NanoDecisionEvalCase): boolean {
  const decision = routeAillameRequest(routeInputForCase(testCase));
  const expected = testCase.expected;
  const checks = [
    decision.taskType === expected.taskType,
    decision.contentType === expected.contentType,
    decision.outputType === expected.outputType,
    includesAll(decision.capabilities, expected.requiredCapabilities),
    expected.shouldUseImageModel === undefined || decision.capabilities.includes("image-generation") === expected.shouldUseImageModel,
    expected.shouldUseAgent === undefined || decision.capabilities.includes("agent-task") === expected.shouldUseAgent,
    expected.shouldUseTextModel === undefined || (
      decision.capabilities.includes("text-generation")
      || decision.capabilities.includes("vision-image-understanding")
    ) === expected.shouldUseTextModel,
    matchesDomain(decision, expected.domain),
  ];

  const passed = checks.every(Boolean);
  if (passed) {
    console.log(`[PASS] ${testCase.id}`);
    return true;
  }

  console.error(
    `[FAIL] ${testCase.id}: task=${decision.taskType}, content=${decision.contentType}, output=${decision.outputType}, mode=${decision.primaryMode}, caps=${decision.capabilities.join("+")}`
  );
  console.error(
    `       expected: task=${expected.taskType}, content=${expected.contentType}, output=${expected.outputType}, mode=${expected.domain ?? "any"}, caps=${expected.requiredCapabilities.join("+")}`
  );
  return false;
}

export function runNanoDecisionEval(): DecisionEvalResult {
  const failed = NANO_DECISION_EVAL_DATASET.filter((testCase) => !assertCase(testCase)).length;
  const total = NANO_DECISION_EVAL_DATASET.length;
  const accuracy = Number(((total - failed) / total).toFixed(4));

  return { total, failed, accuracy };
}

const result = runNanoDecisionEval();
console.log(`[RESULT] decision eval accuracy=${result.accuracy} (${result.total - result.failed}/${result.total})`);

if (result.failed > 0) {
  throw new Error(`${result.failed} nano decision eval case(s) failed.`);
}
