export type VerificationStatus = "allowed-preview" | "blocked" | "completed" | "failed" | "skipped";

export type VerificationCommand = {
  command: string;
  label?: string;
};

export type VerificationRequest = {
  commands: VerificationCommand[];
  execute?: boolean;
};

export type VerificationDiagnostics = {
  allowlistOnly: true;
  executionEnabled: false;
};

export type VerificationResult = {
  command: string;
  allowed: boolean;
  approvalRequired: boolean;
  status: VerificationStatus;
  durationMs?: number;
  exitCode?: number;
  errorSummary?: string;
  suggestedNextStep?: string;
  diagnostics: VerificationDiagnostics;
};

const ALLOWED_COMMANDS = new Set([
  "npm.cmd run typecheck",
  "npm.cmd run build",
  "npm.cmd test",
  "npm.cmd run lint",
  "npm.cmd run validate:nano-data",
  "npm.cmd run diagnostic:nano-tokenizer",
  "npm.cmd run smoke:foundation",
  "npm.cmd run smoke:project-provider",
  "cargo check",
]);

const BLOCKED_PATTERNS = [
  /\brm\b/i,
  /\bdel\b/i,
  /\brmdir\b/i,
  /\bformat\b/i,
  /\bpowershell\b/i,
  /\bcurl\b/i,
  /\bnpm\s+(install|update)\b/i,
  /\bgit\s+push\b/i,
];

function normalize(command: string): string {
  return command.replace(/\s+/g, " ").trim();
}

export function isVerificationCommandAllowed(command: string): boolean {
  const normalized = normalize(command);
  return ALLOWED_COMMANDS.has(normalized) && !BLOCKED_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function planVerification(request: VerificationRequest): VerificationResult[] {
  return request.commands.map((item) => {
    const command = normalize(item.command);
    const allowed = isVerificationCommandAllowed(command);
    return {
      command,
      allowed,
      approvalRequired: true,
      status: allowed ? "allowed-preview" : "blocked",
      errorSummary: allowed ? undefined : "Command is not in the Code Agent verification allowlist.",
      suggestedNextStep: allowed
        ? "Ask for approval before running this verification command."
        : "Use an allowlisted verification command or update the plan.",
      diagnostics: {
        allowlistOnly: true,
        executionEnabled: false,
      },
    };
  });
}
