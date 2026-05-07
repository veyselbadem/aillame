import { NANO_DECISION_EVAL_DATASET } from "../nano/eval/nano-decision-eval-dataset";
import { decideAillameHybrid } from "./hybrid-decision-engine";

function includesAll(actual: readonly string[], expected: readonly string[]): boolean {
  return expected.every((item) => actual.includes(item));
}

function readLimit(): number {
  const raw = process.env.AILLAME_HYBRID_DECISION_SMOKE_LIMIT;
  if (!raw) return 1;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(NANO_DECISION_EVAL_DATASET.length, Math.max(1, Math.trunc(parsed)));
}

async function runHybridDecisionSmoke(): Promise<void> {
  const cases = NANO_DECISION_EVAL_DATASET.slice(0, readLimit());
  let failed = 0;

  for (const testCase of cases) {
    const decision = await decideAillameHybrid({
      prompt: testCase.prompt,
      projectId: testCase.projectId,
      mode: testCase.mode,
    });
    const expected = testCase.expected;
    const passed = (
      decision.finalDecision.taskType === expected.taskType
      && decision.finalDecision.contentType === expected.contentType
      && decision.finalDecision.outputType === expected.outputType
      && decision.finalDecision.domain === (expected.domain ?? "general")
      && includesAll(decision.finalDecision.requiredCapabilities, expected.requiredCapabilities)
    );

    if (passed) {
      console.log(`[PASS] ${testCase.id}: source=${decision.diagnostics.constrainedSource}`);
    } else {
      failed += 1;
      console.error(
        `[FAIL] ${testCase.id}: task=${decision.finalDecision.taskType}, content=${decision.finalDecision.contentType}, output=${decision.finalDecision.outputType}, domain=${decision.finalDecision.domain}`
      );
    }
  }

  console.log(`[RESULT] hybrid decision smoke ${cases.length - failed}/${cases.length}`);
  if (failed > 0) {
    throw new Error(`${failed} hybrid decision smoke case(s) failed.`);
  }

  const preferredUnavailable = await decideAillameHybrid({
    prompt: "Merhaba, kisa cevap ver",
    taskType: "chat",
    preferredModelId: "local-text-external",
    metadata: {
      disableNanoDecision: true,
    },
  });

  if (
    preferredUnavailable.finalDecision.selectedModelId !== "aillame-nano"
    || preferredUnavailable.diagnostics.modelAvailability?.preferredRejectReason !== "RUNTIME_NOT_LINKED"
  ) {
    throw new Error(
      `Availability-aware selection failed: selected=${preferredUnavailable.finalDecision.selectedModelId}, reason=${preferredUnavailable.diagnostics.modelAvailability?.preferredRejectReason}`
    );
  }

  console.log(
    `[PASS] preferred-unavailable: selected=${preferredUnavailable.finalDecision.selectedModelId}, rejected=${preferredUnavailable.diagnostics.modelAvailability.preferredRejectReason}`
  );
}

runHybridDecisionSmoke().catch((error) => {
  console.error(error);
  throw error;
});
