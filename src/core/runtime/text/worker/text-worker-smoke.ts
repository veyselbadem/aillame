import { getAillameTextWorkerConfig } from "./text-worker-config";
import { createTextWorkerLifecycleState, startTextWorkerPlaceholder } from "./text-worker-lifecycle";
import { getTextWorkerHealth } from "./text-worker-health";
import { createAillameManagedTextWorkerRuntime } from "./text-worker-runtime";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const config = getAillameTextWorkerConfig();
  const initialState = createTextWorkerLifecycleState(config);
  const health = getTextWorkerHealth(initialState);
  const started = startTextWorkerPlaceholder(initialState);
  const runtime = createAillameManagedTextWorkerRuntime();
  const runtimeHealth = runtime.getHealth();
  const generation = await runtime.generate({
    prompt: "Merhaba",
  });

  assert(config.kind === "placeholder", "Default managed text worker should be a placeholder");
  assert(config.enabled === false, "Default managed text worker should be disabled");
  assert(health.status === "disabled", "Disabled worker health should report disabled");
  assert(health.canGenerate === false, "Disabled worker cannot generate");
  assert(started.status === "disabled", "Start placeholder should not start a disabled worker");
  assert(runtime.model.runtimeKind === "aillame-managed-worker", "Runtime kind should be managed worker");
  assert(runtime.canHandle({ prompt: "Merhaba" }) === false, "Skeleton runtime should not handle requests");
  assert(runtimeHealth.canGenerate === false, "Skeleton runtime health cannot generate");
  assert(generation.success === false, "Skeleton runtime generation should fail explicitly");

  console.log(JSON.stringify({
    success: true,
    workerId: config.id,
    workerStatus: health.status,
    runtimeKind: runtime.model.runtimeKind,
    runtimeCanGenerate: runtimeHealth.canGenerate,
    generationError: generation.error?.code,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  throw error;
});
