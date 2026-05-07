import type { ModelCatalogEntry, ModelCatalogResult } from "./model-catalog-types";

export const CURATED_GGUF_STARTER_CATALOG: readonly ModelCatalogEntry[] = [
  {
    modelId: "starter-qwen-3b-gguf",
    displayName: "Qwen-style 3B GGUF Starter Candidate",
    provider: "candidate",
    family: "qwen",
    taskType: "chat",
    format: "gguf",
    source: "curated",
    license: "User must review upstream license before download/use.",
    tags: ["starter", "3b", "gguf", "q4", "local-llm"],
    recommendedUse: "First local LLM acceptance on modest CPU/RAM machines.",
    compatibility: {
      score: 0.86,
      summary: "Good starter class for local GGUF acceptance.",
      hardwareFit: "likely",
      runtimeCompatibility: "supported",
      warnings: [],
      nextAction: "Create download plan or provide a local GGUF file.",
    },
    files: [
      {
        fileName: "candidate-3b-q4_k_m.gguf",
        format: "gguf",
        quantization: "Q4_K_M",
        parameterSize: "3B",
        recommended: true,
        warnings: ["Metadata-only starter entry. User must provide or approve a verified source."],
      },
      {
        fileName: "candidate-3b-q5_k_m.gguf",
        format: "gguf",
        quantization: "Q5_K_M",
        parameterSize: "3B",
        recommended: false,
        warnings: ["More memory than Q4_K_M, usually better quality."],
      },
    ],
    warnings: ["Download must be explicitly approved. No model file is bundled."],
  },
  {
    modelId: "starter-gemma-4b-gguf",
    displayName: "Gemma-style 4B GGUF Starter Candidate",
    provider: "candidate",
    family: "gemma",
    taskType: "chat",
    format: "gguf",
    source: "curated",
    license: "User must review upstream license before download/use.",
    tags: ["starter", "4b", "gguf", "q4", "local-llm"],
    recommendedUse: "Balanced small/medium candidate for first Aillame-controlled LLM acceptance.",
    compatibility: {
      score: 0.82,
      summary: "Likely compatible if RAM is sufficient.",
      hardwareFit: "likely",
      runtimeCompatibility: "supported",
      warnings: ["Check license terms and memory budget."],
      nextAction: "Create download plan or provide a local GGUF file.",
    },
    files: [
      {
        fileName: "candidate-4b-q4_k_m.gguf",
        format: "gguf",
        quantization: "Q4_K_M",
        parameterSize: "4B",
        recommended: true,
        warnings: ["Metadata-only starter entry. User must provide or approve a verified source."],
      },
    ],
    warnings: ["Do not commit GGUF files to git."],
  },
  {
    modelId: "starter-mistral-7b-gguf",
    displayName: "Mistral-style 7B GGUF Candidate",
    provider: "candidate",
    family: "mistral",
    taskType: "chat",
    format: "gguf",
    source: "curated",
    license: "User must review upstream license before download/use.",
    tags: ["7b", "gguf", "q4", "higher-memory"],
    recommendedUse: "Use after smaller models are validated; expects more RAM/VRAM.",
    compatibility: {
      score: 0.68,
      summary: "Compatible format but higher memory risk.",
      hardwareFit: "warning",
      runtimeCompatibility: "supported",
      warnings: ["7B+ models may be slow or memory-heavy on consumer hardware."],
      nextAction: "Review hardware fit before planning download.",
    },
    files: [
      {
        fileName: "candidate-7b-q4_k_m.gguf",
        format: "gguf",
        quantization: "Q4_K_M",
        parameterSize: "7B",
        recommended: false,
        warnings: ["Higher memory use; not the preferred first acceptance model."],
      },
    ],
    warnings: ["Prefer 3B-4B Q4_K_M/Q5_K_M for first live acceptance."],
  },
];

export function queryCuratedGgufCatalog(): ModelCatalogResult {
  return {
    success: true,
    entries: [...CURATED_GGUF_STARTER_CATALOG],
    diagnostics: {
      source: "curated",
      offline: true,
      networkRequired: false,
      warnings: ["Curated catalog is metadata-only and does not bundle model weights."],
      generatedAt: new Date().toISOString(),
    },
  };
}
