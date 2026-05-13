import { useState, useCallback } from 'react';
import { SearchResult } from '../core/indexing/search-types';
import {
  StagedContextItem,
  STAGED_CONTEXT_LIMITS,
  StagedContextWarning,
} from '../core/indexing/staged-context-types';
import {
  generateSafeStagedSummary,
} from '../core/indexing/staged-context-sanitizer';
import {
  applyStageAdd,
  applyStageClearAll,
  applyStageRemoveByResultId,
  applyStageRemoveByStagedId,
  computeStagedTotalChars,
} from '../core/indexing/staged-context-state';
import { createManualContextBlock } from '../core/indexing/manual-context-attach';

export function useStagedWorkspaceContext() {
  const [items, setItems] = useState<StagedContextItem[]>([]);
  const [warnings, setWarnings] = useState<StagedContextWarning[]>([]);

  const totalChars = computeStagedTotalChars(items);

  const addWarning = (warning: StagedContextWarning) => {
    setWarnings(prev => {
      const newWarnings = [...prev, warning];
      if (newWarnings.length > STAGED_CONTEXT_LIMITS.maxWarnings) {
        newWarnings.shift();
      }
      return newWarnings;
    });
  };

  const addItem = useCallback((result: SearchResult) => {
    setItems((prevItems) => {
      const outcome = applyStageAdd(prevItems, result);
      outcome.warnings.forEach(addWarning);
      if (outcome.added) {
        setWarnings([]);
      }
      return outcome.items;
    });
  }, []);

  const removeItem = useCallback((stagedId: string) => {
    setItems(prevItems => applyStageRemoveByStagedId(prevItems, stagedId));
    setWarnings([]);
  }, []);

  const removeByResultId = useCallback((resultId: string) => {
    setItems(prevItems => applyStageRemoveByResultId(prevItems, resultId));
    setWarnings([]);
  }, []);

  const clearAll = useCallback(() => {
    setItems(applyStageClearAll());
    setWarnings([]);
  }, []);

  const isSelected = useCallback((resultId: string) => {
    return items.some(item => item.resultId === resultId);
  }, [items]);

  const getSummary = useCallback(() => {
    return generateSafeStagedSummary(items);
  }, [items]);

  const createManualAttachOutput = useCallback(() => {
    const output = createManualContextBlock({ stagedItems: items });

    for (const warning of output.warnings) {
      if (warning.code === 'no_items') {
        addWarning({
          code: 'manual_attach_empty',
          message: warning.message,
          createdAt: warning.createdAt,
        });
      } else if (warning.code === 'item_limit_reached') {
        addWarning({
          code: 'manual_attach_item_limit',
          message: warning.message,
          createdAt: warning.createdAt,
        });
      } else if (warning.code === 'item_skipped') {
        addWarning({
          code: 'manual_attach_item_skipped',
          message: warning.message,
          createdAt: warning.createdAt,
        });
      } else if (warning.code === 'total_chars_trimmed') {
        addWarning({
          code: 'manual_attach_total_trimmed',
          message: warning.message,
          createdAt: warning.createdAt,
        });
      }
    }

    return output;
  }, [items]);

  const summaryPreview = getSummary();

  return {
    items,
    totalChars,
    warnings,
    summaryPreview,
    addItem,
    removeItem,
    removeByResultId,
    clearAll,
    isSelected,
    getSummary,
    createManualAttachOutput,
  };
}
