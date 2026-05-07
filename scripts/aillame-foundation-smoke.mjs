import fs from "node:fs";
import path from "node:path";

const checks = [];

function read(file) {
  return fs.readFileSync(path.resolve(file), "utf8");
}

function check(name, ok, detail) {
  checks.push({ name, ok, detail });
}

const router = read("src/core/aillame-router/router.ts");
const routeTypes = read("src/core/aillame-router/types.ts");
const contracts = read("src/core/contracts/aillame-request.ts");
const registry = read("src/core/models/registry.ts");
const modelTypes = read("src/core/models/types.ts");
const runtimeRouter = read("src/core/runtime/text/text-runtime-router.ts");
const ggufPolicy = read("src/core/runtime/text/worker/gguf/gguf-worker-path-policy.ts");
const openAiRoute = read("src/app/api/v1/chat/completions/route.ts");
const nanoTypes = read("src/core/nano/types.ts");

check("router accepts project/preferred/capability hints",
  routeTypes.includes("projectId?: string")
    && routeTypes.includes("preferredModelId?: string")
    && routeTypes.includes("requiredCapabilities?:"),
  "AillameRouteInput exposes routing hints.");

check("router emits runtime diagnostics",
  contracts.includes("selectedRuntime?: string")
    && contracts.includes("fallbackReason?: string")
    && contracts.includes("diagnostics?:"),
  "Routing decision has typed runtime/fallback diagnostics.");

check("registry has structured capability selection",
  registry.includes("AillameModelRegistrySelectionResult")
    && registry.includes("selectModelForCapabilities"),
  "Model registry returns safe selection results.");

check("registry model types are extensible",
  modelTypes.includes("'vision'")
    && modelTypes.includes("'embedding'")
    && modelTypes.includes("'audio'"),
  "ModelType covers future modalities.");

check("runtime fallback is structured",
  runtimeRouter.includes("TEXT_RUNTIME_ROUTE_NOT_FOUND")
    && runtimeRouter.includes("not configured"),
  "Text runtime router returns a safe degraded result.");

check("GGUF path policy uses path.relative",
  ggufPolicy.includes("path.relative")
    && ggufPolicy.includes("path.isAbsolute"),
  "Windows path boundaries are checked without prefix-only matching.");

check("OpenAI-compatible route uses local runtime",
  openAiRoute.includes("generateWithBestTextRuntime")
    && !openAiRoute.includes("generateWithTextRuntimeRouter")
    && !openAiRoute.includes("@core/inference/fallback-policy"),
  "Route avoids external-provider fallback pipeline.");

check("OpenAI-compatible stream unsupported is structured",
  openAiRoute.includes("stream_not_supported")
    && openAiRoute.includes("501"),
  "stream=true returns a structured not-supported response.");

check("Nano long-term hooks are diagnostics-only",
  nanoTypes.includes("NanoLongTermCapabilityHooks")
    && nanoTypes.includes("autonomousActionsEnabled: false")
    && nanoTypes.includes("diagnosticsOnly: true"),
  "Future Nano capability flags cannot enable autonomous actions.");

const failed = checks.filter((item) => !item.ok);
console.log(JSON.stringify({ success: failed.length === 0, checks }, null, 2));
if (failed.length > 0) process.exit(1);
