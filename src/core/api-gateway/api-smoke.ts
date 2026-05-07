import { handleAillameApiRequest } from "./handlers";

type SmokeCase = {
  id: string;
  method: string;
  path: string;
  body?: unknown;
  expectedStatus: number;
  check(body: unknown): boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const cases: readonly SmokeCase[] = [
  {
    id: "models",
    method: "GET",
    path: "/api/aillame/models",
    expectedStatus: 200,
    check: (body) => isRecord(body) && body.success === true && Array.isArray(body.models) && body.count === body.models.length,
  },
  {
    id: "runtime-status",
    method: "GET",
    path: "/api/aillame/runtime/status",
    expectedStatus: 200,
    check: (body) => isRecord(body) && body.success === true && isRecord(body.runtime),
  },
  {
    id: "generate-text",
    method: "POST",
    path: "/api/aillame/generate",
    body: { prompt: "Blog yazisi uret", metadata: { maxTokens: 4 } },
    expectedStatus: 200,
    check: (body) => isRecord(body) && isRecord(body.routing) && body.routing.taskType === "text" && body.status === "generated" && isRecord(body.output),
  },
  {
    id: "chat-defaults",
    method: "POST",
    path: "/api/aillame/chat",
    body: { prompt: "Merhaba", metadata: { maxTokens: 4 } },
    expectedStatus: 200,
    check: (body) => isRecord(body) && isRecord(body.routing) && body.routing.taskType === "chat" && body.status === "generated",
  },
  {
    id: "image-defaults",
    method: "POST",
    path: "/api/aillame/image",
    body: { prompt: "Bir poster olustur" },
    expectedStatus: 200,
    check: (body) => isRecord(body) && isRecord(body.routing) && body.routing.outputType === "image" && body.status === "routed",
  },
  {
    id: "agent-defaults",
    method: "POST",
    path: "/api/aillame/agent",
    body: { prompt: "Bu projeyi analiz et" },
    expectedStatus: 200,
    check: (body) => isRecord(body) && isRecord(body.routing) && body.routing.taskType === "agent" && body.status === "routed",
  },
  {
    id: "invalid-prompt",
    method: "POST",
    path: "/api/aillame/generate",
    body: { prompt: "" },
    expectedStatus: 400,
    check: (body) => isRecord(body) && body.success === false,
  },
];

let failures = 0;

async function runSmoke(): Promise<void> {
  for (const testCase of cases) {
    const response = await handleAillameApiRequest({
      method: testCase.method,
      path: testCase.path,
      body: testCase.body,
    });
    const passed = response.statusCode === testCase.expectedStatus && testCase.check(response.body);

    if (passed) {
      console.log(`[PASS] ${testCase.id}`);
    } else {
      failures += 1;
      console.error(`[FAIL] ${testCase.id}: status=${response.statusCode}, body=${JSON.stringify(response.body)}`);
    }
  }

  if (failures > 0) {
    throw new Error(`${failures} API gateway smoke case(s) failed.`);
  }
}

runSmoke().catch((error) => {
  console.error(error);
  throw error;
});
