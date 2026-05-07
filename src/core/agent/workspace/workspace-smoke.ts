import { analyzeWorkspaceReadOnly } from "./workspace-analyzer";

function runWorkspaceSmoke(): void {
  const result = analyzeWorkspaceReadOnly({
    rootPath: process.cwd(),
    maxDepth: 3,
    maxFiles: 300,
    includeHidden: false,
  });

  if (!result.scan.success) {
    console.error(`[FAIL] workspace scan failed: ${result.scan.errors.join(", ")}`);
    throw new Error("Workspace smoke failed.");
  }

  if (result.report.safety.readOnly !== true) {
    throw new Error("Workspace smoke failed: readOnly safety flag is not true.");
  }

  console.log(`[PASS] workspace projectType=${result.report.projectType}`);
  console.log(`[PASS] entries=${result.scan.files.length}, important=${result.scan.importantFiles.length}`);
  console.log(`[PASS] stack=${result.report.detectedStack.join(",") || "none"}`);
}

runWorkspaceSmoke();
