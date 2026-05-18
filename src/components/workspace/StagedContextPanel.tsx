import React from 'react';
import { useStagedWorkspaceContext } from '../../hooks/useStagedWorkspaceContext';
import { StagedContextItem } from './StagedContextItem';
import { dispatchManualContextAttach } from '../../lib/manual-context-attach-events';

interface Props {
  stagedContext: ReturnType<typeof useStagedWorkspaceContext>;
}

export function StagedContextPanel({ stagedContext }: Props) {
  const {
    items,
    totalChars,
    warnings,
    removeItem,
    clearAll,
    summaryPreview,
    createManualAttachOutput,
  } = stagedContext;

  const handleCopySummary = () => {
    navigator.clipboard.writeText(summaryPreview).catch(() => {});
  };

  const handleAttachToChatDraft = () => {
    const attachOutput = createManualAttachOutput();
    if (!attachOutput.block || !attachOutput.text.trim()) {
      return;
    }

    dispatchManualContextAttach({
      text: attachOutput.text,
      createdAt: attachOutput.block.createdAt,
      source: 'workspace_search_manual_attach',
    });
  };

  return (
    <div className="flex flex-col h-1/2 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950">
      <div className="p-3 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Staged Context</h3>
          <p className="text-[10px] text-gray-500">
            {items.length} items | ~{totalChars} chars
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleAttachToChatDraft}
            disabled={items.length === 0}
            className="text-xs px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Secili snippetleri chat taslagina manuel ekle"
          >
            Chat taslagina ekle
          </button>
          <button
            onClick={handleCopySummary}
            className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            title="Copy safe summary to clipboard"
          >
            Copy
          </button>
          <button
            onClick={clearAll}
            className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-200 dark:hover:bg-red-800/50"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-3 p-2 rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 text-[11px] text-gray-600 dark:text-gray-300">
          <div>Secilen sonuclar yalnizca bu panelde gecici olarak tutulur.</div>
          <div>Bu islem secili guvenli snippetleri Chat taslagina gorunur metin olarak ekler.</div>
          <div>Otomatik gonderim yapilmaz, metni gondermeden once duzenleyebilirsin.</div>
          <div>Nano veya memory alanlarina otomatik kayit yapilmaz.</div>
          <div>Yalnizca sanitize edilmis snippet ve referans bilgisi gosterilir.</div>
        </div>

        {warnings.length > 0 && (
          <div className="mb-3 text-xs text-amber-600 dark:text-amber-500">
            {warnings.map((w, i) => (
              <div key={`${w.code}-${w.createdAt}-${i}`}>&#9888; {w.message}</div>
            ))}
          </div>
        )}

        {items.length === 0 && (
          <div className="text-xs text-gray-500 mb-3">Secili oge yok. Sonuclardan Sec diyerek ekleyebilirsiniz.</div>
        )}

        {items.map(item => (
          <StagedContextItem key={item.stagedId} item={item} onRemove={removeItem} />
        ))}

        <div className="mt-4">
          <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 mb-1">Safe Context Summary Preview</div>
          <pre className="text-[10px] whitespace-pre-wrap break-words p-2 rounded border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto">
            {summaryPreview}
          </pre>
        </div>
      </div>
    </div>
  );
}
