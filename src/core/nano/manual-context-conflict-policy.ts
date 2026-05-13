import {
  MANUAL_CONTEXT_END_MARKER,
  MANUAL_CONTEXT_START_MARKER,
} from "../indexing/manual-context-boundary";
import { detectVisibleManualContextInUserMessage } from "./visible-context-policy";
import { detectVisibleManualContextReferences } from "./visible-reference-policy";

export type ManualContextConflictSignal =
  | "opposite_status_enabled_disabled"
  | "opposite_status_true_false"
  | "opposite_status_success_failed"
  | "opposite_status_allowed_blocked"
  | "opposite_status_var_yok"
  | "reference_mismatch_signal"
  | "user_request_context_mismatch"
  | "boundary_invalid";

export type ManualContextConflictReasonCode =
  | "none"
  | "single_item_no_conflict"
  | "multiple_items_with_opposite_status"
  | "reference_mismatch_possible"
  | "request_mismatch_with_visible_context"
  | "manual_context_boundary_invalid";

export interface ManualContextConflictDetection {
  hasManualContext: boolean;
  hasMultipleContextItems: boolean;
  hasPotentialConflict: boolean;
  conflictSignals: ManualContextConflictSignal[];
  conflictCount: number;
  safeReasonCodes: ManualContextConflictReasonCode[];
  needsClarification: boolean;
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

function extractSnippetLines(message: string): string[] {
  const block = extractVisibleManualContextBlock(message);
  if (!block) {
    return [];
  }

  return block
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*Alinti:\s*(.*)$/i)?.[1]?.trim() || "")
    .filter((line) => line.length > 0);
}

function countContextItems(message: string): number {
  const block = extractVisibleManualContextBlock(message);
  if (!block) {
    return 0;
  }
  const matches = block.match(/\n\d+\.\s+/g);
  return matches ? matches.length : 0;
}

function hasBoth(text: string, a: RegExp, b: RegExp): boolean {
  return a.test(text) && b.test(text);
}

function detectOppositeStatusSignals(joinedSnippetText: string): ManualContextConflictSignal[] {
  const signals: ManualContextConflictSignal[] = [];

  if (hasBoth(joinedSnippetText, /\benabled\b/i, /\bdisabled\b/i)) {
    signals.push("opposite_status_enabled_disabled");
  }
  if (hasBoth(joinedSnippetText, /\btrue\b/i, /\bfalse\b/i)) {
    signals.push("opposite_status_true_false");
  }
  if (hasBoth(joinedSnippetText, /\bsuccess\b/i, /\bfailed\b/i)) {
    signals.push("opposite_status_success_failed");
  }
  if (hasBoth(joinedSnippetText, /\ballowed\b/i, /\bblocked\b/i)) {
    signals.push("opposite_status_allowed_blocked");
  }
  if (hasBoth(joinedSnippetText, /\bvar\b/i, /\byok\b/i)) {
    signals.push("opposite_status_var_yok");
  }

  return signals;
}

function detectUserRequestMismatch(message: string, joinedSnippetText: string): boolean {
  const asksEnable = /\benable|aktif et|aç\b/i.test(message);
  const asksDisable = /\bdisable|pasif et|kapat\b/i.test(message);

  const snippetEnabled = /\benabled\b/i.test(joinedSnippetText);
  const snippetDisabled = /\bdisabled\b/i.test(joinedSnippetText);

  if (asksEnable && snippetDisabled) {
    return true;
  }
  if (asksDisable && snippetEnabled) {
    return true;
  }
  return false;
}

