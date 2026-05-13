/**
 * Manual Context UX State Helper
 *
 * Safely summarizes manual context state for UI display.
 * No raw drafts, raw context blocks, paths, or secrets.
 */

import type { StagedContextState } from "../indexing/staged-context-types";
import type { ManualContextBoundaryMetadata } from "../indexing/manual-context-boundary";
import type { ChatMessageAuditResult } from "./message-audit-types";

export interface ManualContextUXState {
  stagedItemCount: number;
  draftHasManualContext: boolean;
  boundaryValid: boolean;
  hasAuditWarnings: boolean;
  canAttachToDraft: boolean;
  canRemoveFromDraft: boolean;
  attachButtonLabel: string;
  removeButtonLabel: string;
  statusMessage: string | null;
  warningMessage: string | null;
}

/**
 * Create safe UX state from context state and audit result.
 */
export function createManualContextUXState(
  stagedState: StagedContextState | null,
  boundaryMetadata: ManualContextBoundaryMetadata,
  auditResult: ChatMessageAuditResult | null
): ManualContextUXState {
  const stagedCount = stagedState?.items.length ?? 0;
  const hasDraftContext = boundaryMetadata.isPresent;
  const boundaryOk = boundaryMetadata.isPresent ? boundaryMetadata.warnings.length === 0 : true;
  const auditWarnings = auditResult?.warnings.filter((w) => w.severity !== "info") ?? [];

  return {
    stagedItemCount: stagedCount,
    draftHasManualContext: hasDraftContext,
    boundaryValid: boundaryOk,
    hasAuditWarnings: auditWarnings.length > 0,
    canAttachToDraft: stagedCount > 0 && !hasDraftContext,
    canRemoveFromDraft: hasDraftContext && boundaryOk,
    attachButtonLabel: stagedCount > 0 ? `Taslağa Ekle (${stagedCount})` : "Seçilen yok",
    removeButtonLabel: "Kaldır",
    statusMessage:
      stagedCount > 0 && !hasDraftContext
        ? `${stagedCount} snippet seçili. Taslağa eklemek için butona tıkla.`
        : null,
    warningMessage:
      !boundaryOk && hasDraftContext
        ? "Context bloğu tamamlanmamış görünüyor; metni kontrol et."
        : null,
  };
}

/**
 * Generate context summary for display (no raw content).
 */
export function getContextDisplaySummary(
  state: ManualContextUXState
): { title: string; items: string[] } {
  const items: string[] = [];

  if (state.draftHasManualContext) {
    items.push(`📦 ${state.boundaryValid ? "Doğrulandı" : "⚠️ Uyarı var"}`);
  }

  if (state.hasAuditWarnings) {
    items.push("🔒 Audit uyarısı");
  }

  return {
    title: state.draftHasManualContext
      ? "Manuel workspace context var"
      : "Manuel context seçilmedi",
    items,
  };
}
