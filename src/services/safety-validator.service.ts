import { 
  AillameSafetyResult, 
  AillameSafetyValidationInput, 
  AillameSafetyIssue, 
  AillameSafetyRiskLevel 
} from '../types/safety.types';
import { AillameSuggestedFile } from '../types/response-formatter.types';

export class SafetyValidatorService {
  /**
   * Validates a formatted response for potential safety risks.
   */
  static validateFormattedResponseSafety(input: AillameSafetyValidationInput): AillameSafetyResult {
    const { formattedResponse } = input;
    const issues: AillameSafetyIssue[] = [];
    const allowedSuggestedFiles: AillameSuggestedFile[] = [];
    const blockedSuggestedFiles: AillameSuggestedFile[] = [];

    // 1. Check Suggested Files
    for (const file of formattedResponse.suggestedFiles) {
      const fileIssues = this.validateFilePath(file.path);
      const actionIssues = this.validateFileAction(file.action, file.path);
      
      const allFileIssues = [...fileIssues, ...actionIssues];
      
      if (allFileIssues.some(i => i.severity === "critical" || i.severity === "high")) {
        blockedSuggestedFiles.push(file);
        issues.push(...allFileIssues);
      } else {
        allowedSuggestedFiles.push(file);
        issues.push(...allFileIssues);
      }
    }

    // 2. Check Dangerous Content in answer, steps and file content
    const contentIssues = this.validateDangerousContent(formattedResponse);
    issues.push(...contentIssues);

    // 3. Determine overall risk level
    const riskLevel = this.calculateRiskLevel(issues);
    const safe = !issues.some(i => i.severity === "critical" || i.severity === "high");
    const requiresUserApproval = riskLevel !== "none";

    return {
      safe,
      riskLevel,
      requiresUserApproval,
      canAutoApply: false,
      issues,
      allowedSuggestedFiles,
      blockedSuggestedFiles,
      meta: {
        validator: "aillame-safety-v1",
        checkedAt: new Date().toISOString()
      }
    };
  }

  private static validateFilePath(path: string): AillameSafetyIssue[] {
    const issues: AillameSafetyIssue[] = [];

    if (!path || typeof path !== 'string' || path.trim() === "") {
      issues.push({ code: "INVALID_FILE_PATH", message: "Dosya yolu geçersiz veya boş.", severity: "high" });
      return issues;
    }

    // Path traversal
    if (path.includes('../') || path.includes('..\\')) {
      issues.push({ code: "PATH_TRAVERSAL_DETECTED", message: "Dosya yolu proje dışına çıkmaya çalışıyor.", severity: "critical", target: path });
    }

    // Absolute paths
    if (path.startsWith('/') || path.match(/^[a-zA-Z]:\\/)) {
      issues.push({ code: "ABSOLUTE_PATH_BLOCKED", message: "Mutlak dosya yolları güvenlik gerekçesiyle engellendi.", severity: "critical", target: path });
    }

    // Home dir
    if (path.startsWith('~/')) {
      issues.push({ code: "ABSOLUTE_PATH_BLOCKED", message: "Kullanıcı dizini erişimi engellendi.", severity: "high", target: path });
    }

    // Length
    if (path.length > 300) {
      issues.push({ code: "PATH_TOO_LONG", message: "Dosya yolu çok uzun.", severity: "medium", target: path });
    }

    // Null bytes
    if (path.includes('\0')) {
      issues.push({ code: "NULL_BYTE_PATH_BLOCKED", message: "Dosya yolunda geçersiz karakterler tespit edildi.", severity: "critical", target: path });
    }

    return issues;
  }

  private static validateFileAction(action: string, path: string): AillameSafetyIssue[] {
    const issues: AillameSafetyIssue[] = [];

    switch (action) {
      case "create":
        issues.push({ code: "FILE_CREATE_REQUIRES_APPROVAL", message: "Yeni dosya oluşturma kullanıcı onayı gerektirir.", severity: "medium", target: path });
        break;
      case "modify":
        issues.push({ code: "FILE_MODIFY_REQUIRES_APPROVAL", message: "Dosya değişikliği kullanıcı onayı gerektirir.", severity: "medium", target: path });
        break;
      case "delete":
        issues.push({ code: "FILE_DELETE_REQUIRES_APPROVAL", message: "Dosya silme işlemi yüksek risk içerir ve engellenmiştir.", severity: "high", target: path });
        break;
      default:
        issues.push({ code: "INVALID_FILE_ACTION", message: `Geçersiz dosya işlemi: ${action}`, severity: "medium", target: path });
    }

    return issues;
  }

  private static validateDangerousContent(response: any): AillameSafetyIssue[] {
    const issues: AillameSafetyIssue[] = [];
    const dangerousPatterns = [
      { pattern: /rm\s+-rf/i, code: "DANGEROUS_COMMAND_PATTERN", message: "Tehlikeli komut tespit edildi (rm -rf)", severity: "critical" as const },
      { pattern: /format\s+[a-z]:/i, code: "DANGEROUS_COMMAND_PATTERN", message: "Tehlikeli komut tespit edildi (format)", severity: "critical" as const },
      { pattern: /powershell\s+-EncodedCommand/i, code: "DANGEROUS_COMMAND_PATTERN", message: "Tehlikeli powershell komutu tespit edildi.", severity: "critical" as const },
      { pattern: /sudo\s+/i, code: "TERMINAL_COMMAND_REQUIRES_REVIEW", message: "Yüksek yetkili komut kullanımı (sudo)", severity: "high" as const },
      { pattern: /curl\s+.*\s+\|\s*sh/i, code: "POTENTIAL_CODE_EXECUTION", message: "Dışarıdan script indirme ve çalıştırma riski.", severity: "high" as const },
      { pattern: /wget\s+.*\s+\|\s*sh/i, code: "POTENTIAL_CODE_EXECUTION", message: "Dışarıdan script indirme ve çalıştırma riski.", severity: "high" as const },
      { pattern: /chmod\s+777/i, code: "TERMINAL_COMMAND_REQUIRES_REVIEW", message: "Geniş yetkili izin değişikliği (chmod 777)", severity: "medium" as const },
      { pattern: /eval\(/i, code: "POTENTIAL_CODE_EXECUTION", message: "Dinamik kod çalıştırma riski (eval)", severity: "high" as const },
      { pattern: /child_process/i, code: "POTENTIAL_CODE_EXECUTION", message: "Alt süreç başlatma riski (child_process)", severity: "medium" as const }
    ];

    const checkText = (text: string) => {
      if (!text) return;
      for (const p of dangerousPatterns) {
        if (p.pattern.test(text)) {
          issues.push({
            code: p.code,
            message: p.message,
            severity: p.severity
          });
        }
      }
    };

    checkText(response.answer);
    response.steps.forEach((s: any) => checkText(s.description));
    response.suggestedFiles.forEach((f: any) => checkText(f.content || ""));

    return issues;
  }

  private static calculateRiskLevel(issues: AillameSafetyIssue[]): AillameSafetyRiskLevel {
    if (issues.length === 0) return "none";
    
    if (issues.some(i => i.severity === "critical")) return "critical";
    if (issues.some(i => i.severity === "high")) return "high";
    if (issues.some(i => i.severity === "medium")) return "medium";
    return "low";
  }
}
