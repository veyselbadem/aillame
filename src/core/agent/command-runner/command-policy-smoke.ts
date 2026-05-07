import { planCommandDryRun } from "./command-plan";
import { summarizeCommandPlan } from "./command-report";

const safePlan = planCommandDryRun({
  command: "node node_modules/typescript/bin/tsc --noEmit",
  projectType: "node",
});

if (!safePlan.success || safePlan.willExecute !== false || safePlan.safety.category !== "typecheck" || safePlan.safety.risk !== "safe") {
  console.error(safePlan);
  throw new Error("Safe command policy smoke failed.");
}

const blockedPlan = planCommandDryRun({
  command: "rm -rf dist",
  projectType: "node",
});

if (blockedPlan.safety.risk !== "blocked" || blockedPlan.safety.blockedReasons.length === 0) {
  console.error(blockedPlan);
  throw new Error("Blocked command policy smoke failed.");
}

console.log(`[PASS] ${summarizeCommandPlan(safePlan)}`);
console.log(`[PASS] blocked risk=${blockedPlan.safety.risk}, reasons=${blockedPlan.safety.blockedReasons.length}`);
