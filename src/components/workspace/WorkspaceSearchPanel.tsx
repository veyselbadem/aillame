'use client';

import React, { useEffect, useState } from 'react';
import { useWorkspaceSearch } from '../../hooks/useWorkspaceSearch';
import { useStagedWorkspaceContext } from '../../hooks/useStagedWorkspaceContext';
import { WorkspaceSearchResultItem } from './WorkspaceSearchResultItem';
import { WorkspaceSearchEmptyState } from './WorkspaceSearchEmptyState';
import { StagedContextPanel } from './StagedContextPanel';

export function WorkspaceSearchPanel() {
  const { 
    query, results, isSearching, error, executeSearch,
    buildIndex, isBuilding, sessionStatus, sessionStats, sessionWarnings, lastBuiltAt 
  } = useWorkspaceSearch();

  const stagedContext = useStagedWorkspaceContext();
  
  const [searchInput, setSearchInput] = useState('');

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      executeSearch(searchInput);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchInput, executeSearch]);

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 flex-shrink-0">
        <div className="flex justify-between items-start mb-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
            Güvenli Workspace Araması
          </h2>
          <button
            onClick={buildIndex}
            disabled={isBuilding}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded disabled:opacity-50"
          >
            {isBuilding ? 'İndeks oluşturuluyor...' : 'İndeks Oluştur'}
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-2">
          Durum: <span className="font-semibold capitalize">{sessionStatus}</span>
          {sessionStats && (
            <span> | {sessionStats.indexedFiles} dosya, {sessionStats.indexedChunks} parça</span>
          )}
        </p>

        {sessionWarnings && sessionWarnings.length > 0 && (
          <div className="mb-4 text-xs text-amber-600 dark:text-amber-500 max-h-20 overflow-y-auto">
            {sessionWarnings.slice(0, 3).map((w, i) => (
              <div key={i}>&#9888; {w}</div>
            ))}
            {sessionWarnings.length > 3 && (
              <div>&#9888; ... ve {sessionWarnings.length - 3} uyarı daha.</div>
            )}
          </div>
        )}

        <div className="relative mt-2">
          <input
            type="text"
            className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="Workspace içinde ara (örn. config, API)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            disabled={sessionStatus !== 'ready'}
          />
          {isSearching && (
            <div className="absolute right-3 top-2.5 text-xs text-gray-400">
              <span className="animate-pulse">Aranıyor...</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-sm">
            {error}
          </div>
        )}

        {results.length > 0 ? (
          <div>
            <div className="text-xs text-gray-500 mb-3">
              {results.length} güvenli sonuç bulundu
            </div>
            {results.map((result) => (
              <WorkspaceSearchResultItem 
                key={result.resultId} 
                result={result} 
                onSelect={stagedContext.addItem}
                onRemove={stagedContext.removeByResultId}
                isSelected={stagedContext.isSelected(result.resultId)}
              />
            ))}
          </div>
        ) : (
          <WorkspaceSearchEmptyState 
            query={query} 
            isSearching={isSearching} 
            hasResults={results.length > 0} 
          />
        )}
      </div>

      <StagedContextPanel stagedContext={stagedContext} />
    </div>
  );
}
