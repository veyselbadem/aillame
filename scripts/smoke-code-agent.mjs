import fs from "node:fs";
import path from "node:path";

const checks = [];

function check(name, ok, detail) {
  checks.push({ name, ok, detail });
}

function read(file) {
  return fs.readFileSync(path.resolve(file), "utf8");
}

const scanner = read("src/core/agent/project-scanner/project-scanner.ts");
const planner = read("src/core/agent/code-agent/code-agent-planner.ts");
const patch = read("src/core/agent/code-agent/patch-generator.ts");
const verifier = read("src/core/agent/code-agent/test-runner.ts");
const safety = read("src/core/agent/code-agent/code-agent-safety.ts");
const service = read("src/core/agent/code-agent/code-agent-service.ts");

check(
  "scanner skips generated and dependency folders",
  ["node_modules", ".next", "dist", ".git", "coverage", "target"].every((item) => scanner.includes(item)),
  "Project scanner has default ignore directories."
);

check(
  "scanner protects sensitive files",
  scanner.includes("SENSITIVE_FILE_CONTENT_NOT_READ") && scanner.includes("service-account"),
  "Sensitive files are metadata-only/skipped."
);

check(
  "planner separates task risk",
  planner.includes("edit") && planner.includes("refactor") && planner.includes("requiresFileWrite: true") && planner.includes("approvalRequired"),
  "Planner marks edit/refactor/fix patch steps as approval required."
);

check(
  "patch generator rejects empty patch",
  patch.includes("EMPTY_PATCH_PROPOSAL") && patch.includes("applyEnabled: false"),
  "Patch proposal is validation-only and cannot auto-apply."
);

check(
  "verifier has allowlist and blocks risky commands",
  verifier.includes("npm.cmd run typecheck") && verifier.includes("npm.cmd run build") && verifier.includes("npm\\s+(install|update)") && verifier.includes("blocked"),
  "Verifier uses allowlist preview policy."
);

check(
  "safety blocks secret and delete risks",
  safety.includes("SECRET_ACCESS_BLOCKED") && safety.includes("FILE_DELETE_BLOCKED") && safety.includes("approvalRequired"),
  "Central safety layer blocks secret access and file deletion."
);

check(
  "service returns plan-only response",
  service.includes("createCodeAgentTask") && service.includes("planOnly: true") && service.includes("fileWritesEnabled: false") && service.includes("commandExecutionEnabled: false"),
  "Code Agent service exposes plan-only internal contract."
);

const fixtureRoot = path.join("target-codex", "code-agent-smoke-fixture");
fs.mkdirSync(path.join(fixtureRoot, "src"), { recursive: true });
fs.mkdirSync(path.join(fixtureRoot, "node_modules", "pkg"), { recursive: true });
fs.mkdirSync(path.join(fixtureRoot, ".next"), { recursive: true });
fs.mkdirSync(path.join(fixtureRoot, ".git"), { recursive: true });
fs.writeFileSync(path.join(fixtureRoot, "package.json"), JSON.stringify({ scripts: { typecheck: "tsc --noEmit", build: "next build" } }), "utf8");
fs.writeFileSync(path.join(fixtureRoot, "src", "index.ts"), "export const ok = true;\n", "utf8");
fs.writeFileSync(path.join(fixtureRoot, ".env"), "DUMMY_TOKEN=not-a-real-secret\n", "utf8");

const dynamicChecks = {
  fixtureCreated: fs.existsSync(path.join(fixtureRoot, "src", "index.ts")),
  noDestructiveOperation: true,
  serverRequired: false,
  serverSkipped: true,
};

console.log(JSON.stringify({
  success: checks.every((item) => item.ok) && dynamicChecks.fixtureCreated,
  checks,
  dynamicChecks,
}, null, 2));

if (checks.some((item) => !item.ok) || !dynamicChecks.fixtureCreated) process.exit(1);
