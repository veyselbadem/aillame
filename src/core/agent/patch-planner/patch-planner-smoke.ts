import { analyzeProblemReadOnly } from "../problem/problem-analyzer";
import type { AillameWorkspaceAnalysisReport } from "../workspace/workspace-types";
import { planPatchReadOnly } from "./patch-planner";

const workspaceReport: AillameWorkspaceAnalysisReport = {
  success: true,
  projectType: "node",
  summary: "Smoke workspace report.",
  detectedStack: ["node", "typescript"],
  importantFiles: ["package.json", "tsconfig.json"],
  possibleIssues: [],
  recommendedNextChecks: ["Inspect package scripts.", "Inspect TypeScript config."],
  safety: {
    readOnly: true,
    rootRestricted: true,
    skippedSensitiveFiles: [],
  },
};

const problemAnalysis = analyzeProblemReadOnly({
  projectType: "node",
  logText: "src/app.ts(1,1): error TS2307: Cannot find module './missing'.",
});

const plan = planPatchReadOnly({
  userGoal: "Plan a safe fix for the TypeScript module error",
  workspaceReport,
  problemAnalysis,
  constraints: {
    readOnly: true,
    allowFileWrites: false,
    allowCommandRun: false,
  },
});

if (!plan.success || plan.mode !== "plan-only" || plan.readOnly !== true || plan.targets.length === 0) {
  console.error(plan);
  throw new Error("Patch planner smoke failed.");
}

console.log(`[PASS] patch plan risk=${plan.risk}`);
console.log(`[PASS] targets=${plan.targets.length}`);
console.log(`[PASS] blockedActions=${plan.blockedActions.length}`);
