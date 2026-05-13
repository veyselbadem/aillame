export const WORKSPACE_AGENT_EXECUTION_GATE_POLICY = {
  mode: "gate_check_only" as const,
  maxSummaryLength: 1000,
  maxConfirmationLength: 500,
  defaultDecision: "blocked" as const,
  defaultBlocking: true,
  defaultCanExecute: false,
  defaultCanWrite: false,
  defaultCanRunShell: false,
  defaultIssuedCapability: null,
  
  // Forbidden intents that trigger blocking
  forbiddenIntents: [
    "command_execution",
    "direct_file_write",
    "unauthorized_registry_access"
  ]
};
