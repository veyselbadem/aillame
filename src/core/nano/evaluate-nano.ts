import { analyzeNanoTask } from "./task-analyzer";
import { NANO_EVAL_CASES } from "./eval-cases";

function runEval(): number {
  let failed = 0;

  for (const testCase of NANO_EVAL_CASES) {
    const analysis = analyzeNanoTask(testCase.prompt);
    const kindOk = analysis.kind === testCase.expectedKind;
    const reasoningOk = analysis.requiresStepByStepReasoning === testCase.shouldNeedReasoning;

    if (!kindOk || !reasoningOk) {
      failed += 1;
      console.error(
        `[FAIL] ${testCase.id}: kind=${analysis.kind}, reasoning=${analysis.requiresStepByStepReasoning}`
      );
    } else {
      console.log(`[PASS] ${testCase.id}`);
    }
  }

  return failed;
}

const failed = runEval();
if (failed > 0) {
  throw new Error(`${failed} nano eval case(s) failed.`);
}
