import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

type Check = { name: string; ok: boolean; detail: string };

const root = process.cwd();
const checks: Check[] = [];

function addCheck(name: string, ok: boolean, detail: string) {
  checks.push({ name, ok, detail });
}

function read(relativePath: string): string {
  return fs.readFileSync(path.join(root, relativePath), "utf-8");
}

function exists(relativePath: string): boolean {
  return fs.existsSync(path.join(root, relativePath));
}

function trackedFiles(): string[] {
  return execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf-8" })
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function includesAll(source: string, needles: string[]): boolean {
  return needles.every((needle) => source.includes(needle));
}

function run() {
  console.log("Running Final Beta RC Static Audit...");

  const requiredDocs = [
    "docs/beta-release-candidate.md",
    "docs/local-setup.md",
    "docs/provider-integration-quickstart.md",
    "docs/agent-user-guide.md",
    "docs/final-security-checklist.md"
  ];

  for (const doc of requiredDocs) {
    addCheck(`Doc exists: ${doc}`, exists(doc), "Required final RC document is missing.");
  }

  const pkg = JSON.parse(read("package.json"));
  const requiredScripts = [
    "smoke:live-runtime-acceptance",
    "smoke:provider-api",
    "smoke:agent-beta-lock",
    "smoke:agent-memory",
    "smoke:product-health",
    "smoke:phase6-hardening",
    "smoke:final-rc"
  ];
  for (const script of requiredScripts) {
    addCheck(`Package script: ${script}`, Boolean(pkg.scripts?.[script]), "Critical smoke script is missing.");
  }

  addCheck("Product health service exists", exists("src/core/product-health/service.ts"), "Product health source is missing.");
  addCheck("Product health route exists", exists("src/app/api/admin/product-health/route.ts"), "Product health route is missing.");
  addCheck("Provider status route exists", exists("src/app/api/provider/v1/status/route.ts"), "Provider status route is missing.");
  addCheck("Provider models route exists", exists("src/app/api/provider/v1/models/route.ts"), "Provider models route is missing.");
  addCheck("Provider generate route exists", exists("src/app/api/provider/v1/generate/route.ts"), "Provider generate route is missing.");
  addCheck("Agent UI exists", exists("src/app/admin/agent/page.tsx"), "Agent UI is missing.");
  addCheck("Agent beta-lock doc exists", exists("docs/agent-beta-lock.md"), "Agent beta-lock doc is missing.");
  addCheck("Agent memory service exists", exists("src/core/agent/memory/service.ts"), "Agent memory service is missing.");
  addCheck("Agent memory routes exist", exists("src/app/api/admin/agent/memory/summary/route.ts") && exists("src/app/api/admin/agent/memory/learn/route.ts"), "Agent memory routes are missing.");

  const tracked = trackedFiles();
  const blockedTracked = tracked.filter((file) => {
    const normalized = file.toLowerCase();
    return normalized === ".env"
      || normalized.startsWith("igm-venv/")
      || normalized.startsWith(".aillame-data/")
      || normalized.endsWith(".gguf")
      || normalized.endsWith(".safetensors")
      || normalized.endsWith(".safetensors.old")
      || normalized.includes("learning-cards")
      || normalized.includes("agent-backups")
      || normalized.endsWith(".log");
  });
  addCheck("Artifact hygiene: blocked runtime files are untracked", blockedTracked.length === 0, blockedTracked.join(", ") || "Clean.");

  const finalDocs = requiredDocs.map((doc) => read(doc)).join("\n");
  const secretPatterns = [
    /sk-[a-z0-9_-]{8,}/i,
    /AIza[0-9A-Za-z_-]{10,}/,
    /AILLAME_(?:ADMIN_TOKEN|API_KEY)\s*=\s*(?!YOUR_AILLAME_API_KEY)[^\s]+/i,
    /Bearer\s+(?!YOUR_AILLAME_API_KEY)[A-Za-z0-9._-]{12,}/i
  ];
  addCheck("Final docs: no real API key pattern", !secretPatterns.some((pattern) => pattern.test(finalDocs)), "Potential real secret pattern found.");
  addCheck("Final docs: no absolute Windows path", !/[A-Za-z]:\\/.test(finalDocs), "Absolute Windows path found.");
  addCheck("Final docs: no persisted memory or backup data filenames", !/learning-cards\.jsonl|agent-backups|backup data/i.test(finalDocs), "Persisted memory or backup data filename found.");

  const agentUi = read("src/app/admin/agent/page.tsx");
  addCheck("Agent apply UI: approval text kept", includesAll(agentUi, ["approvalText", "!approvalText"]), "Approval text guard is missing.");
  addCheck("Agent apply UI: dry-run gate kept", agentUi.includes("isDryRunDone"), "Dry-run gate is missing.");
  addCheck("Agent UI: no terminal execution button", !agentUi.includes("runTerminal") && !agentUi.includes("execCommand"), "Terminal execution UI marker found.");

  const verifier = read("src/core/agent/execution-audit/verification-plan-builder.ts");
  addCheck("Suggested commands: autoRun=false kept", (verifier.match(/autoRun:\s*false/g) || []).length >= 3, "Suggested command autoRun=false policy weakened.");

  const healthSource = read("src/core/product-health/service.ts");
  addCheck("Product health: RC status present", includesAll(healthSource, ["Beta RC Ready", "artifactHygiene", "finalSmoke"]), "RC status markers are missing.");
  addCheck("Artifact hygiene: .safetensors.old ignored", read(".gitignore").includes("*.safetensors.old"), ".safetensors.old ignore guard is missing.");
  addCheck("Image preview: no absolute path query", !read("src/app/admin/image-assets/page.tsx").includes("view?path=") && !read("src/app/admin/ai-lab/page.tsx").includes("view?path="), "Unsafe image preview path query remains.");

  console.log("\nFinal RC Smoke Results:");
  console.log(JSON.stringify({ success: checks.every((check) => check.ok), checks }, null, 2));

  if (checks.some((check) => !check.ok)) process.exit(1);
}

run();
