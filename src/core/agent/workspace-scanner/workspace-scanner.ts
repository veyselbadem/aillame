import fs from "fs/promises";
import path from "path";
import { 
  WorkspaceFileNode, 
  WorkspaceScanRequest, 
  WorkspaceScanSummary 
} from "./types";
import { 
  IGNORE_DIRECTORIES, 
  IGNORE_EXTENSIONS, 
  IGNORE_FILES, 
  SECRET_PATTERNS 
} from "./ignore-policy";
import { detectProject } from "./project-detector";
import { maskPath, resolveContainedExistingPath, resolveContainedWorkspaceRoot } from "./path-policy";

const MAX_FILE_SIZE_FOR_METADATA = 1024 * 1024; // 1 MB

export class WorkspaceScanner {
  private totalFiles = 0;
  private totalDirectories = 0;
  private ignoredFiles = 0;
  private ignoredDirectories = 0;
  private byExtension: Record<string, number> = {};
  private importantFiles: string[] = [];

  async scan(request: WorkspaceScanRequest): Promise<WorkspaceScanSummary> {
    const { workspacePath, maxDepth = 4, maxFiles = 1000 } = request;

    const resolvedRoot = resolveContainedWorkspaceRoot(workspacePath);
    if (!resolvedRoot) {
      throw new Error(`UNSAFE_PATH: Requested workspace path is outside of safe boundaries or contains traversal markers (..): ${workspacePath}`);
    }

    this.resetStats();
    const tree = await this.scanDirectory(resolvedRoot, resolvedRoot, 0, maxDepth, maxFiles);
    
    const flatNodes = this.flattenTree(tree);
    const projectInfo = detectProject(flatNodes);

    return {
      workspaceRoot: resolvedRoot,
      safeRootName: maskPath(resolvedRoot),
      projectType: projectInfo.type,
      detectedFrameworks: projectInfo.frameworks,
      detectedLanguages: projectInfo.languages,
      packageManagers: projectInfo.packageManagers,
      importantFiles: this.importantFiles,
      ignoredCounts: {
        directories: this.ignoredDirectories,
        files: this.ignoredFiles,
      },
      fileStats: {
        totalFiles: this.totalFiles,
        totalDirectories: this.totalDirectories,
        byExtension: this.byExtension,
      },
      warnings: this.totalFiles >= maxFiles ? ["Max files limit reached."] : [],
      tree
    };
  }

  private resetStats() {
    this.totalFiles = 0;
    this.totalDirectories = 0;
    this.ignoredFiles = 0;
    this.ignoredDirectories = 0;
    this.byExtension = {};
    this.importantFiles = [];
  }

  private async scanDirectory(
    root: string, 
    currentPath: string, 
    depth: number, 
    maxDepth: number, 
    maxFiles: number
  ): Promise<WorkspaceFileNode[]> {
    if (depth > maxDepth || this.totalFiles >= maxFiles) {
      return [];
    }

    try {
      const entries = await fs.readdir(currentPath, { withFileTypes: true });
      const nodes: WorkspaceFileNode[] = [];

      for (const entry of entries) {
        if (this.totalFiles >= maxFiles) break;

        const entryPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(root, entryPath);

        if (entry.isDirectory()) {
          if (IGNORE_DIRECTORIES.includes(entry.name)) {
            this.ignoredDirectories++;
            continue;
          }

          this.totalDirectories++;
          const children = await this.scanDirectory(root, entryPath, depth + 1, maxDepth, maxFiles);
          nodes.push({
            name: entry.name,
            relativePath,
            type: "directory",
            children
          });
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          const lowerName = entry.name.toLowerCase();
          
          if (
            IGNORE_FILES.includes(lowerName) || 
            IGNORE_EXTENSIONS.includes(ext) ||
            SECRET_PATTERNS.some(p => lowerName.includes(p))
          ) {
            this.ignoredFiles++;
            continue;
          }

          this.totalFiles++;
          this.byExtension[ext] = (this.byExtension[ext] || 0) + 1;

          if (this.isImportantFile(entry.name)) {
            this.importantFiles.push(relativePath);
          }

          let sizeBytes = 0;
          try {
            const stats = await fs.stat(entryPath);
            sizeBytes = stats.size;
          } catch {}

          nodes.push({
            name: entry.name,
            relativePath,
            type: "file",
            extension: ext,
            sizeBytes
          });
        }
      }

      return nodes;
    } catch (error) {
      return [];
    }
  }

  private isImportantFile(name: string): boolean {
    const important = [
      "package.json",
      "tsconfig.json",
      "readme.md",
      "cargo.toml",
      "pyproject.toml",
      "requirements.txt",
      "vite.config.ts",
      "next.config.js",
      "next.config.mjs",
      "tailwind.config.js"
    ];
    return important.includes(name.toLowerCase());
  }

  private flattenTree(nodes: WorkspaceFileNode[]): WorkspaceFileNode[] {
    const flat: WorkspaceFileNode[] = [];
    for (const node of nodes) {
      flat.push(node);
      if (node.children) {
        flat.push(...this.flattenTree(node.children));
      }
    }
    return flat;
  }

  async readSafeMetadata(workspacePath: string, relativePath: string): Promise<string | null> {
    const normalized = resolveContainedExistingPath(workspacePath, relativePath);
    if (!normalized) return null;
    
    const fileName = path.basename(normalized).toLowerCase();
    const isImportant = this.isImportantFile(fileName);
    
    if (!isImportant) return null;

    try {
      const stats = await fs.stat(normalized);
      if (stats.size > MAX_FILE_SIZE_FOR_METADATA) return "FILE_TOO_LARGE";

      const content = await fs.readFile(normalized, "utf8");
      return content;
    } catch {
      return null;
    }
  }
}
