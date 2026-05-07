import { listTextRuntimes } from "./text-runtime-registry";
import { getTextRuntimeHealthSummary } from "./text-runtime-health";
import { listTextRuntimeInstances } from "./text-runtime-registry";
import { routeTextRuntimeRequest } from "./text-runtime-router";
import { checkModelAvailability } from "../../models/model-availability-guard";

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const runtimes = listTextRuntimes();
  const healthSummary = getTextRuntimeHealthSummary(listTextRuntimeInstances());
  const nano = runtimes.find((runtime) => runtime.id === "aillame-nano");
  const route = routeTextRuntimeRequest({
    taskType: "chat",
    prompt: "Merhaba",
    maxTokens: 4,
  });
  const streamRoute = routeTextRuntimeRequest({
    taskType: "chat",
    prompt: "Merhaba",
    stream: true,
  });
  const unavailablePreferredRoute = routeTextRuntimeRequest({
    modelId: "local-text-external",
    taskType: "chat",
    prompt: "Merhaba",
  });
  const nanoAvailability = checkModelAvailability({
    modelId: "aillame-nano",
    requiredCapabilities: ["chat"],
    requireCanGenerate: true,
  });
  const externalAvailability = checkModelAvailability({
    modelId: "local-text-external",
    requiredCapabilities: ["chat"],
    requireCanGenerate: true,
  });

  assert(runtimes.length >= 2, "Text runtime registry should expose registered runtimes");
  assert(healthSummary.total === runtimes.length, "Health summary should cover all text runtimes");
  assert(healthSummary.runtimes.some((runtime) => runtime.id === "aillame-nano"), "Health summary should include Nano runtime");
  assert(healthSummary.runtimes.some((runtime) => runtime.status === "disabled"), "Health summary should include disabled placeholder");
  if (!nano) {
    throw new Error("Aillame Nano runtime should be registered");
  }
  assert(nano.runtimeKind === "nano-rust", "Aillame Nano runtime should be registered as nano-rust");
  assert(nano.supportsStreaming === false, "Nano/Rust runtime should not advertise streaming yet");
  assert(route.success, "Safe chat request should route to a text runtime");
  assert(route.selectedModelId === "aillame-nano", "Safe chat request should select aillame-nano");
  assert(!streamRoute.success, "Streaming request should not route until streaming runtime is implemented");
  assert(!unavailablePreferredRoute.success, "Preferred model without linked runtime should not route");
  assert(nanoAvailability.available, "Aillame Nano should pass availability guard");
  assert(externalAvailability.reasonCode === "RUNTIME_NOT_LINKED", "Registered text model without runtime should be blocked");

  console.log(JSON.stringify({
    success: true,
    runtimes: runtimes.length,
    healthTotal: healthSummary.total,
    healthAvailable: healthSummary.available,
    healthDisabled: healthSummary.disabled,
    selectedModelId: route.selectedModelId,
    requiredCapabilities: route.requiredCapabilities,
    streamingRouteSuccess: streamRoute.success,
    streamingReason: streamRoute.reason,
    unavailablePreferredReason: unavailablePreferredRoute.reason,
    nanoAvailability: nanoAvailability.reasonCode,
    externalAvailability: externalAvailability.reasonCode,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  throw error;
});
