import { createLearningMemoryStore } from "../../memory/learning/learning-memory-store";
import { runDiagnosticWorkflowReadOnly } from "./diagnostic-workflow";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function getCurrentWorkingDirectory(): string {
  return typeof process !== "undefined" && typeof process.cwd === "function" ? process.cwd() : ".";
}

async function main(): Promise<void> {
  const memoryStore = createLearningMemoryStore();
  memoryStore.create({
    projectId: "aillame-smoke",
    source: "problem-analysis",
    category: "typescript",
    title: "Missing module during typecheck",
    summary: "A TypeScript module-resolution error was previously fixed by checking import paths and generated files.",
    problemSignature: "TS2307 Cannot find module",
    errorPatterns: ["TS2307", "Cannot find module"],
    likelyCauses: ["Wrong import path", "Missing generated file"],
    recommendedFixes: ["Check the import path first.", "Confirm the target file exists before editing."],
    relatedFiles: ["src/core/example.ts"],
    commandsToTry: ["node node_modules/typescript/bin/tsc --noEmit"],
    commandsToAvoid: ["npm install"],
    safetyNotes: ["Keep the first pass read-only."],
    outcome: "success",
    confidence: 0.82,
    tags: ["typescript", "module-resolution"],
  });

  const result = runDiagnosticWorkflowReadOnly({
    projectId: "aillame-smoke",
    rootPath: getCurrentWorkingDirectory(),
    userMessage: "Klasoru ve hata logunu incele, riskli dosyalari ve guvenli kontrolleri raporla.",
    logText: "src/app.ts:1:20 - error TS2307: Cannot find module './missing-module' or its corresponding type declarations.",
    command: "node node_modules/typescript/bin/tsc --noEmit",
    includeWorkspaceScan: true,
    includeMemoryRecall: true,
    includePatchPlan: true,
    includeCommandPlan: true,
  }, { memoryStore });

  assert(result.success, "Diagnostic workflow should succeed");
  assert(result.mode === "read-only-diagnostic", "Workflow must stay read-only diagnostic");
  assert(result.diagnostics.workspaceScanned, "Workspace should be scanned");
  assert(result.diagnostics.problemAnalyzed, "Problem should be analyzed");
  assert(result.diagnostics.memorySearched, "Memory should be searched");
  assert(result.diagnostics.patchPlanned, "Patch plan should be produced");
  assert(result.diagnostics.commandPlanned, "Command plan should be produced");
  assert(result.workspace?.safety.readOnly === true, "Workspace report must be read-only");
  assert(result.problem?.readOnly === true, "Problem analysis must be read-only");
  assert(result.patchPlan?.mode === "plan-only", "Patch planner must be plan-only");
  assert(result.commandPlan?.willExecute === false, "Command plan must not execute");
  assert((result.memoryRecall?.total ?? 0) >= 1, "Learning memory should recall seeded item");
  assert(result.blockedActions.includes("Terminal command execution"), "Terminal execution must be blocked");

  console.log(JSON.stringify({
    success: result.success,
    mode: result.mode,
    projectType: result.workspace?.projectType,
    problemCategory: result.problem?.category,
    memoryMatches: result.memoryRecall?.total,
    patchRisk: result.patchPlan?.risk,
    commandRisk: result.commandPlan?.safety.risk,
    commandWillExecute: result.commandPlan?.willExecute,
    recommendations: result.finalRecommendations.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  throw error;
});
