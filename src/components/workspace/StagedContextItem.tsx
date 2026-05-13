import React from 'react';
import { StagedContextItem as StagedContextItemType } from '../../core/indexing/staged-context-types';

interface Props {
  item: StagedContextItemType;
  onRemove: (id: string) => void;
}

export function StagedContextItem({ item, onRemove }: Props) {
  const safeTime = new Date(item.addedAt).toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="border border-blue-200 dark:border-blue-800/50 rounded p-3 mb-2 bg-blue-50/50 dark:bg-blue-900/10">
      <div className="flex items-start justify-between mb-1">
        <h5 className="text-xs font-semibold text-gray-800 dark:text-gray-200 break-all pr-2">
          {item.displayName}
        </h5>
        <button
          onClick={() => onRemove(item.stagedId)}
          className="text-gray-400 hover:text-red-500 transition-colors"
          title="Remove item"
        >
          &times;
        </button>
      </div>

      <div className="text-[10px] text-gray-500 mb-2 flex items-center space-x-2">
        <span>Ext: {item.extension}</span>
        <span>&bull;</span>
        <span>Kaynak: {item.citation.rootLabel}</span>
        {item.citation.startLine && item.citation.endLine && (
          <>
            <span>&bull;</span>
            <span>Lines {item.citation.startLine}-{item.citation.endLine}</span>
          </>
        )}
        <span>&bull;</span>
        <span>Eklendi: {safeTime}</span>
      </div>

      {item.snippet && (
        <div className="p-2 bg-white dark:bg-gray-950 rounded text-[10px] text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap border border-gray-100 dark:border-gray-800">
          {item.snippet}
        </div>
      )}
    </div>
  );
}
