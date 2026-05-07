import type {
  AillameCommandCategory,
  AillameCommandRiskLevel,
  AillameCommandSafetyInput,
  AillameCommandSafetyResult,
} from "./command-types";

function normalizeCommand(command: string): string {
  return command.replace(/\s+/g, " ").trim();
}

function lower(command: string): string {
  return command.toLocaleLowerCase("en-US");
}

function hasAny(command: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(command));
}

function classifyCommand(command: string): AillameCommandCategory {
  const value = lower(command);
  if (hasAny(value, [/\btsc\b/, /typecheck/, /tsc --noemit/, /tsc --noemit/])) return "typecheck";
  if (hasAny(value, [/\btest\b/, /\bvitest\b/, /\bjest\b/, /\bplaywright test\b/])) return "test";
  if (hasAny(value, [/\bbuild\b/, /\bnext build\b/, /\bvite build\b/, /\bcargo build\b/])) return "build";
  if (hasAny(value, [/\blint\b/, /\beslint\b/, /\bbiome\b/])) return "lint";
  if (hasAny(value, [/\bdev\b/, /\bstart\b/, /\bserve\b/, /\bnext dev\b/, /\bvite\b/])) return "dev-server";
  if (hasAny(value, [/\bnpm install\b/, /\bpnpm install\b/, /\byarn install\b/, /\bbun install\b/, /\bcargo add\b/])) return "install";
  if (hasAny(value, [/\bnpm\b/, /\bpnpm\b/, /\byarn\b/, /\bbun\b/, /\bcargo\b/])) return "package-manager";
  if (hasAny(value, [/\bgit\b/])) return "git";
  if (hasAny(value, [/\brm\b/, /\bdel\b/, /\bremove-item\b/, /\bmove-item\b/, /\bcopy-item\b/, /\bmkdir\b/, /\btouch\b/])) return "file-system";
  if (hasAny(value, [/\bkill\b/, /\btaskkill\b/, /\bstop-process\b/, /\bstart-process\b/])) return "process";
  if (hasAny(value, [/\bcurl\b/, /\bwget\b/, /\binvoke-webrequest\b/, /\binvoke-restmethod\b/])) return "network";
  if (hasAny(value, [/\bprisma migrate\b/, /\bdb push\b/, /\bsql\b/, /\bmysql\b/, /\bpsql\b/])) return "database";
  return "unknown";
}

function blockedReasonFor(input: AillameCommandSafetyInput, normalizedCommand: string, category: AillameCommandCategory): string[] {
  const command = lower(normalizedCommand);
  const reasons: string[] = [];

  if (!normalizedCommand) reasons.push("EMPTY_COMMAND");
  if (/[;&|`]/.test(normalizedCommand)) reasons.push("SHELL_CONTROL_OPERATOR_NOT_ALLOWED_IN_DRY_RUN_POLICY");
  if (hasAny(command, [/\brm\s+-rf\b/, /\bdel\s+\/[sq]\b/, /\bremove-item\b.*\b-recurse\b/i])) reasons.push("RECURSIVE_DELETE_BLOCKED");
  if (hasAny(command, [/\bgit\s+reset\b/, /\bgit\s+clean\b/, /\bgit\s+checkout\b.*\s--\s/i])) reasons.push("DESTRUCTIVE_GIT_COMMAND_BLOCKED");
  if (category === "process" && !input.allowProcessKill) reasons.push("PROCESS_CONTROL_REQUIRES_EXPLICIT_APPROVAL");
  if (category === "network" && !input.allowNetwork) reasons.push("NETWORK_COMMAND_REQUIRES_EXPLICIT_APPROVAL");
  if (category === "install" && !input.allowInstall) reasons.push("INSTALL_COMMAND_REQUIRES_EXPLICIT_APPROVAL");
  if (category === "file-system" && !input.allowFileDelete) reasons.push("FILE_SYSTEM_MUTATION_BLOCKED");
  if (category === "database") reasons.push("DATABASE_MUTATION_OR_ACCESS_REQUIRES_REVIEW");

  return reasons;
}

function riskFor(category: AillameCommandCategory, blockedReasons: readonly string[]): AillameCommandRiskLevel {
  if (blockedReasons.length > 0) return "blocked";
  if (category === "typecheck" || category === "lint" || category === "test") return "safe";
  if (category === "build" || category === "package-manager" || category === "dev-server") return "review-required";
  if (category === "git" || category === "install" || category === "network" || category === "database") return "dangerous";
  if (category === "file-system" || category === "process") return "blocked";
  return "review-required";
}

function saferAlternative(category: AillameCommandCategory): string | undefined {
  if (category === "install") return "Inspect package.json and lockfile first; ask for approval before installing.";
  if (category === "file-system") return "Generate a patch plan instead of mutating files.";
  if (category === "process") return "Report the suspected process/port and ask for approval before stopping anything.";
  if (category === "network") return "Use existing local logs/config first; ask for network approval if still needed.";
  if (category === "database") return "Inspect schema/config first; ask before running database commands.";
  if (category === "git") return "Use read-only git status/diff/log style commands only after explicit approval.";
  return undefined;
}

export function evaluateCommandSafety(input: AillameCommandSafetyInput): AillameCommandSafetyResult {
  const normalizedCommand = normalizeCommand(input.command);
  const category = classifyCommand(normalizedCommand);
  const blockedReasons = blockedReasonFor(input, normalizedCommand, category);
  const risk = riskFor(category, blockedReasons);
  const requiresUserApproval = risk !== "safe";
  const allowed = risk === "safe" && blockedReasons.length === 0;
  const warnings: string[] = ["Dry-run policy only; command execution is not implemented in this phase."];

  if (category === "dev-server") warnings.push("Dev servers can keep running and require explicit lifecycle handling.");
  if (category === "build") warnings.push("Build commands may write generated output directories.");
  if (category === "test") warnings.push("Tests may write coverage, snapshots, or temporary files depending on project config.");

  return {
    allowed,
    risk,
    category,
    normalizedCommand,
    reason: allowed
      ? "Command appears safe for future read-mostly validation, but this phase still returns dry-run only."
      : "Command is not allowed to execute in this phase; review policy result first.",
    requiresUserApproval,
    warnings,
    blockedReasons,
    suggestedSaferAlternative: saferAlternative(category),
    dryRunOnly: true,
  };
}
