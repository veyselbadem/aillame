import fs from "fs/promises";
import path from "path";
import { AgentFileReadRequest, AgentFileSummary } from "./types";
import { FileReadPolicy } from "./file-read-policy";
import { SecretRedactor } from "./secret-redactor";
import { CodeStructureExtractor } from "./code-structure-extractor";
import { resolveExistingPathInWorkspace } from "../workspace-scanner/path-policy";

export class AgentFileReader {
  private policy = new FileReadPolicy();
  private redactor = new SecretRedactor();
  private extractor = new CodeStructureExtractor();

  private static DEFAULT_MAX_FILES = 12;
  private static DEFAULT_MAX_BYTES = 32768; // 32 KB
  private static HARD_MAX_BYTES = 98304;    // 96 KB

  async readFile(workspacePath: string, relativePath: string, maxBytes = AgentFileReader.DEFAULT_MAX_BYTES): Promise<AgentFileSummary | null> {
    // 1. Path Safety
    const resolvedPath = resolveExistingPathInWorkspace(workspacePath, relativePath);
    if (!resolvedPath) return null;

    // 2. Read Policy
    const policyResult = this.policy.isAllowed(relativePath);
    if (!policyResult.allowed) return null;

    try {
      const stats = await fs.stat(resolvedPath);
      const ext = path.extname(resolvedPath).toLowerCase();
      
      // Limit bytes
      const limit = Math.min(maxBytes, AgentFileReader.HARD_MAX_BYTES);
      const bytesToRead = Math.min(stats.size, limit);
      const truncated = stats.size > limit;

      const buffer = Buffer.alloc(bytesToRead);
      const fd = await fs.open(resolvedPath, "r");
      await fd.read(buffer, 0, bytesToRead, 0);
      await fd.close();

      let content = buffer.toString("utf8");

      // 3. Redact Secrets
      const redactResult = this.redactor.redact(content);
      
      // 4. Extract Structure
      const structure = this.extractor.extract(redactResult.content, ext);

      return {
        relativePath,
        extension: ext,
        sizeBytes: stats.size,
        truncated,
        redacted: redactResult.redacted,
        language: this.detectLanguage(ext),
        purpose: this.inferPurpose(relativePath),
        structure,
        contentPreview: redactResult.content,
        warnings: truncated ? [`Content truncated to ${limit} bytes.`] : []
      };
    } catch (error) {
      return null;
    }
  }

  private detectLanguage(ext: string): string {
    const map: Record<string, string> = {
      ".ts": "TypeScript", ".tsx": "TypeScript (React)",
      ".js": "JavaScript", ".jsx": "JavaScript (React)",
      ".rs": "Rust", ".py": "Python", ".go": "Go",
      ".json": "JSON", ".md": "Markdown", ".prisma": "Prisma"
    };
    return map[ext] || "Plain Text";
  }

  private inferPurpose(relativePath: string): string {
    if (relativePath.includes("route.ts")) return "API Route Handler";
    if (relativePath.includes("page.tsx")) return "UI Page Component";
    if (relativePath.includes("core/")) return "Core Business Logic";
    if (relativePath.includes("components/")) return "Reusable UI Component";
    if (relativePath.includes("package.json")) return "Project Configuration";
    return "Source Code / Documentation";
  }
}
