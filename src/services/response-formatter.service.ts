import { 
  AillameFormattedResponse, 
  AillameFormattedStep, 
  AillameSuggestedFile, 
  AillameFormattedWarning 
} from '../types/response-formatter.types';

export class ResponseFormatterService {
  /**
   * Formats raw runtime output into a structured Aillame response.
   */
  static formatRuntimeResponse(input: {
    rawText: string;
    projectId: string;
    mode: string;
    taskType?: string;
  }): AillameFormattedResponse {
    const { rawText } = input;
    const createdAt = new Date().toISOString();
    const rawTextPreview = rawText.substring(0, 1000);

    // Initial default state
    let formatted: AillameFormattedResponse = {
      answer: rawText,
      summary: "",
      steps: [],
      suggestedFiles: [],
      warnings: [],
      rawTextPreview,
      meta: {
        formatted: true,
        parser: "aillame-basic-v1",
        detectedStructuredJson: false,
        createdAt
      }
    };

    if (!rawText || rawText.trim() === "") {
      formatted.answer = "Modelden boş cevap döndü.";
      return formatted;
    }

    // 1. Try to extract and parse JSON block
    const jsonBlock = this.extractJsonBlock(rawText);
    if (jsonBlock) {
      try {
        const parsed = JSON.parse(jsonBlock);
        
        // Normalize parsed data
        formatted.answer = parsed.answer || formatted.answer;
        formatted.summary = parsed.summary || "";
        formatted.steps = Array.isArray(parsed.steps) ? this.normalizeSteps(parsed.steps) : [];
        formatted.suggestedFiles = Array.isArray(parsed.suggestedFiles) ? this.normalizeFiles(parsed.suggestedFiles) : [];
        formatted.warnings = Array.isArray(parsed.warnings) ? this.normalizeWarnings(parsed.warnings) : [];
        
        formatted.meta.detectedStructuredJson = true;
        return formatted;
      } catch (e) {
        console.warn("[ResponseFormatter] Failed to parse detected JSON block:", e);
        // Fallback to manual parsing if JSON block is present but invalid
      }
    }

    // 2. Manual parsing / Markdown step extraction if no valid JSON found
    formatted.steps = this.extractStepsFromMarkdown(rawText);

    return formatted;
  }

  /**
   * Extracts a JSON block from text using regex.
   * Supports ```json ... ``` or just { ... }.
   */
  private static extractJsonBlock(text: string): string | null {
    // Try triple backtick json first
    const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/i;
    const match = text.match(codeBlockRegex);
    if (match && match[1]) return match[1].trim();

    // Try finding the first { and last }
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return text.substring(firstBrace, lastBrace + 1).trim();
    }

    return null;
  }

  private static normalizeSteps(steps: any[]): AillameFormattedStep[] {
    return steps.map(s => ({
      type: s.type || "explanation",
      title: s.title || "Adım",
      description: s.description || ""
    })).filter(s => s.description !== "");
  }

  private static normalizeFiles(files: any[]): AillameSuggestedFile[] {
    return files.map(f => ({
      path: f.path || "unknown",
      action: f.action || "modify",
      reason: f.reason || "",
      content: f.content,
      language: f.language
    })).filter(f => f.path !== "unknown");
  }

  private static normalizeWarnings(warnings: any[]): AillameFormattedWarning[] {
    return warnings.map(w => ({
      code: w.code || "GENERAL_WARNING",
      message: w.message || "",
      severity: w.severity || "low"
    })).filter(w => w.message !== "");
  }

  /**
   * Basic heuristic to extract steps from markdown headers or lists.
   */
  private static extractStepsFromMarkdown(text: string): AillameFormattedStep[] {
    const steps: AillameFormattedStep[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const headerMatch = line.match(/^(?:#{1,4}|(?:\d+\.))\s*(.+)$/);
      if (headerMatch && headerMatch[1]) {
        steps.push({
          type: "explanation",
          title: headerMatch[1].trim(),
          description: "İçerik için ham metni inceleyin."
        });
      }
      if (steps.length >= 5) break; // Limit auto-extracted steps
    }

    return steps;
  }
}
