import { ProductHealthService } from "../src/core/product-health/service";

async function runHealthSmoke() {
  console.log("Running Product Health Smoke Tests...");

  const results = { success: true, checks: [] as any[] };

  const addCheck = (name: string, ok: boolean, detail: string) => {
    results.checks.push({ name, ok, detail });
    if (!ok) results.success = false;
  };

  try {
    const health = await ProductHealthService.getHealth();
    
    addCheck("Health: Overall Status exists", !!health.overall, "Overall status missing");
    addCheck("Health: LLM Component", !!health.components.llm, "LLM component missing");
    addCheck("Health: IGM Component", !!health.components.igm, "IGM component missing");
    addCheck("Health: Agent Component", !!health.components.agent, "Agent component missing");
    addCheck("Health: Memory Component", !!health.components.memory, "Memory component missing");
    addCheck("Health: Storage Component", !!health.components.storage, "Storage component missing");

    // Security check
    const raw = JSON.stringify(health);
    addCheck("Security: No API Key in report", !raw.includes("AILLAME_ADMIN_TOKEN"), "Secret token leaked in health report");
    addCheck("Security: No Absolute Path in report", !raw.includes("C:\\Users\\"), "Absolute path leaked in health report");

    console.log("\nProduct Health Report Preview:");
    console.log(`Overall: ${health.overall}`);
    console.log(`LLM: ${health.components.llm.status}`);
    console.log(`IGM: ${health.components.igm.status}`);
    console.log(`Memory: ${health.components.memory.status} (${health.components.memory.details?.cardCount} cards)`);

  } catch (error: any) {
    console.error("Health smoke failed:", error.message);
    results.success = false;
    results.checks.push({ name: "General Error", ok: false, detail: error.message });
  }

  console.log("\nProduct Health Results:");
  console.log(JSON.stringify(results, null, 2));

  if (!results.success) process.exit(1);
}

runHealthSmoke();
