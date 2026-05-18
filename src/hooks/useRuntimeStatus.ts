import { useState, useEffect, useCallback } from 'react';
import { aillameFetch } from '@/lib/aillame-api-client';

export interface RuntimeSessionState {
  sessionId: string;
  processState: string;
  activeModelId: string | null;
  pendingModelId: string | null;
  runtimeLabel: string;
  lastErrorCode: string | null;
  startedAt: number | null;
  lastHeartbeatAt: number | null;
  isInferring: boolean;

  // Unified state fields
  isSelected: boolean;
  isLoaded: boolean;
  isReady: boolean;
  health?: any;
}

export function useRuntimeStatus() {
  const [session, setSession] = useState<RuntimeSessionState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      // 1. Get Active Model State (Phase 2)
      const activeData = await aillameFetch('/api/aillame/models/active');
      const activeModelId = activeData.active?.text?.modelId || null;

      // 2. Get Runtime Status (Phase 3)
      const runtimeData = await aillameFetch('/api/aillame/runtime/status');
      const isLoaded = runtimeData.runtime?.text?.loaded || false;

      // 3. Get Health Data (Hardening Phase)
      const healthData = await aillameFetch('/api/aillame/health');

      // 4. Map to Unified State
      const mappedSession: RuntimeSessionState = {
        sessionId: 'api-session',
        processState: isLoaded ? 'loaded' : activeModelId ? 'runtime_ready' : 'not_started',
        activeModelId,
        pendingModelId: null,
        runtimeLabel: runtimeData.runtime?.realInferenceProvider || 'Aillame Nano',
        lastErrorCode: null,
        startedAt: Date.now(),
        lastHeartbeatAt: Date.now(),
        isInferring: false,
        isSelected: !!activeModelId,
        isLoaded,
        isReady: isLoaded,
        health: healthData,
      };

      setSession(mappedSession);
    } catch (error) {
      console.error('[useRuntimeStatus] refresh failed:', error);
      // Fallback or keep previous state
    } finally {
      setLoading(false);
    }
  }, []);

  const loadModel = async () => {
    setLoading(true);
    try {
      await aillameFetch('/api/aillame/models/load', { method: 'POST' });
      await refresh();
      return { success: true };
    } catch (error: any) {
      console.error('[useRuntimeStatus] loadModel failed:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();

    // Poll every 5 seconds for status updates
    const interval = setInterval(refresh, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [refresh]);

  return { session, loading, refresh, loadModel };
}
