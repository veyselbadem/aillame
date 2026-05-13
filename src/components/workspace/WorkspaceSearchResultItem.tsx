import React from 'react';
import { SearchResult } from '../../core/indexing/search-types';
import { createCitation } from '../../core/indexing/retrieval';

interface Props {
  result: SearchResult;
  onSelect?: (result: SearchResult) => void;
  onRemove?: (resultId: string) => void;
  isSelected?: boolean;
}

export function WorkspaceSearchResultItem({ result, onSelect, onRemove, isSelected }: Props) {
  const citation = createCitation(result);

  const handleAction = () => {
    if (isSelected) {
      onRemove?.(result.resultId);
      return;
    }
    onSelect?.(result);
  };

  return (
    <div className={`border rounded p-4 mb-3 bg-white dark:bg-gray-950 transition-colors ${
      isSelected ? 'border-blue-500 ring-1 ring-blue-500/50' : 'border-gray-200 dark:border-gray-800'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 break-all pr-4">
          {citation.displayName}
        </h4>
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
            {result.matchType} (Score: {result.score})
          </span>
          {(onSelect || onRemove) && (
            <button
              onClick={handleAction}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                isSelected 
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50' 
                  : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40'
              }`}
            >
              {isSelected ? 'Kaldir' : 'Sec'}
            </button>
          )}
        </div>
      </div>
      
      <div className="text-xs text-gray-500 dark:text-gray-500 mb-2 flex items-center space-x-2">
        <span>Label: {citation.rootLabel}</span>
        {citation.startLine && citation.endLine && (
          <>
            <span>&bull;</span>
            <span>Lines {citation.startLine}-{citation.endLine}</span>
          </>
        )}
      </div>

      {result.snippet && (
        <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-900 rounded text-xs text-gray-700 dark:text-gray-300 font-mono whitespace-pre-wrap">
          {result.snippet}
        </div>
      )}

      {result.warnings && result.warnings.length > 0 && (
        <div className="mt-2 text-xs text-amber-600 dark:text-amber-500">
          {result.warnings.map((w, i) => (
            <div key={i}>&#9888; {w}</div>
          ))}
        </div>
      )}
    </div>
  );
}
