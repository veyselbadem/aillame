import type { ModelCatalogEntry, ModelCatalogResult } from "./model-catalog-types";

export const CURATED_IGM_STARTER_CATALOG: readonly ModelCatalogEntry[] = [
  {
    modelId: "starter-sd15-safetensors",
    displayName: "Stable Diffusion v1.5 Starter Candidate",
    provider: "candidate",
    family: "sd15",
    taskType: "image",
    format: "safetensors",
    source: "curated",
    license: "CreativeML Open RAIL-M",
    tags: ["starter", "sd15", "safetensors", "local-igm"],
    recommendedUse: "Standard image generation on modest hardware (8GB+ RAM/VRAM).",
    compatibility: {
      score: 0.9,
      summary: "Highly compatible with most local IGM workers.",
      hardwareFit: "likely",
      runtimeCompatibility: "supported",
      warnings: [],
      nextAction: "Configure AILLAME_IGM_MODEL_DIR and provide .safetensors file.",
    },
    files: [
      {
        fileName: "v1-5-pruned-emaonly.safetensors",
        format: "safetensors",
        recommended: true,
        warnings: ["Metadata-only entry. User must provide the actual file."],
      },
    ],
    warnings: ["Diffusion models require significant VRAM or RAM (4GB+ minimum)."],
  },
  {
    modelId: "starter-sdxl-turbo-safetensors",
    displayName: "SDXL Turbo Fast Candidate",
    provider: "candidate",
    family: "sdxl",
    taskType: "image",
    format: "safetensors",
    source: "curated",
    license: "SDXL Turbo Research License",
    tags: ["fast", "sdxl", "turbo", "high-quality"],
    recommendedUse: "Fast high-quality generation. Requires more VRAM than SD 1.5.",
    compatibility: {
      score: 0.75,
      summary: "Compatible but requires modern GPU for reasonable speed.",
      hardwareFit: "warning",
      runtimeCompatibility: "supported",
      warnings: ["High VRAM usage (8GB+ recommended)."],
      nextAction: "Verify hardware compatibility before use.",
    },
    files: [
      {
        fileName: "sd_xl_turbo_1.0_fp16.safetensors",
        format: "safetensors",
        recommended: true,
        warnings: ["Fastest SDXL-class model for local acceptance."],
      },
    ],
    warnings: ["License restricted for commercial use. Check upstream terms."],
  }
];

export function queryCuratedIgmCatalog(): ModelCatalogResult {
  return {
    success: true,
    entries: [...CURATED_IGM_STARTER_CATALOG],
    diagnostics: {
      source: "curated",
      offline: true,
      networkRequired: false,
      warnings: ["IGM catalog is metadata-only."],
      generatedAt: new Date().toISOString(),
    },
  };
}
