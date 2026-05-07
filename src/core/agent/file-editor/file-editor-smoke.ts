import { buildFileDiffPlan } from "./file-diff-plan";
import { getFileEditReviewChecklist, summarizeFileEditPlan } from "./file-edit-report";

const plan = buildFileDiffPlan({
  rootPath: process.cwd(),
  relativePath: "src/example.ts",
  operation: "replace-text",
  description: "Replace a placeholder value in dry-run mode.",
  beforeText: "const value = 'old';",
  afterText: "const value = 'new';",
});

if (!plan.success || plan.mode !== "dry-run" || plan.policy.allowed !== false || plan.policy.dryRunOnly !== true) {
  console.error(plan);
  throw new Error("File editor smoke failed.");
}

const blockedPlan = buildFileDiffPlan({
  rootPath: process.cwd(),
  relativePath: ".env",
  operation: "replace-text",
  description: "Attempt sensitive file edit.",
  beforeText: "TOKEN=old",
  afterText: "TOKEN=new",
});

if (blockedPlan.risk !== "blocked" || blockedPlan.policy.blockedReasons.length === 0) {
  console.error(blockedPlan);
  throw new Error("Sensitive file policy smoke failed.");
}

console.log(`[PASS] ${summarizeFileEditPlan(plan)}`);
console.log(`[PASS] checklist=${getFileEditReviewChecklist(plan).length}`);
console.log(`[PASS] sensitive blocked reasons=${blockedPlan.policy.blockedReasons.length}`);
