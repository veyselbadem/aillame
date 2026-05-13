import { IndexingPolicy } from "./index-types";

export const DEFAULT_INDEXING_POLICY: IndexingPolicy = {
  maxFileSizeBytes: 1 * 1024 * 1024, // 1MB per file
  maxTotalBytes: 50 * 1024 * 1024,   // 50MB total index
  maxFiles: 500,
  maxChunkChars: 4000,
  allowlistedExtensions: [
    ".txt", ".md", ".markdown", ".html", ".css",
    ".js", ".ts", ".tsx", ".jsx", ".json",
    ".yml", ".yaml", ".rs", ".py", ".go", ".c", ".cpp"
  ],
  denylistedDirectories: [
    ".git", ".env", ".aillame-data", "node_modules", "dist",
    "build", "out", ".next", ".cache", "logs", "secrets",
    "memory", "coverage", "vendor", "target", "bin", "obj"
  ],
  denylistedFiles: [
    ".env", ".DS_Store", "package-lock.json", "yarn.lock",
    "pnpm-lock.yaml", ".gguf", ".bin", ".exe", ".dll",
    ".so", ".dylib", ".zip", ".rar", ".7z", ".png",
    ".jpg", ".jpeg", ".gif", ".webp", ".mp4", ".mp3", ".pdf"
  ],
};

export function isFileIndexable(filename: string, sizeBytes: number, policy: IndexingPolicy = DEFAULT_INDEXING_POLICY): { indexable: boolean; reason?: any } {
  // Extension check
  const ext = filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
  const normalizedExt = ext ? `.${ext}` : "";

  if (!policy.allowlistedExtensions.includes(normalizedExt)) {
    return { indexable: false, reason: "denylisted_extension" };
  }

  // File denylist
  if (policy.denylistedFiles.includes(filename) || policy.denylistedFiles.includes(normalizedExt)) {
    return { indexable: false, reason: "denylisted_extension" };
  }

  // Size check
  if (sizeBytes > policy.maxFileSizeBytes) {
    return { indexable: false, reason: "file_too_large" };
  }

  if (sizeBytes === 0) {
    return { indexable: false, reason: "empty_file" };
  }

  return { indexable: true };
}

export function isDirectoryIndexable(dirName: string, policy: IndexingPolicy = DEFAULT_INDEXING_POLICY): boolean {
  return !policy.denylistedDirectories.includes(dirName);
}
