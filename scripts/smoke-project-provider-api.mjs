import fs from "node:fs";
import path from "node:path";

const checks = [];
function read(file) {
  return fs.readFileSync(path.resolve(file), "utf8");
}
function check(name, ok, detail) {
  checks.push({ name, ok, detail });
}

const identity = read("src/core/projects/project-identity.ts");
const memoryStore = read("src/core/memory/project-memory-store.ts");
const externalHandler = read("src/core/external-provider/handler.ts");
const sdk = read("src/core/sdk/aillame-client.ts");
const sdkTypes = read("src/core/sdk/types.ts");
const nanoDecision = read("src/core/nano/decision/nano-constrained-decision-decoder.ts");
const validator = read("scripts/validate-nano-data.mjs");
const externalTasks = read("src/core/external-provider/handler.ts");

check(
  "projectId normalization is present",
  identity.includes("normalizeProjectId") && identity.includes("replace(/\\s+/g, \"-\")") && identity.includes("SAFE_PROJECT_ID"),
  "Project identity layer normalizes and validates safe ids."
);

check(
  "known project presets are centralized",
  ["boss-ai", "doomsgame-engine", "badem-akademi", "aillame", "general"].every((projectId) => identity.includes(projectId)),
  "All required presets exist in project-identity."
);

check(
  "project memory isolation guard exists",
  memoryStore.includes("entry.projectId === input.identity.projectId") && memoryStore.includes("includeGlobal"),
  "Project memory reads are scoped by project unless global is explicit."
);

check(
  "sensitive memory guard exists",
  memoryStore.includes("SENSITIVE_PATTERNS") && memoryStore.includes("SENSITIVE_CONTENT_BLOCKED"),
  "Memory writes block secret/key/token-like content."
);

check(
  "external API validates identity and returns structured errors",
  externalHandler.includes("normalizeProjectIdentity") && externalHandler.includes("ExternalProviderHttpResponse") && identity.includes("INVALID_PROJECT_ID"),
  "External provider core handler uses structured success/error bodies."
);

check(
  "external runtime status contract exists",
  fs.existsSync(path.resolve("src/app/api/external/v1/runtime/status/route.ts")) && externalHandler.includes("handleExternalProviderRuntimeStatus"),
  "Runtime status endpoint wrapper exists."
);

check(
  "external chat route exists",
  fs.existsSync(path.resolve("src/app/api/external/v1/chat/route.ts")) && fs.existsSync(path.resolve("src/app/api/external/v1/projects/[projectId]/chat/route.ts")),
  "Both general and project-specific chat endpoints exist."
);

check(
  "SDK client skeleton imports and methods exist",
  sdk.includes("class AillameClient") && ["chat(", "task(", "status(", "listProjects(", "readMemory(", "writeMemory("].every((part) => sdk.includes(part)) && sdkTypes.includes("AillameClientOptions"),
  "Internal TypeScript SDK exposes required client methods."
);

check(
  "Nano project-aware advisory metadata exists",
  nanoDecision.includes("needsMemory") && nanoDecision.includes("memoryScope") && nanoDecision.includes("autonomousActionsEnabled: false"),
  "Nano decisions can carry project/memory/runtime signals without autonomous actions."
);

check(
  "project-aware dataset examples exist",
  ["aillame-examples.jsonl", "boss-ai-examples.jsonl", "doomsgame-engine-examples.jsonl", "badem-akademi-examples.jsonl"].every((file) => fs.existsSync(path.resolve("data/nano/project-aware", file))),
  "Project-aware Nano JSONL templates are present."
);

check(
  "validator checks project-aware records",
  validator.includes("expectedDecision") && validator.includes("safeProjectIdPattern"),
  "Nano data validator validates project-aware fields."
);

check(
  "external tasks can carry code-agent plan-only contract",
  externalTasks.includes("createCodeAgentTask") && externalTasks.includes("plan-only"),
  "External provider task handler has a Code Agent placeholder without execution."
);

console.log(JSON.stringify({ success: checks.every((item) => item.ok), checks, server: { required: false, skipped: true } }, null, 2));
if (checks.some((item) => !item.ok)) process.exit(1);
