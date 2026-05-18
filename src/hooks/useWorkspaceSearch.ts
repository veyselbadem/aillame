import { useState, useCallback, useEffect } from 'react';
import { SearchQuery, SearchResult } from '../core/indexing/search-types';
import { IndexSessionStatus, IndexStats } from '../core/indexing/index-session';

export function useWorkspaceSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionStatus, setSessionStatus] = useState<IndexSessionStatus>('idle');
  const [sessionStats, setSessionStats] = useState<IndexStats | null>(null);
  const [sessionWarnings, setSessionWarnings] = useState<string[]>([]);
  const [lastBuiltAt, setLastBuiltAt] = useState<number | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);

  const fetchSessionStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/workspace-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status' })
      });
      const data = await res.json();
      if (data.success && data.session) {
        setSessionStatus(data.session.status);
        setSessionStats(data.session.stats);
        setSessionWarnings(data.session.warnings || []);
        setLastBuiltAt(data.session.lastBuiltAt);
      }
    } catch (err) {
      console.error("Failed to fetch session status", err);
    }
  }, []);

  useEffect(() => {
    fetchSessionStatus();
  }, [fetchSessionStatus]);

  const buildIndex = useCallback(async () => {
    setIsBuilding(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/workspace-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'build' })
      });
      const data = await res.json();
      if (data.success && data.session) {
        setSessionStatus(data.session.status);
        setSessionStats(data.session.stats);
        setSessionWarnings(data.session.warnings || []);
        setLastBuiltAt(data.session.lastBuiltAt);
      } else {
        setError(data.error?.message || "Failed to build index");
      }
    } catch (err: any) {
      setError(err.message || "Failed to build index");
    } finally {
      setIsBuilding(false);
    }
  }, []);

  const executeSearch = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (!searchQuery.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    if (sessionStatus !== 'ready') {
      setError("Index is not ready. Please build the index first.");
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const queryReq: SearchQuery = {
        query: searchQuery,
        limit: 10,
        includeSnippets: true,
        maxSnippetChars: 150,
      };

      const res = await fetch('/api/admin/workspace-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'search', query: queryReq })
      });
      const data = await res.json();

      if (data.success) {
        setResults(data.results);
      } else {
        setError(data.error?.message || "Search failed.");
        setResults([]);
      }
    } catch (err) {
      setError('An error occurred while searching. Please try a different query.');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [sessionStatus]);

  return {
    query,
    results,
    isSearching,
    error,
    executeSearch,
    buildIndex,
    isBuilding,
    sessionStatus,
    sessionStats,
    sessionWarnings,
    lastBuiltAt
  };
}
