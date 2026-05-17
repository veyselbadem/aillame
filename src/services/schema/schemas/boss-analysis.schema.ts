import { SchemaRegistry, SchemaDefinition } from "../schema-registry.service";

export const BossAnalysisSchema: SchemaDefinition = {
  id: "boss-analysis",
  name: "Boss Analysis Schema",
  fields: {
    summary: { type: "string", required: true },
    sentiment: { type: "string", required: true }, // positive, neutral, negative, mixed, unknown
    riskLevel: { type: "string", required: true }, // low, medium, high, unknown
    opportunities: { type: "array", items: "string", required: true },
    risks: { type: "array", items: "string", required: true },
    scenarios: { type: "array", items: "string", required: true },
    uncertainties: { type: "array", items: "string", required: true },
    ungroundedClaims: { type: "array", items: "string", required: true },
    sources: { type: "array", items: "object", required: true },
    decisionSupportNote: { type: "string", required: true }
  }
};

// Register by default when imported
SchemaRegistry.registerSchema(BossAnalysisSchema);
