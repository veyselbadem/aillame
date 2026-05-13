import { useState, useEffect } from 'react';
import { tauriModelBridge, RuntimeSessionState } from '@core/platform/tauri-model-bridge';
import { listen } from '@tauri-apps/api/event';

export function useRuntimeStatus() {
  const [session, setSession] = useState<RuntimeSessionState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const current = await tauriModelBridge.getSafeRuntimeSession();
      setSession(current);
    } catch (error) {
      console.error('[useRuntimeStatus] refresh failed:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();

    // Poll every 5 seconds for status updates
    const interval = setInterval(refresh, 5000);

    // Also listen to events for more immediate updates
    const unlistenModel = listen('model_event', refresh);
    const unlistenInference = listen('inference_event', refresh);

    return () => {
      clearInterval(interval);
      unlistenModel.then(f => f());
      unlistenInference.then(f => f());
    };
  }, []);

  return { session, loading, refresh };
}
