import { CodePatchFileChange, CodePatchChangeType } from "./patch-workflow-types";
import { CodeAgentRiskLevel } from "./code-agent-types";

export class PatchFormatter {
  static createPreview(params: {
    filePath: string;
    changeType: CodePatchChangeType;
    before?: string;
    after?: string;
  }): CodePatchFileChange {
    const { filePath, changeType, before = "", after = "" } = params;
    
    // Safety check for sensitive files
    const isSensitive = this.isSensitiveFile(filePath);
    const riskLevel: CodeAgentRiskLevel = isSensitive ? "blocked" : "low";
    const warnings: string[] = [];
    
    if (isSensitive) {
      warnings.push("Sensitive file - patch preview and apply are blocked by default.");
    }

    // Basic additions/deletions count
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    
    // Simplistic diff for preview (In a real app, use a diff lib)
    const additions = afterLines.length;
    const deletions = beforeLines.length;

    return {
      filePath: this.sanitizePath(filePath),
      changeType,
      beforeSnippet: isSensitive ? undefined : this.redactSecrets(before),
      afterSnippet: isSensitive ? undefined : this.redactSecrets(after),
      unifiedDiff: isSensitive ? undefined : `--- ${filePath}\n+++ ${filePath}\n@@ -1,${beforeLines.length} +1,${afterLines.length} @@\n${after}`,
      additions,
      deletions,
      riskLevel,
      warnings
    };
  }

  private static sanitizePath(filePath: string): string {
    // Ensure relative path only
    return filePath.replace(/^[a-zA-Z]:\\/, '').replace(/^\\/, '').replace(/^\//, '');
  }

  private static isSensitiveFile(filePath: string): boolean {
    const sensitivePatterns = [
      /\.env$/,
      /\.key$/,
      /\.pem$/,
      /node_modules/,
      /\.next/,
      /\.git/,
      /package-lock\.json/,
      /secrets/i,
      /credentials/i
    ];
    return sensitivePatterns.some(p => p.test(filePath));
  }

  private static redactSecrets(content: string): string {
    // Simple redaction for common secret patterns
    return content
      .replace(/API_KEY\s*[:=]\s*['"].*?['"]/gi, 'API_KEY: "REDACTED"')
      .replace(/SECRET\s*[:=]\s*['"].*?['"]/gi, 'SECRET: "REDACTED"')
      .replace(/PASSWORD\s*[:=]\s*['"].*?['"]/gi, 'PASSWORD: "REDACTED"');
  }
}
