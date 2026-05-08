import { IGNORE_DIRECTORIES, IGNORE_EXTENSIONS, IGNORE_FILES } from "../workspace-scanner/ignore-policy";

export const ALLOWED_EXTENSIONS = [
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", 
  ".md", ".mdx", ".css", ".scss", ".html", ".yml", ".yaml", 
  ".toml", ".prisma", ".rs", ".py", ".go", ".java", ".kt", 
  ".swift", ".sql", ".sh", ".ps1", ".bat"
];

export const BLOCKED_FILE_NAMES = [
  ...IGNORE_FILES,
  ".env", ".env.local", ".env.development", ".env.production",
  "worker_stderr.log", "image-jobs.jsonl", "api-keys.jsonl"
];

export class FileReadPolicy {
  isAllowed(relativePath: string): { allowed: boolean; reason?: string } {
    const parts = relativePath.split(/[\\/]/);
    const fileName = parts[parts.length - 1].toLowerCase();
    const ext = fileName.includes(".") ? `.${fileName.split(".").pop()}` : "";

    // 1. Directory Check
    for (const dir of IGNORE_DIRECTORIES) {
      if (parts.includes(dir)) {
        return { allowed: false, reason: `Directory '${dir}' is blocked.` };
      }
    }

    // 2. File Name Check
    if (BLOCKED_FILE_NAMES.includes(fileName)) {
      return { allowed: false, reason: `File '${fileName}' is explicitly blocked.` };
    }

    // 3. Extension Check
    if (IGNORE_EXTENSIONS.includes(ext)) {
      return { allowed: false, reason: `Extension '${ext}' is blocked.` };
    }

    if (!ALLOWED_EXTENSIONS.includes(ext) && ext !== "") {
      return { allowed: false, reason: `Extension '${ext}' is not in allowlist.` };
    }

    return { allowed: true };
  }
}
