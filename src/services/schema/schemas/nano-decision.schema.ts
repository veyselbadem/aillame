import { SchemaRegistry, SchemaDefinition } from "../schema-registry.service";

export const NanoDecisionSchema: SchemaDefinition = {
  id: "nano-decision",
  name: "Nano Decision Schema",
  fields: {
    project: { type: "string", required: true },
    task: { type: "string", required: true },
    workflow: { type: "string", required: true },
    modelNeeds: { type: "array", items: "string", required: true },
    permissionMode: { type: "string", required: true },
    confidence: { type: "number", required: false },
    classifierLayer: { type: "string", required: false },
    fallbackWorkflow: { type: "string", required: false },
    createdAt: { type: "string", required: true }
  }
};

// Register by default when imported
SchemaRegistry.registerSchema(NanoDecisionSchema);
