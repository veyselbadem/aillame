import type {
  AillameProblemAnalysisResult,
  AillameProblemCategory,
  AillameProblemInput,
  AillameProblemSeverity,
  AillameProblemSignal,
} from "./problem-types";

const CATEGORY_CAUSES: Record<AillameProblemCategory, string[]> = {
  typescript: ["Type definitions are incompatible.", "A symbol or module type is missing.", "Compiler configuration may not include the expected files."],
  build: ["Build tool failed while compiling or bundling.", "A dependency or config error is surfacing during build."],
  runtime: ["Code runs but throws at execution time.", "A value may be undefined, malformed, or imported incorrectly."],
  dependency: ["Installed dependency tree may be incomplete or conflicting.", "Package lock or peer dependency constraints may be out of sync."],
  "module-resolution": ["Import path, alias, extension, or package export may not resolve.", "tsconfig/package bundler paths may disagree."],
  environment: ["Required environment variable or local configuration may be missing.", "Runtime is reading a different environment than expected."],
  database: ["Database service may be unavailable or misconfigured.", "Connection URL, migration state, or schema may be inconsistent."],
  prisma: ["Prisma schema/client generation may be out of sync.", "Database migrations or Prisma client may need inspection."],
  react: ["React component/runtime constraint may be violated.", "Client/server rendering boundaries or hooks may be misused."],
  nextjs: ["Next.js routing/build boundary may be misconfigured.", "Server/client component usage may need review."],
  vite: ["Vite/Rollup dependency transform or import resolution may be failing.", "Vite config or plugin setup may need review."],
  electron: ["Main/preload/renderer boundary may be misconfigured.", "Desktop packaging/runtime permissions may need review."],
  tauri: ["Tauri config, Rust sidecar, or command permission may need review.", "Desktop shell integration may be misconfigured."],
  rust: ["Rust type, trait, borrow, or crate configuration may be failing.", "Cargo workspace or feature flags may need review."],
  expo: ["Mobile bundler/native dependency setup may be inconsistent.", "Metro, Gradle, or platform tooling may need review."],
  network: ["Target service may be unreachable.", "Host, DNS, firewall, or proxy configuration may be wrong."],
  "port-conflict": ["Another process may already be using the requested port.", "Dev server port configuration may need changing."],
  permission: ["Current user/process may lack access to a file, folder, or port.", "OS policy or locked file may block the operation."],
  encoding: ["File encoding or terminal output may be corrupted.", "Non-ASCII text may have been decoded with the wrong charset."],
  unknown: ["The log does not contain enough recognizable signals.", "More context, command, or project type may be needed."],
};

const CATEGORY_CHECKS: Record<AillameProblemCategory, string[]> = {
  typescript: ["Check the first TS error line and referenced file.", "Check tsconfig include/path aliases.", "Check dependency-provided types."],
  build: ["Check the first failing build error, not the final exit code.", "Check recently changed config and dependency versions."],
  runtime: ["Check the stack trace top frame.", "Check input data shape and import/export boundaries."],
  dependency: ["Check package manager error lines.", "Check lockfile/package manifest consistency."],
  "module-resolution": ["Check the import path casing and extension.", "Check tsconfig paths and package exports."],
  environment: ["Check required env names without printing secret values.", "Check local env file presence and runtime environment."],
  database: ["Check database service status and connection string shape.", "Check migration/client generation state."],
  prisma: ["Check schema.prisma and generated client state.", "Check migration status and datasource config."],
  react: ["Check hook usage and component boundaries.", "Check hydration/server-client mismatch clues."],
  nextjs: ["Check server/client component markers.", "Check route segment config and build output."],
  vite: ["Check Vite config plugins and import resolution.", "Check dependency prebundle errors."],
  electron: ["Check main/preload/renderer boundaries.", "Check packaging/runtime path assumptions."],
  tauri: ["Check tauri.conf and src-tauri Cargo config.", "Check command permissions before enabling actions."],
  rust: ["Check the first rustc diagnostic.", "Check Cargo features and crate boundaries."],
  expo: ["Check Metro bundler output and native dependency setup.", "Check platform-specific build logs."],
  network: ["Check target host/port and service availability.", "Check DNS/proxy/firewall settings."],
  "port-conflict": ["Identify the intended port.", "Choose a free port or stop the conflicting process after user approval."],
  permission: ["Check path ownership/permissions.", "Check whether a file is locked by another process."],
  encoding: ["Check file encoding and terminal code page.", "Check whether the source text was double-decoded."],
  unknown: ["Collect the exact command and full first error block.", "Add project type and relevant config filenames."],
};

function buildSummary(category: AillameProblemCategory, severity: AillameProblemSeverity, signals: readonly AillameProblemSignal[]): string {
  if (signals.length === 0) {
    return "No recognizable problem pattern was found in the provided message or log.";
  }
  return `${severity} ${category} problem detected from ${signals.length} signal(s). Top signal: ${signals[0].message}`;
}

function suggestedFixPlan(category: AillameProblemCategory): string[] {
  return [
    "Keep the investigation read-only until the user approves changes.",
    ...CATEGORY_CHECKS[category].map((check) => `Inspect: ${check}`),
    "Prepare a minimal fix plan after confirming the root cause.",
  ];
}

export function buildProblemAnalysisReport(params: {
  input: AillameProblemInput;
  category: AillameProblemCategory;
  severity: AillameProblemSeverity;
  confidence: number;
  signals: AillameProblemSignal[];
}): AillameProblemAnalysisResult {
  const category = params.category;
  return {
    success: true,
    category,
    severity: params.severity,
    summary: buildSummary(category, params.severity, params.signals),
    likelyCauses: CATEGORY_CAUSES[category],
    evidence: params.signals.slice(0, 8),
    recommendedChecks: CATEGORY_CHECKS[category],
    suggestedFixPlan: suggestedFixPlan(category),
    safetyNotes: [
      "Read-only analysis only.",
      "No files were written, deleted, or patched.",
      "No terminal command was executed by this analyzer.",
      "Do not expose secret values from environment or log files.",
    ],
    readOnly: true,
    confidence: params.confidence,
  };
}
