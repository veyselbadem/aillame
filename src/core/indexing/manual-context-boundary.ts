/**
 * Manual Context Boundary Detection and Metadata Helper
 *
 * Purpose: Detect and analyze visible manual context blocks in chat draft text
 * without triggering RAG, retrieval, or hidden prompt injection.
 */

export const MANUAL_CONTEXT_START_MARKER = "[Workspace Context - Manuel Eklenen]";
export const MANUAL_CONTEXT_END_MARKER = "[/Workspace Context - Manuel Eklenen]";

export interface ManualContextBoundaryMetadata {
  isPresent: boolean;
  startIndex: number;
  endIndex: number;
  blockText: string;
  itemCount: number;
  approximateCharCount: number;
  warnings: ManualContextBoundaryWarning[];
}

export interface ManualContextBoundaryWarning {
  type: "marker_mismatch" | "unterminated_block" | "size_large" | "path_pattern" | "secret_pattern";
  message: string;
}

const PATH_PATTERN = /(\/home\/|\/Users\/|[a-zA-Z]:\\|\\\\|\/mnt\/|\.aillame-data|\$\{)/gi;
const SECRET_PATTERN = /(password|secret|token|bearer|api[_-]?key|apikey|private[_-]?key|private_key|authentication|credential|auth[_-]?token|authtoken)/gi;

export function detectManualContextBoundary(draftText: string): ManualContextBoundaryMetadata {
  const warnings: ManualContextBoundaryWarning[] = [];

  const startIdx = draftText.indexOf(MANUAL_CONTEXT_START_MARKER);
  const endIdx = draftText.indexOf(MANUAL_CONTEXT_END_MARKER);

  if (startIdx === -1) {
    return {
      isPresent: false,
      startIndex: -1,
      endIndex: -1,
      blockText: "",
      itemCount: 0,
      approximateCharCount: 0,
      warnings: [],
    };
  }

  if (endIdx === -1) {
    warnings.push({
      type: "unterminated_block",
      message: "Manual context bloğu başlamış ama bitmemiş. Blok eksik veya bozuk olabilir.",
    });
    const blockText = draftText.substring(startIdx);
    return {
      isPresent: true,
      startIndex: startIdx,
      endIndex: -1,
      blockText,
      itemCount: countContextItems(blockText),
      approximateCharCount: blockText.length,
      warnings,
    };
  }

  if (endIdx < startIdx) {
    warnings.push({
      type: "marker_mismatch",
      message: "Bitiş marker'ı başlangıç marker'ından önce. Blok yapısı bozuk.",
    });
    return {
      isPresent: false,
      startIndex: -1,
      endIndex: -1,
      blockText: "",
      itemCount: 0,
      approximateCharCount: 0,
      warnings,
    };
  }

  const endMarkerEnd = endIdx + MANUAL_CONTEXT_END_MARKER.length;
  const blockText = draftText.substring(startIdx, endMarkerEnd);

  const charCount = blockText.length;
  if (charCount > 2000) {
    warnings.push({
      type: "size_large",
      message: `Manual context bloğu çok büyük (${charCount} karakter). Mesaj çok uzun olabilir.`,
    });
  }

  const itemCount = countContextItems(blockText);

  // Safe pattern checks for user awareness only
  if (PATH_PATTERN.test(blockText)) {
    warnings.push({
      type: "path_pattern",
      message: "Blok içinde yol benzeri içerik tespit edildi. Lütfen tıklama öncesi kontrol et.",
    });
  }

  if (SECRET_PATTERN.test(blockText)) {
    warnings.push({
      type: "secret_pattern",
      message: "Blok içinde gizli kelime benzeri içerik tespit edildi. Lütfen tıklama öncesi kontrol et.",
    });
  }

  return {
    isPresent: true,
    startIndex: startIdx,
    endIndex: endIdx,
    blockText,
    itemCount,
    approximateCharCount: charCount,
    warnings,
  };
}

function countContextItems(blockText: string): number {
  // Count numbered items like "1. filename\n" or "2. filename\n"
  const matches = blockText.match(/\n\d+\.\s+[^\n]+/g);
  return matches ? matches.length : 0;
}

export function isManualContextBoundaryValid(metadata: ManualContextBoundaryMetadata): boolean {
  if (!metadata.isPresent) return false;
  if (metadata.endIndex === -1) return false;
  if (metadata.warnings.some((w) => w.type === "marker_mismatch")) return false;
  return true;
}

export function getManualContextBoundaryUserMessage(metadata: ManualContextBoundaryMetadata): string {
  if (!metadata.isPresent) {
    return "";
  }

  const lines: string[] = [];
  lines.push("📦 Bu mesajda manuel eklenmiş workspace context var.");
  lines.push(`📍 Context: ~${metadata.itemCount} oge, ~${metadata.approximateCharCount} karakter.`);
  lines.push("✓ Gönderdiğinde bu görünür metin model mesajının parçası olur.");
  lines.push("ℹ️ Otomatik dosya okuma, RAG veya hidden prompt injection yapılmaz.");

  if (metadata.warnings.length > 0) {
    lines.push("⚠️ Uyarılar:");
    for (const warning of metadata.warnings.slice(0, 3)) {
      lines.push(`  • ${warning.message}`);
    }
  }

  return lines.join("\n");
}
