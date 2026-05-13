import {
  MANUAL_CONTEXT_END_MARKER,
  MANUAL_CONTEXT_START_MARKER,
} from "../indexing/manual-context-boundary";
import { detectVisibleManualContextInUserMessage } from "./visible-context-policy";

const MAX_VISIBLE_REFERENCE_SUMMARIES = 5;

const PATH_LIKE_PATTERN =
  /(\/home\/|\/Users\/|[a-zA-Z]:\\|\\\\|\/mnt\/|\.aillame-data|\.{2}[/\\])/gi;
const SECRET_LIKE_PATTERN =
  /(password|secret|token|bearer|api[_-]?key|apikey|private[_-]?key|credential|auth[_-]?token)/gi;

export type VisibleReferenceWarningType =
  | "reference_missing"
  | "reference_ambiguous"
  | "reference_path_pattern"
  | "reference_secret_pattern"
  | "reference_limit_applied";

export interface VisibleReferenceWarning {
  type: VisibleReferenceWarningType;
  message: string;
}

export interface VisibleManualContextReferenceDetection {
  hasVisibleManualContext: boolean;
  hasReferences: boolean;
  referenceCount: number;
  safeReferenceSummaries: string[];
  warnings: VisibleReferenceWarning[];
}

function extractVisibleManualContextBlock(message: string): string {
  const startIndex = message.indexOf(MANUAL_CONTEXT_START_MARKER);
  if (startIndex === -1) {
    return "";
  }

  const endIndex = message.indexOf(MANUAL_CONTEXT_END_MARKER, startIndex);
  if (endIndex === -1) {
    return message.slice(startIndex);
  }

  return message.slice(startIndex, endIndex + MANUAL_CONTEXT_END_MARKER.length);
}

function normalizeVisibleReferenceSummary(value: string): {
  summary: string;
  hasPathPattern: boolean;
  hasSecretPattern: boolean;
  isAmbiguous: boolean;
} {
  const raw = value.trim();
  if (!raw) {
    return {
      summary: "Görünen referans etiketi belirsiz.",
      hasPathPattern: false,
      hasSecretPattern: false,
      isAmbiguous: true,
    };
  }

  const hasPathPattern = PATH_LIKE_PATTERN.test(raw);
  const hasSecretPattern = SECRET_LIKE_PATTERN.test(raw);

  if (hasPathPattern || hasSecretPattern) {
    return {
      summary: "Görünen referans etiketi (değer güvenlik nedeniyle tekrar edilmedi).",
      hasPathPattern,
      hasSecretPattern,
      isAmbiguous: false,
    };
  }

  const compact = raw.replace(/\s+/g, " ").slice(0, 100);
  return {
    summary: `Görünen referans etiketi: ${compact}`,
    hasPathPattern,
    hasSecretPattern,
    isAmbiguous: false,
  };
}

export function detectVisibleManualContextReferences(
  message: string
): VisibleManualContextReferenceDetection {
  const contextDetected = detectVisibleManualContextInUserMessage(message);
  if (!contextDetected.hasVisibleManualContext) {
    return {
      hasVisibleManualContext: false,
      hasReferences: false,
      referenceCount: 0,
      safeReferenceSummaries: [],
      warnings: [],
    };
  }

  const block = extractVisibleManualContextBlock(message);
  const lines = block.split(/\r?\n/);
  const warnings: VisibleReferenceWarning[] = [];
  const safeReferenceSummaries: string[] = [];

  for (const line of lines) {
    const match = line.match(/^\s*Referans:\s*(.*)$/i);
    if (!match) {
      continue;
    }

    const normalized = normalizeVisibleReferenceSummary(match[1] || "");

    if (normalized.isAmbiguous) {
      warnings.push({
        type: "reference_ambiguous",
        message: "Görünen referans eksik veya belirsiz olabilir.",
      });
    }
    if (normalized.hasPathPattern) {
      warnings.push({
        type: "reference_path_pattern",
        message: "Referans satırında path benzeri desen var; değeri tekrar etme.",
      });
    }
    if (normalized.hasSecretPattern) {
      warnings.push({
        type: "reference_secret_pattern",
        message: "Referans satırında hassas desen var; değeri tekrar etme.",
      });
    }

    safeReferenceSummaries.push(normalized.summary);
  }

  if (safeReferenceSummaries.length === 0) {
    warnings.push({
      type: "reference_missing",
      message: "Görünür manual context içinde referans satırı bulunamadı.",
    });
  }

  if (safeReferenceSummaries.length > MAX_VISIBLE_REFERENCE_SUMMARIES) {
    warnings.push({
      type: "reference_limit_applied",
      message: `Yalnızca ilk ${MAX_VISIBLE_REFERENCE_SUMMARIES} referans özeti dikkate alındı.`,
    });
  }

  return {
    hasVisibleManualContext: true,
    hasReferences: safeReferenceSummaries.length > 0,
    referenceCount: safeReferenceSummaries.length,
    safeReferenceSummaries: safeReferenceSummaries.slice(0, MAX_VISIBLE_REFERENCE_SUMMARIES),
    warnings,
  };
}

export function getVisibleReferenceResponseGuidance(message: string): string {
  const detection = detectVisibleManualContextReferences(message);
  if (!detection.hasVisibleManualContext) {
    return "";
  }

  const rules: string[] = [
    "Referans satırlarını yalnızca kullanıcının görünür mesajında paylaşılan referans etiketi olarak ele al.",
    "Referans bilgisini dosya yoluna çözümleme veya takip etme girişimi yapma.",
    "Gerektiğinde 'Paylaşılan referans etiketine göre' veya 'Görünen referans bilgisinde' gibi güvenli ifade kullan.",
    "Referans etiketi dosyanın tamamına eriştiğin anlamına gelmez; cevabı yine snippet sınırında tut.",
    "Referans satırı bozuk veya belirsiz görünüyorsa bunu açıkça belirt ve ek görünür bilgi iste.",
    "Referans bilgisini gizli metadata gibi kullanma; yalnızca görünür kullanıcı metnine dayan.",
  ];

  if (detection.warnings.some((w) => w.type === "reference_path_pattern" || w.type === "reference_secret_pattern")) {
    rules.push(
      "Referans satırında path/hassas desen varsa değeri tekrar etmeden genel güvenlik uyarısı ver."
    );
  }

  if (!detection.hasReferences) {
    rules.push("Referans satırı yoksa cevabı yalnızca görünen snippet/alıntı temelinde sürdür.");
  }

  return rules.join(" ");
}
