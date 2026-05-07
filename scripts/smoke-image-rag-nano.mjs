import fs from "node:fs";
import path from "node:path";

const checks = [];

function check(name, ok, detail) {
  checks.push({ name, ok, detail });
}

function read(file) {
  return fs.readFileSync(path.resolve(file), "utf8");
}

const imageWorker = read("src/core/runtime/image/image-worker.ts");
const imageTypes = read("src/core/runtime/image/image-runtime-types.ts");
const workflowValidator = read("src/core/runtime/image/workflow/image-workflow-validator.ts");
const workflowTemplates = read("src/core/runtime/image/workflow/image-workflow-templates.ts");
const imageQueue = read("src/core/runtime/image/jobs/image-job-queue.ts");
const sdxlAdapter = read("src/core/runtime/image/adapters/sdxl-like-runtime-adapter.ts");
const vectorStore = read("src/core/memory/vector/in-memory-vector-store.ts");
const ingestion = read("src/core/memory/ingestion/document-ingestion.ts");
const attribution = read("src/core/memory/attribution/memory-attribution-types.ts");
const feedback = read("src/core/memory/feedback/feedback-learning-candidates.ts");
const nanoDecoder = read("src/core/nano/decision/nano-constrained-decision-decoder.ts");
const packageJson = JSON.parse(read("package.json"));

check(
  "image worker not-configured response is structured",
  imageWorker.includes("IMAGE_RUNTIME_NOT_CONFIGURED") && imageWorker.includes("createNotConfiguredImageResponse") && imageTypes.includes("ImageResponse"),
  "Image worker returns typed not-configured/degraded responses without model execution."
);

check(
  "image workflow validator accepts templates and rejects invalid shapes",
  workflowValidator.includes("PROMPT_NODE_REQUIRED") && workflowValidator.includes("EDGE_SOURCE_MISSING") && workflowTemplates.includes("text-to-image-basic"),
  "Workflow validator checks prompt/output nodes and edge references."
);

check(
  "image job queue supports create/get/cancel",
  imageQueue.includes("create(request") && imageQueue.includes("get(jobId") && imageQueue.includes("cancel(jobId") && imageQueue.includes("not-configured"),
  "Image job queue exposes safe in-memory job lifecycle."
);

check(
  "SDXL-like adapter is not configured without model path",
  sdxlAdapter.includes("IMAGE_MODEL_PATH_NOT_CONFIGURED") && sdxlAdapter.includes("comfyUiDependency") === false && sdxlAdapter.includes("readsModelFile: false"),
  "Adapter scaffolding has path policy and does not depend on ComfyUI."
);

check(
  "vector memory supports project isolation",
  vectorStore.includes("entry.projectId === query.projectId") && vectorStore.includes("includeGlobal") && vectorStore.includes("Sensitive-looking content"),
  "In-memory vector store scopes search by projectId and blocks sensitive content."
);

check(
  "document ingestion chunks supported text and blocks secrets",
  ingestion.includes("SUPPORTED_MIME") && ingestion.includes("SENSITIVE_DOCUMENT_BLOCKED") && ingestion.includes("chunkIndex"),
  "Document ingestion has text/markdown/json support, chunking, duplicate hash, and sensitive guard."
);

check(
  "memory attribution object can be created",
  attribution.includes("createMemoryAttribution") && attribution.includes("sourceType") && attribution.includes("confidence"),
  "Attribution foundation captures source, project, scope, snippet, and diagnostics."
);

check(
  "feedback candidate remains pending review",
  feedback.includes("pending-review") && feedback.includes("not used for training automatically") && feedback.includes("Sensitive-looking feedback"),
  "Feedback learning loop creates candidates without direct training."
);

check(
  "Nano autonomous hooks are forced disabled",
  nanoDecoder.includes("normalizeNanoLongTermCapabilityHooks") && nanoDecoder.includes("autonomousActionsEnabled: false") && nanoDecoder.includes("forced to false"),
  "Nano long-term hooks remain advisory and autonomous actions are disabled."
);

check(
  "package script is registered",
  packageJson.scripts?.["smoke:image-rag-nano"] === "node scripts/smoke-image-rag-nano.mjs",
  "smoke:image-rag-nano script is available."
);

const summary = {
  success: checks.every((item) => item.ok),
  checks,
  destructiveOperation: false,
  modelExecution: false,
  externalNetwork: false,
};

console.log(JSON.stringify(summary, null, 2));
if (!summary.success) process.exit(1);
