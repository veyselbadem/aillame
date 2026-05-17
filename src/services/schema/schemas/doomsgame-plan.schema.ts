import { SchemaRegistry, SchemaDefinition } from "../schema-registry.service";

export const DoomsgamePlanSchema: SchemaDefinition = {
  id: "doomsgame-plan",
  name: "Doomsgame Plan Schema",
  fields: {
    gameTitle: { type: "string", required: true },
    concept: { type: "string", required: true },
    genre: { type: "string", required: true },
    coreLoop: { type: "string", required: true },
    mechanics: { type: "array", items: "string", required: true },
    scenes: { type: "array", items: "string", required: true },
    filesToCreate: { type: "array", items: "object", required: true },
    filesToModify: { type: "array", items: "object", required: true },
    assetsNeeded: { type: "array", items: "object", required: true },
    projectContext: { type: "object", required: true },
    permissionMode: { type: "string", required: true }, // Must be "read_only"
    requiresUserApproval: { type: "boolean", required: true }, // Must be true
    safetyNotes: { type: "array", items: "string", required: true },
    nextSteps: { type: "array", items: "string", required: true }
  }
};

// Register by default when imported
SchemaRegistry.registerSchema(DoomsgamePlanSchema);
