import type {
  AillameProblemCategory,
  AillameProblemInput,
  AillameProblemSeverity,
  AillameProblemSignal,
} from "./problem-types";

type LogPattern = {
  category: AillameProblemCategory;
  severity: AillameProblemSeverity;
  pattern: RegExp;
  message: string;
  confidence: number;
};

const LOG_PATTERNS: readonly LogPattern[] = [
  { category: "typescript", severity: "error", pattern: /\bTS\d{4}\b|type .* is not assignable|cannot find name/i, message: "TypeScript compiler error detected.", confidence: 0.9 },
  { category: "module-resolution", severity: "error", pattern: /cannot find module|module not found|failed to resolve import|cannot resolve/i, message: "Module resolution failure detected.", confidence: 0.88 },
  { category: "dependency", severity: "error", pattern: /peer dependency|missing dependency|npm ERR!|pnpm ERR!|yarn error|could not resolve dependency/i, message: "Dependency/package manager issue detected.", confidence: 0.84 },
  { category: "build", severity: "error", pattern: /build failed|failed to compile|compilation failed|error during build|exit code 1/i, message: "Build failure detected.", confidence: 0.82 },
  { category: "runtime", severity: "error", pattern: /uncaught exception|typeerror|referenceerror|syntaxerror|rangeerror|runtime error/i, message: "Runtime JavaScript error detected.", confidence: 0.8 },
  { category: "react", severity: "warning", pattern: /invalid hook call|hydration failed|react-dom|useeffect|jsx/i, message: "React-specific signal detected.", confidence: 0.78 },
  { category: "nextjs", severity: "error", pattern: /next\.js|next build|app router|pages router|server component|client component/i, message: "Next.js-specific signal detected.", confidence: 0.78 },
  { category: "vite", severity: "error", pattern: /vite|rollup|esbuild|import\.meta/i, message: "Vite/Rollup build signal detected.", confidence: 0.74 },
  { category: "prisma", severity: "error", pattern: /prisma|schema\.prisma|prisma client|p\d{4}/i, message: "Prisma/database schema signal detected.", confidence: 0.82 },
  { category: "database", severity: "error", pattern: /database|sql|sqlite|postgres|mysql|connection refused|migration/i, message: "Database connectivity or migration signal detected.", confidence: 0.72 },
  { category: "rust", severity: "error", pattern: /cargo|rustc|borrow checker|cannot borrow|trait bound|mismatched types/i, message: "Rust compiler/build signal detected.", confidence: 0.84 },
  { category: "tauri", severity: "error", pattern: /tauri|wry|webview|src-tauri|tauri\.conf/i, message: "Tauri desktop app signal detected.", confidence: 0.82 },
  { category: "electron", severity: "error", pattern: /electron|ipcmain|ipcrenderer|asar|browserwindow/i, message: "Electron desktop app signal detected.", confidence: 0.78 },
  { category: "expo", severity: "error", pattern: /expo|metro bundler|react native|gradle|xcode/i, message: "Expo/React Native mobile signal detected.", confidence: 0.78 },
  { category: "network", severity: "error", pattern: /econnrefused|enotfound|etimedout|fetch failed|network error|dns/i, message: "Network/connectivity signal detected.", confidence: 0.78 },
  { category: "port-conflict", severity: "error", pattern: /eaddrinuse|address already in use|port \d+ is already in use/i, message: "Port conflict detected.", confidence: 0.92 },
  { category: "permission", severity: "error", pattern: /eacces|eperm|permission denied|access is denied|operation not permitted/i, message: "Permission/access issue detected.", confidence: 0.86 },
  { category: "environment", severity: "warning", pattern: /env|environment variable|process\.env|api key|missing .* variable/i, message: "Environment configuration signal detected.", confidence: 0.76 },
  { category: "encoding", severity: "warning", pattern: /utf-?8|encoding|mojibake|invalid character|unexpected token .*�|Ã.|Ä.|Å./i, message: "Encoding or character corruption signal detected.", confidence: 0.7 },
];

function buildCombinedText(input: AillameProblemInput): string {
  return [
    input.projectType,
    input.command,
    input.userMessage,
    input.logText,
    input.contextFiles?.join("\n"),
  ].filter(Boolean).join("\n");
}

export function classifyProblemLog(input: AillameProblemInput): AillameProblemSignal[] {
  const text = buildCombinedText(input);
  if (!text.trim()) return [];

  return LOG_PATTERNS
    .filter((pattern) => pattern.pattern.test(text))
    .map((pattern) => ({
      category: pattern.category,
      severity: pattern.severity,
      pattern: pattern.pattern.source,
      message: pattern.message,
      confidence: pattern.confidence,
    }))
    .sort((a, b) => b.confidence - a.confidence);
}
