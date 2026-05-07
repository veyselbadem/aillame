import type { AillameWorkspaceAnalysisReport, AillameWorkspaceScanResult } from "./workspace-types";

function buildStack(scan: AillameWorkspaceScanResult): string[] {
  const stack: string[] = [scan.projectType];
  if (scan.detected.packageJson) stack.push("package.json");
  if (scan.detected.tsconfig) stack.push("typescript");
  if (scan.detected.nextConfig) stack.push("nextjs-config");
  if (scan.detected.viteConfig) stack.push("vite-config");
  if (scan.detected.cargoToml) stack.push("rust-cargo");
  if (scan.detected.tauriConfig) stack.push("tauri");
  if (scan.detected.prismaSchema) stack.push("prisma");
  return Array.from(new Set(stack.filter((item) => item !== "unknown")));
}

function buildPossibleIssues(scan: AillameWorkspaceScanResult): string[] {
  const issues: string[] = [];
  if (!scan.detected.readme) issues.push("README file was not detected.");
  if ((scan.projectType === "node" || scan.projectType === "nextjs" || scan.projectType === "vite") && !scan.detected.packageJson) {
    issues.push("Node-like project detected but package.json was not found.");
  }
  if ((scan.projectType === "nextjs" || scan.projectType === "vite") && !scan.detected.tsconfig) {
    issues.push("Frontend TypeScript config was not detected.");
  }
  if (scan.detected.envFiles && scan.detected.envFiles.length > 0) {
    issues.push("Environment files exist and were intentionally not read.");
  }
  if (scan.warnings.includes("MAX_FILES_REACHED")) {
    issues.push("Scan reached maxFiles limit; analysis may be partial.");
  }
  return issues;
}

function buildRecommendedChecks(scan: AillameWorkspaceScanResult): string[] {
  const checks = [
    "Review important manifest/config files manually before any code change.",
    "Run project type specific validation only after user approval.",
  ];
  if (scan.detected.packageJson) checks.push("Inspect package scripts and dependency versions.");
  if (scan.detected.tsconfig) checks.push("Inspect TypeScript strictness and path aliases.");
  if (scan.detected.cargoToml) checks.push("Inspect Rust crate layout and build targets.");
  if (scan.detected.tauriConfig) checks.push("Inspect desktop shell permissions and command allowlist.");
  return checks;
}

export function buildWorkspaceAnalysisReport(scan: AillameWorkspaceScanResult): AillameWorkspaceAnalysisReport {
  const importantFiles = scan.importantFiles.map((file) => file.relativePath);
  const possibleIssues = buildPossibleIssues(scan);
  const detectedStack = buildStack(scan);
  const skippedSensitiveFiles = scan.warnings
    .filter((warning) => warning.startsWith("SENSITIVE_FILE_SKIPPED:"))
    .map((warning) => warning.replace("SENSITIVE_FILE_SKIPPED:", ""));

  return {
    success: scan.success,
    projectType: scan.projectType,
    summary: scan.success
      ? `Read-only workspace scan detected a ${scan.projectType} project with ${scan.files.length} indexed entries and ${importantFiles.length} important files.`
      : "Read-only workspace scan could not complete successfully.",
    detectedStack,
    importantFiles,
    possibleIssues,
    recommendedNextChecks: buildRecommendedChecks(scan),
    safety: {
      readOnly: true,
      rootRestricted: true,
      skippedSensitiveFiles,
    },
  };
}
