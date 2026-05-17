import { ProjectScanSummary, ProjectFileSummary } from "./doomsgame.types";
import { readdirSync, statSync, existsSync } from "fs";
import { join, extname, basename } from "path";

export class DoomsgameProjectScanner {
  private static IGNORED_DIRS = [
    "node_modules", ".git", "dist", "build", ".next", "target", "vendor", 
    "coverage", ".cache", "logs", "temp", "tmp"
  ];
  
  private static IGNORED_FILE_PATTERNS = [
    /^\.env/, /\.pem$/, /\.key$/, /\.crt$/, /secret/i, /password/i, /token/i
  ];

  private static ALLOWED_EXTENSIONS = [
    ".js", ".ts", ".json", ".scene", ".scene.json", ".asset.json", ".md", ".txt", ".css", ".html"
  ];

  private static MAX_FILES = 200;

  static scan(projectPath: string): ProjectScanSummary {
    const summary: ProjectScanSummary = {
      projectPath,
      scanned: false,
      files: [],
      ignoredDirectories: [],
      ignoredFiles: [],
      warnings: []
    };

    if (!existsSync(projectPath)) {
      summary.warnings.push("Proje yolu bulunamadı.");
      return summary;
    }

    if (!statSync(projectPath).isDirectory()) {
      summary.warnings.push("Proje yolu bir klasör değil.");
      return summary;
    }

    try {
      this.scanDir(projectPath, projectPath, summary);
      summary.scanned = true;
    } catch (error: any) {
      summary.warnings.push(`Tarama sırasında hata oluştu: ${error.message}`);
    }

    return summary;
  }

  private static scanDir(basePath: string, currentPath: string, summary: ProjectScanSummary) {
    if (summary.files.length >= this.MAX_FILES) return;

    const items = readdirSync(currentPath);

    for (const item of items) {
      if (summary.files.length >= this.MAX_FILES) break;

      const fullPath = join(currentPath, item);
      const relativePath = fullPath.replace(basePath, "").replace(/^[\\/]/, "");
      const stats = statSync(fullPath);

      if (stats.isDirectory()) {
        if (this.IGNORED_DIRS.includes(item)) {
          summary.ignoredDirectories.push(relativePath);
          continue;
        }
        this.scanDir(basePath, fullPath, summary);
      } else {
        if (this.isIgnoredFile(item)) {
          summary.ignoredFiles.push(relativePath);
          continue;
        }

        const ext = extname(item).toLowerCase();
        if (this.ALLOWED_EXTENSIONS.includes(ext)) {
          summary.files.push({
            path: relativePath,
            extension: ext,
            sizeBytes: stats.size,
            kind: this.mapKind(ext)
          });
        }
      }
    }
  }

  private static isIgnoredFile(filename: string): boolean {
    return this.IGNORED_FILE_PATTERNS.some(pattern => pattern.test(filename));
  }

  private static mapKind(ext: string): ProjectFileSummary["kind"] {
    if (ext === ".scene" || ext === ".scene.json") return "scene";
    if (ext === ".js" || ext === ".ts") return "script";
    if (ext === ".asset.json") return "asset";
    if (ext === ".json" || ext === ".config") return "config";
    return "unknown";
  }
}
