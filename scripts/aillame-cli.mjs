#!/usr/bin/env node

/**
 * Aillame CLI Foundation - Productization Phase 5
 * Safe, read-only/plan-only CLI for managing local AI Hub.
 */

const args = process.argv.slice(2);
const command = args[0] || "status";

const config = {
  baseUrl: process.env.AILLAME_BASE_URL || "http://localhost:3000",
  timeoutMs: 5000,
  defaultMode: "safe"
};

async function checkHealth() {
  console.log("Checking Aillame Local AI Hub health...");
  try {
    // Graceful fallback if server is not reachable
    const fetchArgs = { signal: AbortSignal.timeout(config.timeoutMs) };
    const res = await fetch(`${config.baseUrl}/api/aillame/health`, fetchArgs).catch(() => null);
    if (!res) {
      console.log("Status: Aillame server is not reachable (or no health endpoint).");
      return;
    }
    const data = await res.json().catch(() => ({}));
    console.log("Server is running.", data);
  } catch (error) {
    console.log("Status: Aillame server is not reachable.");
  }
}

async function runCommand() {
  console.log(`[Aillame CLI] Running in ${config.defaultMode} mode.\n`);

  switch (command) {
    case "status":
    case "health":
      await checkHealth();
      break;
    case "projects":
      console.log("Listing projects (Plan-only preview)...");
      break;
    case "ask":
      console.log("Querying project (Plan-only preview)...");
      break;
    case "task":
      console.log("Task planning (Plan-only preview)...");
      break;
    case "diagnostics":
      console.log("Fetching diagnostics...");
      break;
    default:
      console.log(`Unknown command: ${command}`);
      console.log("Available commands: status, health, projects, ask, task, diagnostics");
  }
}

runCommand();
