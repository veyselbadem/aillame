import { SearchResult } from "./search-types";
import {
  StagedContextItem,
  STAGED_CONTEXT_LIMITS,
  StagedContextWarning,
} from "./staged-context-types";
import { createSafeStagedItemWithWarnings } from "./staged-context-sanitizer";

function warning(code: StagedContextWarning["code"], message: string): StagedContextWarning {
  return {
    code,
    message,
    createdAt: Date.now(),
  };
}

export function computeStagedTotalChars(items: StagedContextItem[]): number {
  return items.reduce((acc, item) => acc + (item.snippet?.length || 0), 0);
}

export function applyStageAdd(
  prevItems: StagedContextItem[],
  result: SearchResult
): { items: StagedContextItem[]; warnings: StagedContextWarning[]; added: boolean } {
  const prepared = createSafeStagedItemWithWarnings(result);
  const warnings = [...prepared.warnings];

  if (!prepared.item) {
    return {
      items: prevItems,
      warnings,
      added: false,
    };
  }

  if (prevItems.some((item) => item.resultId === result.resultId)) {
    warnings.push(warning("duplicate_item", "This result is already staged."));
    return {
      items: prevItems,
      warnings,
      added: false,
    };
  }

  if (prevItems.length >= STAGED_CONTEXT_LIMITS.maxItems) {
    warnings.push(
      warning("max_items", `You can stage up to ${STAGED_CONTEXT_LIMITS.maxItems} items.`)
    );
    return {
      items: prevItems,
      warnings,
      added: false,
    };
  }

  const totalChars = computeStagedTotalChars(prevItems);
  if (totalChars + (prepared.item.snippet?.length || 0) > STAGED_CONTEXT_LIMITS.maxTotalChars) {
    warnings.push(
      warning(
        "max_total_chars",
        `Total staged text cannot exceed ${STAGED_CONTEXT_LIMITS.maxTotalChars} characters.`
      )
    );
    return {
      items: prevItems,
      warnings,
      added: false,
    };
  }

  return {
    items: [...prevItems, prepared.item],
    warnings,
    added: true,
  };
}

export function applyStageRemoveByStagedId(
  prevItems: StagedContextItem[],
  stagedId: string
): StagedContextItem[] {
  return prevItems.filter((item) => item.stagedId !== stagedId);
}

export function applyStageRemoveByResultId(
  prevItems: StagedContextItem[],
  resultId: string
): StagedContextItem[] {
  return prevItems.filter((item) => item.resultId !== resultId);
}

export function applyStageClearAll(): StagedContextItem[] {
  return [];
}