export function detectManualContextConflicts(message: string): ManualContextConflictDetection {
  const visibleContext = detectVisibleManualContextInUserMessage(message);
  if (!visibleContext.hasVisibleManualContext) {
    return {
      hasManualContext: false,
      hasMultipleContextItems: false,
      hasPotentialConflict: false,
      conflictSignals: [],
      conflictCount: 0,
      safeReasonCodes: [],
      needsClarification: false,
    };
  }

  const conflictSignals: ManualContextConflictSignal[] = [];
  const safeReasonCodes: ManualContextConflictReasonCode[] = [];

  const contextItemCount = countContextItems(message);
  const hasMultipleContextItems = contextItemCount > 1;

  if (visibleContext.status !== "present_intact") {
    conflictSignals.push("boundary_invalid");
    safeReasonCodes.push("manual_context_boundary_invalid");
  }

  const snippetLines = extractSnippetLines(message);
  const joinedSnippetText = snippetLines.join(" ");
  const oppositeSignals = detectOppositeStatusSignals(joinedSnippetText);
  conflictSignals.push(...oppositeSignals);

  if (hasMultipleContextItems && oppositeSignals.length > 0) {
    safeReasonCodes.push("multiple_items_with_opposite_status");
  }

  const referenceDetection = detectVisibleManualContextReferences(message);
  if (referenceDetection.referenceCount > 1 && oppositeSignals.length > 0) {
    conflictSignals.push("reference_mismatch_signal");
    safeReasonCodes.push("reference_mismatch_possible");
  }

  if (detectUserRequestMismatch(message, joinedSnippetText)) {
    conflictSignals.push("user_request_context_mismatch");
    safeReasonCodes.push("request_mismatch_with_visible_context");
  }

  if (safeReasonCodes.length === 0) {
    safeReasonCodes.push("single_item_no_conflict");
  }

  const hasPotentialConflict =
    conflictSignals.some((signal) => signal !== "boundary_invalid") ||
    safeReasonCodes.includes("multiple_items_with_opposite_status") ||
    safeReasonCodes.includes("reference_mismatch_possible") ||
    safeReasonCodes.includes("request_mismatch_with_visible_context");

  const needsClarification =
    hasPotentialConflict || safeReasonCodes.includes("manual_context_boundary_invalid");

  return {
    hasManualContext: true,
    hasMultipleContextItems,
    hasPotentialConflict,
    conflictSignals: Array.from(new Set(conflictSignals)),
    conflictCount: Array.from(new Set(conflictSignals)).length,
    safeReasonCodes: Array.from(new Set(safeReasonCodes)),
    needsClarification,
  };
}

export function getManualContextConflictGuidance(message: string): string {
  const detection = detectManualContextConflicts(message);
  if (!detection.hasManualContext || !detection.needsClarification) {
    return "";
  }

  const rules: string[] = [
    "Görünür manuel context içinde çelişki/uyuşmazlık şüphesi varsa kesin hüküm verme.",
    "'Paylaştığın görünür context içinde bir uyuşmazlık var gibi görünüyor.' ifadesini uygun yerde kullan.",
    "Neyin uyuşmadığını kısa ve genel düzeyde belirt; tam dosya erişimi iddiasına girme.",
    "'Dosyanın tamamını görmeden hangisinin güncel olduğunu kesin söyleyemem.' sınırını koru.",
    "Netleştirme için güncel fonksiyon/parça veya ilgili hata çıktısını kullanıcıdan iste.",
    "Referans etiketi üzerinden dosyayı takip ettiğini iddia etme; yalnızca görünen metne dayan.",
  ];

  if (detection.safeReasonCodes.includes("multiple_items_with_opposite_status")) {
    rules.push("Birden fazla snippet aynı konuda karşıt durumlar içeriyor olabilir; önce güncel olanı netleştir.");
  }

  if (detection.safeReasonCodes.includes("reference_mismatch_possible")) {
    rules.push("Farklı referans etiketlerinde farklı sonuçlar görünüyor olabilir; referanslar arası netleştirme iste.");
  }

  if (detection.safeReasonCodes.includes("request_mismatch_with_visible_context")) {
    rules.push("Kullanıcı talebi ile görünen snippet arasında uyuşmazlık olabileceğini belirt ve hangi hedefin istendiğini sor.");
  }

  if (detection.safeReasonCodes.includes("manual_context_boundary_invalid")) {
    rules.push("Boundary bozuksa yalnızca görünen kısma dayan ve bloğun tamamının yeniden paylaşılmasını iste.");
  }

  return rules.join(" ");
}
