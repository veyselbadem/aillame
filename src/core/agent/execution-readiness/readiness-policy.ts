export const WORKSPACE_AGENT_EXECUTION_READINESS_POLICY = {
  mode: "readiness_only",
  allowsExecution: false,
  allowsFileWrites: false,
  allowsShellCommands: false,
  maxSummaryLength: 2000,
  maxConfirmationLength: 500,
  requiredChecks: [
    "no_execution_available",
    "no_file_write_available",
    "no_shell_available",
    "no_action_executor_available"
  ]
} as const;
