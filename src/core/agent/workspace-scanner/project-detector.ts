import { WorkspaceFileNode } from "./types";

export type DetectedProject = {
  type: string;
  frameworks: string[];
  languages: string[];
  packageManagers: string[];
};

export function detectProject(files: WorkspaceFileNode[]): DetectedProject {
  const frameworks: string[] = [];
  const languages: string[] = [];
  const packageManagers: string[] = [];
  let type = "Unknown";

  const fileNames = new Set(files.map(f => f.name.toLowerCase()));
  const extensions = new Set(files.map(f => f.extension?.toLowerCase()).filter(Boolean));

  // Package Managers
  if (fileNames.has("package-lock.json")) packageManagers.push("npm");
  if (fileNames.has("yarn.lock")) packageManagers.push("yarn");
  if (fileNames.has("pnpm-lock.yaml")) packageManagers.push("pnpm");
  if (fileNames.has("requirements.txt") || fileNames.has("pyproject.toml")) packageManagers.push("pip/poetry");
  if (fileNames.has("cargo.lock")) packageManagers.push("cargo");

  // Languages
  if (extensions.has(".ts") || extensions.has(".tsx")) languages.push("TypeScript");
  if (extensions.has(".js") || extensions.has(".jsx")) languages.push("JavaScript");
  if (extensions.has(".py")) languages.push("Python");
  if (extensions.has(".rs")) languages.push("Rust");
  if (extensions.has(".go")) languages.push("Go");

  // Frameworks & Tools
  if (fileNames.has("next.config.js") || fileNames.has("next.config.ts") || fileNames.has("next.config.mjs")) {
    frameworks.push("Next.js");
    type = "Web Application (Next.js)";
  }
  if (fileNames.has("vite.config.js") || fileNames.has("vite.config.ts")) {
    frameworks.push("Vite");
    if (type === "Unknown") type = "Web Application (Vite)";
  }
  if (fileNames.has("tailwind.config.js") || fileNames.has("tailwind.config.ts")) frameworks.push("TailwindCSS");
  if (fileNames.has("tsconfig.json")) frameworks.push("TypeScript Config");
  if (fileNames.has("prisma") || files.some(f => f.relativePath.includes("prisma"))) frameworks.push("Prisma");
  if (fileNames.has("tauri.conf.json") || files.some(f => f.relativePath.includes("src-tauri"))) frameworks.push("Tauri");
  if (fileNames.has("app.json") || fileNames.has("app.config.js")) frameworks.push("Expo/React Native");

  return {
    type,
    frameworks,
    languages,
    packageManagers
  };
}
