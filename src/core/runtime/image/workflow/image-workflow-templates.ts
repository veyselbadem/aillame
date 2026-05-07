import type { ImageWorkflowJson } from "./image-workflow-types";

const createdAt = "2026-05-07T00:00:00.000Z";

export const IMAGE_WORKFLOW_TEMPLATES: ImageWorkflowJson[] = [
  {
    workflowId: "text-to-image-basic",
    name: "Text to Image Basic",
    version: "1.0.0",
    createdAt,
    metadata: { foundationOnly: true, executesModel: false },
    nodes: [
      { id: "prompt", type: "prompt", config: { prompt: "{{prompt}}" } },
      { id: "size", type: "size", config: { width: 1024, height: 1024 } },
      { id: "output", type: "output", config: { mimeType: "image/png" } },
    ],
    edges: [
      { id: "e1", source: "prompt", target: "size" },
      { id: "e2", source: "size", target: "output" },
    ],
  },
  {
    workflowId: "text-to-image-style-preset",
    name: "Text to Image Style Preset",
    version: "1.0.0",
    createdAt,
    metadata: { foundationOnly: true, executesModel: false },
    nodes: [
      { id: "prompt", type: "prompt", config: { prompt: "{{prompt}}" } },
      { id: "style", type: "style", config: { stylePreset: "{{stylePreset}}" } },
      { id: "safety", type: "safety", config: { remoteFetch: false } },
      { id: "output", type: "output", config: { mimeType: "image/png" } },
    ],
    edges: [
      { id: "e1", source: "prompt", target: "style" },
      { id: "e2", source: "style", target: "safety" },
      { id: "e3", source: "safety", target: "output" },
    ],
  },
  {
    workflowId: "image-upscale-placeholder",
    name: "Image Upscale Placeholder",
    version: "1.0.0",
    createdAt,
    metadata: { foundationOnly: true, executesModel: false },
    nodes: [
      { id: "prompt", type: "prompt", config: { prompt: "upscale existing image" } },
      { id: "model", type: "model", config: { modelId: "not-configured" } },
      { id: "output", type: "output", config: { mimeType: "image/png" } },
    ],
    edges: [
      { id: "e1", source: "prompt", target: "model" },
      { id: "e2", source: "model", target: "output" },
    ],
  },
];
