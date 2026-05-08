export interface ProfessionalErrorDetails {
  code: string;
  message: string;
  problem: string;
  solution: string;
  validation: string;
}

export interface ProfessionalErrorPayload {
  success: false;
  error: ProfessionalErrorDetails;
}

type ErrorGuide = Pick<ProfessionalErrorDetails, 'problem' | 'solution' | 'validation'>;

const ERROR_GUIDES: Record<string, ErrorGuide> = {
  UNAUTHORIZED: {
    problem: 'Admin authorization is missing or invalid.',
    solution: 'Sign in again from the admin login page and verify the admin token configuration.',
    validation: 'Open the admin dashboard and retry the protected action.',
  },
  INVALID_REQUEST: {
    problem: 'The request body could not be parsed.',
    solution: 'Send valid JSON with the required fields for this endpoint.',
    validation: 'Retry the request from the UI or run the related smoke test.',
  },
  INVALID_PARAMS: {
    problem: 'Required request fields are missing.',
    solution: 'Fill in all required fields before submitting the action.',
    validation: 'Retry the action after confirming the form values.',
  },
  WORKSPACE_ACCESS_DENIED: {
    problem: 'The requested path is outside the approved workspace boundary (Path Containment).',
    solution: 'Choose a file strictly within the selected workspace and avoid absolute paths or parent directory (..) traversal.',
    validation: 'Run `npm run smoke:agent-path-containment`.',
  },
  MODEL_NOT_FOUND: {
    problem: 'The requested model could not be located in the local directory.',
    solution: 'Verify the model path in your configuration and ensure the model file exists at the specified location.',
    validation: 'Run `npm run smoke:live-llm-model-manager` to verify model discovery.',
  },
  PROVIDER_TIMEOUT: {
    problem: 'The external provider or local worker did not respond within the expected timeout limit.',
    solution: 'Check your hardware resource usage (CPU/RAM) or network connection, and consider increasing the timeout value in settings.',
    validation: 'Run `npm run smoke:provider-api` or the related runtime acceptance test.',
  },
  UNSAFE_PATH: {
    problem: 'The requested path is outside the approved workspace boundary.',
    solution: 'Choose a file inside the selected workspace and avoid absolute paths, traversal segments, or symlinks.',
    validation: 'Run `npm.cmd run smoke:agent-path-containment`.',
  },
  DRY_RUN_REQUIRED: {
    problem: 'Patch application was requested without a matching server-side dry-run proof.',
    solution: 'Run the dry-run review first, then apply using the returned dryRunToken.',
    validation: 'Run `npm.cmd run smoke:agent-safe-write`.',
  },
  LOCAL_FIRST_DISABLED: {
    problem: 'This legacy or cloud-dependent feature is disabled in the Local-First Final RC version.',
    solution: 'Use the local LLM, local IGM, provider API, or explicitly enable legacy providers only for compatibility testing.',
    validation: 'Run `npm.cmd run smoke:legacy-cleanup`.',
  },
  FILE_OPERATION_FAILED: {
    problem: 'The file operation could not be completed.',
    solution: 'Verify the document input, workspace permissions, and local storage configuration.',
    validation: 'Retry the operation from the admin UI.',
  },
};

export function formatProfessionalError(
  code: string,
  fallbackProblem: string,
  overrides: Partial<ErrorGuide> = {},
): ProfessionalErrorDetails {
  const guide = ERROR_GUIDES[code] ?? {
    problem: fallbackProblem,
    solution: 'Review the request details and try the operation again.',
    validation: 'Run the closest matching smoke test for this workflow.',
  };

  return {
    code,
    message: overrides.problem ?? guide.problem,
    problem: overrides.problem ?? guide.problem,
    solution: overrides.solution ?? guide.solution,
    validation: overrides.validation ?? guide.validation,
  };
}

export function professionalErrorResponse(
  code: string,
  fallbackProblem: string,
  overrides: Partial<ErrorGuide> = {},
): ProfessionalErrorPayload {
  return {
    success: false,
    error: formatProfessionalError(code, fallbackProblem, overrides),
  };
}

export function errorMessage(error: unknown, fallback = 'Unexpected error'): string {
  return error instanceof Error ? error.message : fallback;
}
