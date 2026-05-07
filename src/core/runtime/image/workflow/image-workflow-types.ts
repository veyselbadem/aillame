export type ImageWorkflowNodeType =
  | "prompt"
  | "negative-prompt"
  | "model"
  | "sampler"
  | "size"
  | "seed"
  | "style"
  | "safety"
  | "output"
  | "metadata"
  | "unknown";

export type ImageWorkflowNode = {
  id: string;
  type: ImageWorkflowNodeType;
  label?: string;
  config: Record<string, unknown>;
};

export type ImageWorkflowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type ImageWorkflowJson = {
  workflowId: string;
  name: string;
  version: string;
  nodes: ImageWorkflowNode[];
  edges: ImageWorkflowEdge[];
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt?: string;
};

export type ImageWorkflowValidationResult = {
  success: boolean;
  errors: Array<{ code: string; message: string; details?: Record<string, unknown> }>;
  warnings: string[];
  diagnostics: {
    nodeCount: number;
    edgeCount: number;
    hasPrompt: boolean;
    hasOutput: boolean;
  };
};
