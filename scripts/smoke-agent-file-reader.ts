import path from 'path';
import fs from 'fs';
import { AgentFileReader } from '../src/core/agent/file-reader/agent-file-reader';
import { SecretRedactor } from '../src/core/agent/file-reader/secret-redactor';
import { CodeStructureExtractor } from '../src/core/agent/file-reader/code-structure-extractor';
import { WorkspaceScanner } from '../src/core/agent/workspace-scanner/workspace-scanner';
import { WorkspaceContextBuilder } from '../src/core/agent/planner/workspace-context-builder';
import { TaskIntentDetector } from '../src/core/agent/planner/task-intent-detector';
import { AgentPlanBuilder } from '../src/core/agent/planner/agent-plan-builder';
import { DeepContextBuilder } from '../src/core/agent/file-reader/deep-context-builder';

async function runSmokeTest() {
  console.log("Running Agent File Reader Smoke Tests...");

  const workspacePath = process.cwd();
  const results = { success: true, checks: [] as any[] };

  const addCheck = (name: string, ok: boolean, detail: string) => {
    results.checks.push({ name, ok, detail });
    if (!ok) results.success = false;
  };

  try {
    const reader = new AgentFileReader();

    // 1. Safe File Read
    console.log("- Testing safe file reading...");
    const pkgJson = await reader.readFile(workspacePath, "package.json");
    addCheck("Read package.json", !!pkgJson, "Failed to read package.json");
    addCheck("Structure Extractor (Scripts)", (pkgJson?.structure.scripts.length ?? 0) > 0, "No scripts found in package.json");

    // 2. Security Blocks
    console.log("- Testing security blocks...");
    const envRead = await reader.readFile(workspacePath, ".env");
    addCheck("Block .env", envRead === null, "SECURITY_FAILURE: .env should be blocked");

    const nodeModulesRead = await reader.readFile(workspacePath, "node_modules/next/package.json");
    addCheck("Block node_modules", nodeModulesRead === null, "SECURITY_FAILURE: node_modules should be blocked");

    // 3. Secret Redaction
    console.log("- Testing secret redaction...");
    const redactor = new SecretRedactor();
    const testContent = 'const api_key = "sk-1234567890abcdef1234567890abcdef";';
    const redacted = redactor.redact(testContent);
    addCheck("Redaction worked", redacted.redacted && redacted.content.includes("[REDACTED]"), "Redactor failed to mask key");

    // 4. Structure Extraction (TS)
    console.log("- Testing code structure extraction...");
    const extractor = new CodeStructureExtractor();
    const tsCode = 'import x from "y"; export const MyComp = () => <div>Hi</div>; export async function GET() {}';
    const struct = extractor.extract(tsCode, ".tsx");
    addCheck("Extract Imports", struct.imports.length > 0, "Failed to extract imports");
    addCheck("Extract Components", struct.components.includes("MyComp"), "Failed to extract component MyComp");
    addCheck("Extract Routes", struct.routes.includes("GET"), "Failed to extract route GET");

    // 5. Deep Context Builder
    console.log("- Testing Deep Context Package generation...");
    const scanner = new WorkspaceScanner();
    const scanSummary = await scanner.scan({ workspacePath, maxDepth: 1 });
    const context = new WorkspaceContextBuilder().build(scanSummary);
    const intent = new TaskIntentDetector().detect("hata düzelt");
    const plan = new AgentPlanBuilder().build("hata düzelt", intent, context);

    const deepBuilder = new DeepContextBuilder();
    const deepPackage = await deepBuilder.build(plan, workspacePath);

    addCheck("Deep Package Success", deepPackage.success === true, "Deep package failed");
    addCheck("Deep Package ReadOnly", deepPackage.safety.readOnly === true, "Deep package readOnly mismatch");
    addCheck("Deep Package Selected Files", deepPackage.selectedFiles.length > 0, "No files selected in deep package");

  } catch (error: any) {
    console.error("Smoke test failed:", error.message);
    results.success = false;
    results.checks.push({ name: "General Error", ok: false, detail: error.message });
  }

  console.log("\nFinal Results:");
  console.log(JSON.stringify(results, null, 2));

  if (!results.success) process.exit(1);
}

runSmokeTest();
