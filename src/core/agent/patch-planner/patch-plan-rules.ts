import type { AillameProblemCategory } from "../problem/problem-types";
import type { AillamePatchPlanTarget, AillamePatchRiskLevel } from "./patch-plan-types";

type CategoryRule = {
  files: string[];
  expectedChange: string;
  risk: AillamePatchRiskLevel;
  checks: string[];
};

const CATEGORY_RULES: Record<AillameProblemCategory, CategoryRule> = {
  typescript: {
    files: ["tsconfig.json", "package.json", "src/**/*.ts", "src/**/*.tsx"],
    expectedChange: "Adjust type definitions, imports, or TypeScript configuration after confirming the exact diagnostic.",
    risk: "medium",
    checks: ["Inspect the first TypeScript diagnostic.", "Confirm tsconfig path/include settings.", "Check whether generated types are stale."],
  },
  build: {
    files: ["package.json", "tsconfig.json", "vite.config.ts", "next.config.js"],
    expectedChange: "Adjust build config, script, import, or dependency settings based on the first build error.",
    risk: "medium",
    checks: ["Find the first failing build line.", "Inspect package scripts.", "Check bundler config."],
  },
  runtime: {
    files: ["src/**/*", "package.json"],
    expectedChange: "Review stack trace target and guard runtime data/import assumptions.",
    risk: "medium",
    checks: ["Identify the top application stack frame.", "Check data shape and null/undefined paths."],
  },
  dependency: {
    files: ["package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock"],
    expectedChange: "Adjust dependency versions or installation state only after reviewing package manager output.",
    risk: "high",
    checks: ["Inspect package manager error.", "Check lockfile consistency.", "Avoid dependency churn without approval."],
  },
  "module-resolution": {
    files: ["tsconfig.json", "package.json", "src/**/*"],
    expectedChange: "Correct import path, alias, extension, or package export usage.",
    risk: "medium",
    checks: ["Check import path casing.", "Check tsconfig paths.", "Check package exports."],
  },
  environment: {
    files: [".env.example", "README.md", "src/**/*config*"],
    expectedChange: "Document required environment variables or adjust config validation without exposing secrets.",
    risk: "high",
    checks: ["Check env names only, not values.", "Compare README/env example with runtime config."],
  },
  database: {
    files: ["prisma/schema.prisma", "src/**/*db*", "src/**/*database*"],
    expectedChange: "Review database client config, migrations, or connection handling.",
    risk: "high",
    checks: ["Check connection string shape without secrets.", "Review migration/client generation state."],
  },
  prisma: {
    files: ["prisma/schema.prisma", "package.json", "src/**/*prisma*"],
    expectedChange: "Regenerate or align Prisma schema/client/migration usage after review.",
    risk: "high",
    checks: ["Check schema.prisma.", "Check generated client usage.", "Check migration state."],
  },
  react: {
    files: ["src/**/*.tsx", "src/**/*.jsx", "package.json"],
    expectedChange: "Review component boundaries, hook usage, or hydration-sensitive code.",
    risk: "medium",
    checks: ["Check hook rules.", "Check server/client rendering boundary.", "Inspect component stack."],
  },
  nextjs: {
    files: ["next.config.js", "next.config.ts", "src/app/**/*", "src/pages/**/*"],
    expectedChange: "Review Next.js route, config, or server/client component boundary.",
    risk: "medium",
    checks: ["Check route segment involved.", "Check client/server markers.", "Check next config."],
  },
  vite: {
    files: ["vite.config.ts", "vite.config.js", "src/**/*", "package.json"],
    expectedChange: "Review Vite plugin/config or import handling.",
    risk: "medium",
    checks: ["Check Vite config.", "Check dependency prebundle error.", "Check import path."],
  },
  electron: {
    files: ["src/**/*", "electron/**/*", "package.json"],
    expectedChange: "Review main/preload/renderer boundaries and packaging paths.",
    risk: "high",
    checks: ["Check Electron process boundary.", "Review preload exposure.", "Check packaging assumptions."],
  },
  tauri: {
    files: ["src-tauri/tauri.conf.json", "src-tauri/Cargo.toml", "src/**/*"],
    expectedChange: "Review Tauri config, command permissions, or Rust shell integration.",
    risk: "high",
    checks: ["Check Tauri config.", "Check Rust command permissions.", "Review desktop security boundary."],
  },
  rust: {
    files: ["Cargo.toml", "src/**/*.rs"],
    expectedChange: "Review Rust type/trait/borrow diagnostics and crate configuration.",
    risk: "medium",
    checks: ["Check first rustc diagnostic.", "Inspect Cargo features.", "Review affected module."],
  },
  expo: {
    files: ["app.json", "app.config.ts", "package.json", "src/**/*"],
    expectedChange: "Review mobile bundler/native dependency configuration.",
    risk: "high",
    checks: ["Check Metro output.", "Check native dependency compatibility.", "Check platform-specific config."],
  },
  network: {
    files: ["src/**/*api*", "src/**/*client*", ".env.example"],
    expectedChange: "Review host, URL, timeout, and network configuration handling.",
    risk: "medium",
    checks: ["Check host/port config.", "Check service availability after approval.", "Avoid logging secrets."],
  },
  "port-conflict": {
    files: ["package.json", ".env.example", "vite.config.ts", "next.config.js"],
    expectedChange: "Review dev server port configuration or document alternate port.",
    risk: "low",
    checks: ["Identify intended port.", "Check package scripts.", "Choose alternate port only after approval."],
  },
  permission: {
    files: ["package.json", "scripts/**/*"],
    expectedChange: "Review path access, script assumptions, or OS permission boundaries.",
    risk: "high",
    checks: ["Check path ownership/permissions.", "Check whether scripts touch protected locations."],
  },
  encoding: {
    files: ["src/**/*", "README.md", "tsconfig.json"],
    expectedChange: "Review file encoding and replace corrupted text only with user-approved edits.",
    risk: "medium",
    checks: ["Confirm source encoding.", "Check terminal code page.", "Avoid bulk text rewrites without review."],
  },
  unknown: {
    files: ["README.md", "package.json"],
    expectedChange: "Collect more context before proposing code changes.",
    risk: "blocked",
    checks: ["Ask for full error log.", "Run no commands until the exact problem is known."],
  },
};

export function getPatchRuleForCategory(category: AillameProblemCategory): CategoryRule {
  return CATEGORY_RULES[category] ?? CATEGORY_RULES.unknown;
}

export function buildTargetsFromRule(params: {
  category: AillameProblemCategory;
  importantFiles: readonly string[];
}): AillamePatchPlanTarget[] {
  const rule = getPatchRuleForCategory(params.category);
  const candidates = [...rule.files, ...params.importantFiles].filter(Boolean);
  const unique = Array.from(new Set(candidates)).slice(0, 8);

  return unique.map((relativePath) => ({
    relativePath,
    reason: `Relevant to ${params.category} investigation.`,
    expectedChange: rule.expectedChange,
    risk: rule.risk,
    requiresReview: true,
  }));
}
