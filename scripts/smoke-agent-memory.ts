import { AgentMemoryService } from "../src/core/agent/memory/service";
import { MemoryPolicy } from "../src/core/agent/memory/memory-policy";
import { LearningCard } from "../src/core/agent/memory/types";
import * as fs from "fs";
import * as path from "path";

async function runMemorySmoke() {
  console.log("Running Agent Memory Smoke Tests...");

  const results = { success: true, checks: [] as any[] };

  const addCheck = (name: string, ok: boolean, detail: string) => {
    results.checks.push({ name, ok, detail });
    if (!ok) results.success = false;
  };

  try {
    // 1. Redaction Test
    const raw = "API_KEY=sk-12345 secret=password C:\\test.txt";
    const redacted = MemoryPolicy.redact(raw);
    addCheck("Redaction: API_KEY", redacted.includes("API_KEY: [REDACTED]"), "Failed to redact API_KEY");
    addCheck("Redaction: secret", redacted.includes("secret: [REDACTED]"), "Failed to redact secret");
    addCheck("Redaction: Absolute Path", redacted.includes("[LOCAL_PATH]"), "Failed to mask absolute path");

    // 2. Validation Test
    const card: LearningCard = {
      id: "test-id",
      createdAt: Date.now(),
      projectId: "test-project",
      safeRootName: "test-root",
      taskCategory: "test",
      taskSummary: "Testing memory policy with apiKey",
      outcome: "success",
      changedAreas: ["test"],
      appliedChangeTypes: ["test"],
      verificationSuggestions: ["test"],
      riskLevel: "low",
      lessons: ["test"],
      safetyNotes: ["test"],
      source: "manual-summary"
    };

    const validation = MemoryPolicy.validate(card);
    addCheck("Validation: Block sensitive in summary", !validation.valid, "Should have blocked card with apiKey in summary");

    // 3. Store Test
    const tempCard: LearningCard = { ...card, taskSummary: "Valid summary" };
    const saved = await AgentMemoryService.learnFromAudit({
      status: "verified",
      workspace: { safeRootName: "test-project" } as any,
      changedFiles: [{ relativePath: "src/test.ts", changeCount: 1, verified: true, verificationNotes: [] }] as any,
      riskReview: { riskAfter: "low", reasons: [] } as any,
      verificationPlan: { suggestedCommands: [] } as any,
      safety: { warnings: [] } as any,
      originalProposal: {} as any
    } as any, "Valid summary", "test-project");

    addCheck("Store: Save Card", saved, "Failed to save valid card");

    const cards = await AgentMemoryService.getRecentCards(1);
    addCheck("Store: Retrieve Card", cards.length > 0, "Failed to retrieve saved card");
    addCheck("Store: Outcome Match", cards[0].outcome === "success", "Retrieved card outcome mismatch");

    // 4. Git Hygiene
    const memoryFile = path.join(process.cwd(), ".aillame-data", "agent-memory", "learning-cards.jsonl");
    addCheck("Persistence: File exists", fs.existsSync(memoryFile), "Memory file not found on disk");

  } catch (error: any) {
    console.error("Memory smoke failed:", error.message);
    results.success = false;
    results.checks.push({ name: "General Error", ok: false, detail: error.message });
  }

  console.log("\nAgent Memory Results:");
  console.log(JSON.stringify(results, null, 2));

  if (!results.success) process.exit(1);
}

runMemorySmoke();
