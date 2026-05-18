import { useEffect, useState } from 'react';
import type { AillameTier, LLMMode } from '@apptypes/settings';

const SETTINGS_KEY = 'aillame-settings';

type SavedSettings = {
  llmMode?: LLMMode;
  tier?: AillameTier;
  nanoProfile?: string;
};

function getSavedSettings(): SavedSettings {
  const globalWindow = globalThis.window as Window | undefined;
  if (!globalWindow) return {};
  const saved = globalWindow.localStorage.getItem(SETTINGS_KEY);
  if (!saved) return {};
  try {
    const parsed = JSON.parse(saved);
    return {
      llmMode: parsed.llmMode,
      tier: parsed.tier,
      nanoProfile: parsed.nanoProfile,
    };
  } catch {
    return {};
  }
}

export function useSettings() {
  const [llmMode, setLlmMode] = useState<LLMMode>('local');
  const [tier, setTier] = useState<AillameTier>('nano');
  const [nanoProfile, setNanoProfile] = useState<string>('balanced');

  useEffect(() => {
    const saved = getSavedSettings();
    if (saved.llmMode) {
      setLlmMode(saved.llmMode);
    }
    if (saved.tier) {
      setTier(saved.tier);
    }
    if (saved.nanoProfile) {
      setNanoProfile(saved.nanoProfile);
    }
  }, []);

  const persist = (settings: SavedSettings) => {
    const globalWindow = globalThis.window as Window | undefined;
    if (globalWindow) {
      globalWindow.localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        llmMode,
        tier,
        nanoProfile,
        ...settings,
      }));
    }
  };

  const updateMode = (mode: LLMMode) => {
    setLlmMode(mode);
    persist({ llmMode: mode });
  };

  const updateTier = (nextTier: AillameTier) => {
    setTier(nextTier);
    persist({ tier: nextTier });
  };

  const updateNanoProfile = (profile: string) => {
    setNanoProfile(profile);
    persist({ nanoProfile: profile });
  };

  return { 
    llmMode, 
    setLlmMode: updateMode, 
    tier, 
    setTier: updateTier,
    nanoProfile,
    setNanoProfile: updateNanoProfile
  };
}
