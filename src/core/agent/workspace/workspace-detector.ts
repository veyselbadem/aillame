import * as fs from "fs";
import * as path from "path";
import type {
  AillameWorkspaceFileInfo,
  AillameWorkspaceProjectType,
  AillameWorkspaceScanResult,
} from "./workspace-types";

const IMPORTANT_FILENAMES = new Map<string, string>([
  ["package.json", "Node package manifest"],
  ["tsconfig.json", "TypeScript configuration"],
  ["next.config.js", "Next.js configuration"],
  ["next.config.mjs", "Next.js configuration"],
  ["next.config.ts", "Next.js configuration"],
  ["vite.config.js", "Vite configuration"],
  ["vite.config.ts", "Vite configuration"],
  ["vite.config.mjs", "Vite configuration"],
  ["cargo.toml", "Rust Cargo manifest"],
  ["tauri.conf.json", "Tauri configuration"],
  ["readme.md", "Project README"],
  ["prisma.schema", "Prisma schema"],
  ["pyproject.toml", "Python project configuration"],
  ["requirements.txt", "Python dependencies"],
  ["plugin.php", "WordPress plugin entry candidate"],
]);

export function classifyWorkspaceFile(filePath: string, relativePath: string, sizeBytes: number, isDirectory: boolean): AillameWorkspaceFileInfo {
  const name = path.basename(filePath);
  const extension = path.extname(name) || undefined;
  const normalized = relativePath.replace(/\\/g, "/").toLocaleLowerCase("en-US");
  const importantReason = IMPORTANT_FILENAMES.get(name.toLocaleLowerCase("en-US"))
    ?? (normalized === "prisma/schema.prisma" ? "Prisma schema" : undefined)
    ?? (normalized.startsWith("src-tauri/") ? "Tauri source/config area" : undefined);

  return {
    path: filePath,
    relativePath,
    name,
    extension,
    sizeBytes,
    isDirectory,
    isImportant: Boolean(importantReason),
    reason: importantReason,
  };
}

function hasFile(files: readonly AillameWorkspaceFileInfo[], relativePath: string): boolean {
  return files.some((file) => file.relativePath.replace(/\\/g, "/").toLocaleLowerCase("en-US") === relativePath);
}

function hasAnyName(files: readonly AillameWorkspaceFileInfo[], names: readonly string[]): boolean {
  const normalized = new Set(names.map((name) => name.toLocaleLowerCase("en-US")));
  return files.some((file) => normalized.has(file.name.toLocaleLowerCase("en-US")));
}

function packageJsonHas(rootPath: string, needles: readonly string[]): boolean {
  const packagePath = path.join(rootPath, "package.json");
  if (!fs.existsSync(packagePath)) return false;

  try {
    const raw = fs.readFileSync(packagePath, "utf8");
    return needles.some((needle) => raw.includes(`"${needle}"`));
  } catch {
    return false;
  }
}

export function detectWorkspaceProjectType(
  rootPath: string,
  files: readonly AillameWorkspaceFileInfo[]
): AillameWorkspaceProjectType {
  if (hasAnyName(files, ["next.config.js", "next.config.mjs", "next.config.ts"]) || packageJsonHas(rootPath, ["next"])) return "nextjs";
  if (hasAnyName(files, ["vite.config.js", "vite.config.ts", "vite.config.mjs"]) || packageJsonHas(rootPath, ["vite"])) return "vite";
  if (packageJsonHas(rootPath, ["react-native"])) return "react-native";
  if (packageJsonHas(rootPath, ["electron"])) return "electron";
  if (hasFile(files, "src-tauri/tauri.conf.json") || packageJsonHas(rootPath, ["@tauri-apps/api"])) return "tauri";
  if (hasAnyName(files, ["cargo.toml"])) return "rust";
  if (hasAnyName(files, ["pyproject.toml", "requirements.txt"])) return "python";
  if (hasAnyName(files, ["plugin.php"]) || hasFile(files, "readme.txt")) return "wordpress-plugin";
  if (hasAnyName(files, ["package.json"])) return "node";
  return "unknown";
}

export function buildDetectedFlags(files: readonly AillameWorkspaceFileInfo[]): AillameWorkspaceScanResult["detected"] {
  const envFiles = files
    .filter((file) => /^\.env($|\.)/i.test(file.name))
    .map((file) => file.relativePath);

  return {
    packageJson: hasAnyName(files, ["package.json"]),
    tsconfig: hasAnyName(files, ["tsconfig.json"]),
    nextConfig: hasAnyName(files, ["next.config.js", "next.config.mjs", "next.config.ts"]),
    viteConfig: hasAnyName(files, ["vite.config.js", "vite.config.ts", "vite.config.mjs"]),
    prismaSchema: hasFile(files, "prisma/schema.prisma"),
    cargoToml: hasAnyName(files, ["cargo.toml"]),
    tauriConfig: hasFile(files, "src-tauri/tauri.conf.json"),
    envFiles,
    readme: hasAnyName(files, ["readme.md", "readme.txt"]),
  };
}
