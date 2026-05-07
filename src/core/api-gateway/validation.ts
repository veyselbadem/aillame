import type {
  AillameContentType,
  AillameOutputType,
  AillameRequest,
  AillameTaskType,
} from "../contracts/aillame-request";

const TASK_TYPES: readonly AillameTaskType[] = [
  "chat",
  "text",
  "code",
  "analysis",
  "image",
  "vision",
  "agent",
  "mixed",
  "unknown",
];

const CONTENT_TYPES: readonly AillameContentType[] = [
  "text",
  "image",
  "code",
  "project",
  "mixed",
];

const OUTPUT_TYPES: readonly AillameOutputType[] = [
  "text",
  "image",
  "json",
  "patch",
  "report",
  "mixed",
];

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; message: string; details?: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function enumIncludes<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && values.includes(value as T);
}

export function validateAillameRequest(body: unknown): ValidationResult<AillameRequest> {
  if (!isRecord(body)) {
    return {
      ok: false,
      code: "INVALID_JSON_BODY",
      message: "Request body must be a JSON object.",
    };
  }

  if (typeof body.prompt !== "string" || body.prompt.trim().length === 0) {
    return {
      ok: false,
      code: "INVALID_PROMPT",
      message: "prompt is required and must be a non-empty string.",
    };
  }

  if (body.prompt.length > 20000) {
    return {
      ok: false,
      code: "PROMPT_TOO_LONG",
      message: "prompt must be 20000 characters or fewer.",
    };
  }

  if (body.taskType !== undefined && !enumIncludes(TASK_TYPES, body.taskType)) {
    return {
      ok: false,
      code: "INVALID_TASK_TYPE",
      message: "taskType is not supported.",
      details: `Allowed values: ${TASK_TYPES.join(", ")}`,
    };
  }

  if (body.contentType !== undefined && !enumIncludes(CONTENT_TYPES, body.contentType)) {
    return {
      ok: false,
      code: "INVALID_CONTENT_TYPE",
      message: "contentType is not supported.",
      details: `Allowed values: ${CONTENT_TYPES.join(", ")}`,
    };
  }

  if (body.outputType !== undefined && !enumIncludes(OUTPUT_TYPES, body.outputType)) {
    return {
      ok: false,
      code: "INVALID_OUTPUT_TYPE",
      message: "outputType is not supported.",
      details: `Allowed values: ${OUTPUT_TYPES.join(", ")}`,
    };
  }

  if (
    !isOptionalString(body.projectId)
    || !isOptionalString(body.preferredModelId)
    || !isOptionalString(body.mode)
  ) {
    return {
      ok: false,
      code: "INVALID_REQUEST_FIELD",
      message: "projectId, mode, and preferredModelId must be strings when provided.",
    };
  }

  if (body.messages !== undefined && !Array.isArray(body.messages)) {
    return {
      ok: false,
      code: "INVALID_MESSAGES",
      message: "messages must be an array when provided.",
    };
  }

  return {
    ok: true,
    value: {
      prompt: body.prompt,
      messages: Array.isArray(body.messages) ? body.messages as AillameRequest["messages"] : undefined,
      projectId: body.projectId,
      mode: enumIncludes(["general", "education", "code", "economy"] as const, body.mode) ? body.mode : undefined,
      taskType: enumIncludes(TASK_TYPES, body.taskType) ? body.taskType : undefined,
      contentType: enumIncludes(CONTENT_TYPES, body.contentType) ? body.contentType : undefined,
      outputType: enumIncludes(OUTPUT_TYPES, body.outputType) ? body.outputType : undefined,
      preferredModelId: body.preferredModelId,
      metadata: isRecord(body.metadata) ? body.metadata : undefined,
    },
  };
}
