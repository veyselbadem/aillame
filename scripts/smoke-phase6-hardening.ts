import * as fs from "fs";
import * as path from "path";

async function runPhase6HardeningSmoke() {
  console.log("Running Phase 6 Hardening Audit...");

  const results = { success: true, checks: [] as any[] };

  const addCheck = (name: string, ok: boolean, detail: string) => {
    results.checks.push({ name, ok, detail });
    if (!ok) results.success = false;
  };

  try {
    const requiredFiles = [
      'src/core/agent/memory/service.ts',
      'src/core/product-health/service.ts',
      'src/app/api/admin/product-health/route.ts',
      'src/app/api/admin/agent/memory/learn/route.ts'
    ];

    for (const file of requiredFiles) {
      addCheck(`Source: ${file} exists`, fs.existsSync(path.join(process.cwd(), file)), `Missing ${file}`);
    }

    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf-8"));
    addCheck("Script: smoke:agent-memory", !!pkg.scripts["smoke:agent-memory"], "Missing script");
    addCheck("Script: smoke:product-health", !!pkg.scripts["smoke:product-health"], "Missing script");
    addCheck("Script: smoke:phase6-hardening", !!pkg.scripts["smoke:phase6-hardening"], "Missing script");

    // UI Integrity
    const agentPage = fs.readFileSync(path.join(process.cwd(), "src/app/admin/agent/page.tsx"), "utf-8");
    addCheck("UI: Memory panel integrated", agentPage.includes("SON ÖĞRENME KARTLARI"), "Memory panel missing from Agent UI");
    addCheck("UI: Memory auto-learn", agentPage.includes("/api/admin/agent/memory/learn"), "Auto-learn logic missing from Agent UI");

    const dashboardPage = fs.readFileSync(path.join(process.cwd(), "src/app/admin/dashboard/page.tsx"), "utf-8");
    addCheck("UI: Dashboard use product-health", dashboardPage.includes("/api/admin/product-health"), "Dashboard not using new health API");

  } catch (error: any) {
    console.error("Phase 6 hardening smoke failed:", error.message);
    results.success = false;
  }

  console.log("\nPhase 6 Hardening Results:");
  console.log(JSON.stringify(results, null, 2));

  if (!results.success) process.exit(1);
}

runPhase6HardeningSmoke();
