import type { ImageWorkflowJson, ImageWorkflowValidationResult } from "./image-workflow-types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateImageWorkflow(workflow: unknown): ImageWorkflowValidationResult {
  const errors: ImageWorkflowValidationResult["errors"] = [];
  const warnings: string[] = [];

  if (!isObject(workflow)) {
    return {
      success: false,
      errors: [{ code: "WORKFLOW_NOT_OBJECT", message: "Workflow must be a JSON object." }],
      warnings,
      diagnostics: { nodeCount: 0, edgeCount: 0, hasPrompt: false, hasOutput: false },
    };
  }

  const typed = workflow as Partial<ImageWorkflowJson>;
  if (typeof typed.workflowId !== "string" || !typed.workflowId.trim()) errors.push({ code: "WORKFLOW_ID_REQUIRED", message: "workflowId is required." });
  if (!Array.isArray(typed.nodes)) errors.push({ code: "NODES_REQUIRED", message: "nodes must be an array." });
  if (!Array.isArray(typed.edges)) errors.push({ code: "EDGES_REQUIRED", message: "edges must be an array." });

  const nodes = Array.isArray(typed.nodes) ? typed.nodes : [];
  const edges = Array.isArray(typed.edges) ? typed.edges : [];
  const ids = new Set<string>();
  let hasPrompt = false;
  let hasOutput = false;

  for (const node of nodes) {
    if (!node || typeof node.id !== "string" || !node.id.trim()) {
      errors.push({ code: "NODE_ID_REQUIRED", message: "Each node requires a non-empty id." });
      continue;
    }
    if (ids.has(node.id)) errors.push({ code: "DUPLICATE_NODE_ID", message: `Duplicate node id '${node.id}'.`, details: { nodeId: node.id } });
    ids.add(node.id);
    if (node.type === "prompt") hasPrompt = true;
    if (node.type === "output") hasOutput = true;
    if (node.type === "unknown") warnings.push(`Unknown node '${node.id}' will be ignored by safe runners.`);
  }

  for (const edge of edges) {
    if (!edge || typeof edge.source !== "string" || typeof edge.target !== "string") {
      errors.push({ code: "INVALID_EDGE", message: "Each edge requires source and target." });
      continue;
    }
    if (!ids.has(edge.source)) errors.push({ code: "EDGE_SOURCE_MISSING", message: `Edge source '${edge.source}' does not exist.` });
    if (!ids.has(edge.target)) errors.push({ code: "EDGE_TARGET_MISSING", message: `Edge target '${edge.target}' does not exist.` });
  }

  if (!hasPrompt) errors.push({ code: "PROMPT_NODE_REQUIRED", message: "Workflow requires at least one prompt node." });
  if (!hasOutput) errors.push({ code: "OUTPUT_NODE_REQUIRED", message: "Workflow requires at least one output node." });

  return {
    success: errors.length === 0,
    errors,
    warnings,
    diagnostics: { nodeCount: nodes.length, edgeCount: edges.length, hasPrompt, hasOutput },
  };
}
