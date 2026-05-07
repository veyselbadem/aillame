import type { AillameGgufWorkerReadinessResult } from "./gguf-worker-types";

export function formatGgufWorkerReadinessReport(result: AillameGgufWorkerReadinessResult): string[] {
  const lines: string[] = [];
  lines.push("=== AILLAME GGUF WORKER READINESS REPORT ===");
  lines.push(`State: ${result.state.toUpperCase()}`);
  lines.push(`Model ID: ${result.manifest.id}`);
  lines.push(`Model Path: ${result.manifest.modelPath || "N/A"}`);
  lines.push(`Path Policy Allowed: ${result.allowedByPathPolicy}`);
  lines.push(`File Found: ${result.modelPathExists}`);
  lines.push(`Can Enable: ${result.canEnable}`);
  lines.push(`Can Generate: ${result.canGenerate} (Prototype only)`);
  
  if (result.blockedReasons.length > 0) {
    lines.push("");
    lines.push("BLOCKED REASONS:");
    result.blockedReasons.forEach(r => lines.push(`- ${r}`));
  }

  if (result.warnings.length > 0) {
    lines.push("");
    lines.push("WARNINGS:");
    result.warnings.forEach(w => lines.push(`- ${w}`));
  }

  lines.push("");
  lines.push("STRATEGY: This worker uses an independent process to load GGUF models via llama.cpp/candle-gguf bindings.");
  lines.push("NEXT STEPS: Configure valid GGUF path and enable worker in Phase 35.");

  return lines;
}
