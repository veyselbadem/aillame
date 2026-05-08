import fs from "fs/promises";
import os from "os";
import path from "path";
import { AgentFileReader } from "../src/core/agent/file-reader/agent-file-reader";
import { PatchApplyEngine } from "../src/core/agent/safe-write/patch-apply-engine";
import { resolveContainedExistingPath } from "../src/core/agent/workspace-scanner/path-policy";
import type { PatchProposal } from "../src/core/agent/patch-proposal/types";

async function main() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "aillame-path-"));
  const outside = await fs.mkdtemp(path.join(os.tmpdir(), "aillame-outside-"));
  const results: Array<{ name: string; ok: boolean; detail?: string }> = [];
  const add = (name: string, ok: boolean, detail?: string) => results.push({ name, ok, detail });

  try {
    await fs.writeFile(path.join(root, "safe.ts"), "export const safe = true;\n");
    await fs.writeFile(path.join(outside, "secret.ts"), "export const secret = true;\n");

    add("Resolver allows workspace file", Boolean(resolveContainedExistingPath(root, "safe.ts")));
    add("Resolver blocks traversal", resolveContainedExistingPath(root, "../secret.ts") === null);
    add("Resolver blocks absolute path", resolveContainedExistingPath(root, path.join(outside, "secret.ts")) === null);

    const symlinkPath = path.join(root, "linked.ts");
    try {
      await fs.symlink(path.join(outside, "secret.ts"), symlinkPath);
      add("Resolver blocks symlink", resolveContainedExistingPath(root, "linked.ts") === null);
    } catch {
      add("Resolver blocks symlink", true, "Symlink creation unavailable on this system.");
    }

    const reader = new AgentFileReader();
    add("Reader reads safe file", Boolean(await reader.readFile(root, "safe.ts")));
    add("Reader blocks traversal", (await reader.readFile(root, "../secret.ts")) === null);

    const engine = new PatchApplyEngine();
    const proposal: PatchProposal = {
      success: true,
      mode: "proposal-only",
      readOnly: true,
      willModifyFiles: false,
      willRunCommands: false,
      requiresHumanApproval: true,
      riskSummary: { overallRisk: "low", reasons: [] },
      testSuggestions: [],
      changes: [{
        relativePath: "../secret.ts",
        changeType: "replace-block",
        title: "Traversal block fixture",
        rationale: "Verify containment blocks traversal.",
        beforeSnippet: "secret = true",
        afterSnippet: "secret = false",
        safetyNotes: [],
      }],
      safety: { warnings: [], blockedSensitiveFiles: [], skippedFiles: [], secretsRedacted: true, absolutePathsMasked: true },
      task: {
        original: "path containment",
        sanitized: "path containment",
        category: "test",
        intent: { category: "test", confidence: 1, riskLevel: "low" },
      },
      workspace: {
        safeRootName: "workspace",
        projectType: "test",
        detectedFrameworks: [],
        detectedLanguages: [],
      },
      targets: [],
      nextSteps: [],
    };
    const dryRun = await engine.apply({
      workspacePath: root,
      proposal,
      approval: { approved: true, approvalText: "Containment dry run" },
      options: { dryRun: true },
    });
    add("Safe write blocks traversal", dryRun.skippedChanges.some((item) => item.reason.includes("UNSAFE_PATH")));
  } finally {
    await fs.rm(root, { recursive: true, force: true });
    await fs.rm(outside, { recursive: true, force: true });
  }

  console.log("Agent Path Containment Results:");
  console.log(JSON.stringify({ success: results.every((item) => item.ok), results }, null, 2));
  if (results.some((item) => !item.ok)) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
