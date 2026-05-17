import { SchemaRegistry, SchemaDefinition } from "../schema-registry.service";

export const BademakademiQuestionSchema: SchemaDefinition = {
  id: "bademakademi-question",
  name: "Bademakademi Question Schema",
  fields: {
    questionText: { type: "string", required: true },
    visualSpec: { type: "object", required: true },
    imageResult: { type: "object", required: false },
    options: { type: "array", items: "string", required: true },
    correctAnswer: { type: "string", required: true },
    explanation: { type: "string", required: true },
    layoutHint: { type: "string", required: true },
    consistency: { type: "object", required: true }
  }
};

// Register by default when imported
SchemaRegistry.registerSchema(BademakademiQuestionSchema);
