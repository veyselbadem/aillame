import path from 'path';
import fs from 'fs';
import { WorkspaceScanner } from '../src/core/agent/workspace-scanner/workspace-scanner';

async function runSmokeTest() {
  console.log("Running Workspace Scanner Core Smoke Tests (Serverless)...");

  const workspacePath = process.cwd(); // Scan current repo

  const results = {
    success: true,
    checks: [] as any[]
  };

  const addCheck = (name: string, ok: boolean, errorDetail: string) => {
    results.checks.push({ name, ok, detail: ok ? "PASS" : errorDetail });
    if (!ok) results.success = false;
  };

  try {
    const scanner = new WorkspaceScanner();

    // 1. Basic Scan Test
    console.log("- Testing workspace scan of Aillame repo...");
    const summary = await scanner.scan({
      workspacePath,
      maxDepth: 3
    });

    if (summary) {
      addCheck("Scanner execution", true, "No summary returned");
      addCheck("Safe Root Name", summary.safeRootName === "aillame", `Unexpected root name: ${summary.safeRootName}`);
      addCheck("Project Detection (Next.js)", summary.detectedFrameworks.includes("Next.js"), "Next.js not detected");
      addCheck("Language Detection (TypeScript)", summary.detectedLanguages.includes("TypeScript"), "TypeScript not detected");
      
      const hasPackageJson = summary.importantFiles.some(f => f.toLowerCase().includes("package.json"));
      addCheck("Important Files found", hasPackageJson, "package.json missing in importantFiles");
      
      addCheck("Ignore node_modules", summary.ignoredCounts.directories > 0, "node_modules not ignored");
      
      const flatTreeNames = getFlatNames(summary.tree);
      const hasEnv = flatTreeNames.some(n => n.startsWith(".env"));
      addCheck("No .env in tree", !hasEnv, `.env file leaked into tree! Found in nodes.`);
    }

    // 2. Metadata Read Test
    console.log("- Testing safe metadata reading...");
    let pkgJson: string | null = null;
    try {
      pkgJson = await scanner.readSafeMetadata(workspacePath, "package.json");
    } catch (e: any) {
      console.log(`DEBUG: package.json read error: ${e.message}`);
    }
    
    const pkgOk = pkgJson !== null && pkgJson.toLowerCase().includes('"name":');
    addCheck("Read package.json", pkgOk, `Failed to read package.json. Content null? ${pkgJson === null}`);

    let envFile: string | null = null;
    try {
      envFile = await scanner.readSafeMetadata(workspacePath, ".env");
    } catch (e: any) {
      // Expected to fail with DEBUG_INFO or return null
    }
    addCheck("Read .env (Should block)", envFile === null, "SECURITY_FAILURE: Allowed reading .env content!");

    // 3. Path Traversal Test
    console.log("- Testing path traversal safety logic...");
    try {
      await scanner.scan({
        workspacePath: workspacePath + "/../../secret_danger_test"
      });
      addCheck("Path Traversal Safety", false, "Allowed path with .. symbols!");
    } catch (err: any) {
      const isUnsafe = err.message.includes("UNSAFE_PATH");
      addCheck("Path Traversal Safety", isUnsafe, `Blocked but wrong error: ${err.message}`);
    }

  } catch (error: any) {
    console.error("General Error in smoke test execution:", error.message);
    results.success = false;
    results.checks.push({ name: "General Error", ok: false, detail: error.message });
  }

  console.log("\nFinal Results:");
  console.log(JSON.stringify(results, null, 2));

  if (!results.success) {
    process.exit(1);
  }
}

function getFlatNames(nodes: any[]): string[] {
  const names: string[] = [];
  for (const node of nodes) {
    names.push(node.name);
    if (node.children) names.push(...getFlatNames(node.children));
  }
  return names;
}

runSmokeTest();
