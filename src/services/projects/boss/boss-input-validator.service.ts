import { BossAnalysisRequest } from "./boss.types";

export class BossInputValidator {
  private static MAX_SOURCES = 10;
  private static MAX_SOURCE_CONTENT = 6000;
  private static MAX_TOTAL_CONTENT = 20000;

  static validate(request: BossAnalysisRequest): { valid: boolean; error?: string; code?: string } {
    if (!request.sources || !Array.isArray(request.sources) || request.sources.length === 0) {
      return { valid: false, code: "BOSS_SOURCES_REQUIRED", error: "En az bir kaynak sağlanmalıdır." };
    }

    if (request.sources.length > this.MAX_SOURCES) {
      return { valid: false, code: "BOSS_TOO_MANY_SOURCES", error: `Maksimum ${this.MAX_SOURCES} kaynak gönderilebilir.` };
    }

    if (!request.analysisRequest || request.analysisRequest.trim().length === 0) {
      return { valid: false, code: "BOSS_ANALYSIS_REQUEST_REQUIRED", error: "Analiz isteği boş olamaz." };
    }

    let totalLength = 0;
    for (const source of request.sources) {
      if (!source.title || source.title.trim().length === 0) {
        return { valid: false, code: "BOSS_SOURCE_TITLE_REQUIRED", error: "Her kaynağın bir başlığı olmalıdır." };
      }
      if (!source.content || source.content.trim().length === 0) {
        return { valid: false, code: "BOSS_SOURCE_CONTENT_REQUIRED", error: "Kaynak içeriği boş olamaz." };
      }
      if (source.content.length > this.MAX_SOURCE_CONTENT) {
        return { valid: false, code: "BOSS_SOURCE_TOO_LONG", error: `Bir kaynak içeriği maksimum ${this.MAX_SOURCE_CONTENT} karakter olabilir.` };
      }
      totalLength += source.content.length;
    }

    if (totalLength > this.MAX_TOTAL_CONTENT) {
      return { valid: false, code: "BOSS_TOTAL_CONTENT_TOO_LONG", error: `Toplam içerik uzunluğu maksimum ${this.MAX_TOTAL_CONTENT} karakter olabilir.` };
    }

    return { valid: true };
  }
}
