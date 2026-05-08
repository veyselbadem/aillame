import { WorkspaceScanSummary, WorkspaceFileNode } from "../workspace-scanner/types";
import { WorkspaceAgentContext } from "./types";

export class WorkspaceContextBuilder {
  private static MAX_COMPACT_NODES = 80;
  private static MAX_COMPACT_DEPTH = 6;

  build(summary: WorkspaceScanSummary): WorkspaceAgentContext {
    const compactTree: WorkspaceAgentContext["compactTree"] = [];
    this.flattenToCompactTree(summary.tree, "", 0, compactTree);

    return {
      safeRootName: summary.safeRootName,
      projectType: summary.projectType,
      detectedFrameworks: summary.detectedFrameworks,
      detectedLanguages: summary.detectedLanguages,
      packageManagers: summary.packageManagers,
      importantFiles: summary.importantFiles,
      relevantDirectories: this.extractRelevantDirectories(summary.tree),
      fileStats: summary.fileStats,
      safetySummary: {
        secretsExcluded: true,
        heavyFilesExcluded: true,
        generatedAssetsExcluded: true,
        absolutePathsMasked: true
      },
      compactTree: compactTree.slice(0, WorkspaceContextBuilder.MAX_COMPACT_NODES),
      warnings: summary.warnings
    };
  }

  private flattenToCompactTree(
    nodes: WorkspaceFileNode[], 
    currentPath: string, 
    depth: number, 
    result: WorkspaceAgentContext["compactTree"]
  ) {
    if (depth > WorkspaceContextBuilder.MAX_COMPACT_DEPTH || result.length >= WorkspaceContextBuilder.MAX_COMPACT_NODES) {
      return;
    }

    for (const node of nodes) {
      if (result.length >= WorkspaceContextBuilder.MAX_COMPACT_NODES) break;

      const nodePath = currentPath ? `${currentPath}/${node.name}` : node.name;
      
      let reason: string | undefined;
      if (this.isImportantPath(node.name)) {
        reason = "Important project file";
      }

      result.push({
        path: nodePath,
        type: node.type,
        reason
      });

      if (node.children && node.children.length > 0) {
        this.flattenToCompactTree(node.children, nodePath, depth + 1, result);
      }
    }
  }

  private isImportantPath(name: string): boolean {
    const lower = name.toLowerCase();
    return [
      "package.json", "tsconfig.json", "readme.md", 
      "src", "app", "core", "components", "api", "lib",
      "next.config", "vite.config", "tailwind.config",
      "prisma", "cargo.toml", "pyproject.toml"
    ].some(important => lower.includes(important));
  }

  private extractRelevantDirectories(nodes: WorkspaceFileNode[]): string[] {
    const relevant = ["src", "app", "core", "components", "api", "lib", "prisma", "public", "tests"];
    return nodes
      .filter(n => n.type === "directory" && relevant.includes(n.name.toLowerCase()))
      .map(n => n.name);
  }
}
