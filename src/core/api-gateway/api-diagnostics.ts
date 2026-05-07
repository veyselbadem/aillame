export type AillameApiSeverity =
  | "info"
  | "warning"
  | "error";

export type AillameApiDiagnosticCode =
  | "OK"
  | "VALIDATION_ERROR"
  | "ROUTED_ONLY"
  | "TEXT_RUNTIME_DEGRADED"
  | "TEXT_RUNTIME_UNAVAILABLE"
  | "MODEL_UNAVAILABLE"
  | "PREFERRED_MODEL_REJECTED"
  | "RUNTIME_NOT_IMPLEMENTED"
  | "ACTION_BLOCKED"
  | "MEMORY_RECALL_FAILED"
  | "UNKNOWN_ERROR";

export type AillameApiDiagnostic = {
  code: AillameApiDiagnosticCode;
  severity: AillameApiSeverity;
  message: string;
  source?: string;
  details?: Record<string, unknown>;
};

export type AillameApiDiagnosticsEnvelope = {
  diagnostics: AillameApiDiagnostic[];
  warnings: string[];
  reasonCodes: string[];
  degraded: boolean;
};

/**
 * Creates a standard success diagnostic.
 */
export function createSuccessDiagnostic(message: string = "Operation completed successfully."): AillameApiDiagnostic {
  return {
    code: "OK",
    severity: "info",
    message,
  };
}


/**
 * Creates an empty diagnostics envelope.
 */
export function createEmptyDiagnosticsEnvelope(): AillameApiDiagnosticsEnvelope {
  return {
    diagnostics: [],
    warnings: [],
    reasonCodes: [],
    degraded: false,
  };
}

/**
 * Creates a standardized API diagnostic object.
 */
export function createApiDiagnostic(input: AillameApiDiagnostic): AillameApiDiagnostic {
  return { ...input };
}

/**
 * Aggregates diagnostic objects into a standard envelope.
 */
export function buildApiDiagnosticsEnvelope(
  diagnostics: AillameApiDiagnostic[]
): AillameApiDiagnosticsEnvelope {
  return {
    diagnostics,
    warnings: diagnostics
      .filter((d) => d.severity === "warning")
      .map((d) => d.message),
    reasonCodes: Array.from(new Set(diagnostics.map((d) => d.code))),
    degraded: diagnostics.some((d) => d.code === "TEXT_RUNTIME_DEGRADED" || d.severity === "error"),
  };
}

/**
 * Safely extracts a message from an unknown error object.
 */
export function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "An unexpected error occurred.";
}
