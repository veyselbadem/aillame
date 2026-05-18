import { NativeLocalProvider } from './native-local';
import { ProLocalProvider } from './pro-provider';
import { GemmaProvider } from './gemma-provider';
import { RemoteApiLLMProvider } from './remote-api';
import type { LLMProvider } from './base';
import { LOCAL_FIRST_DISABLED_MESSAGE, isLegacyProvidersEnabled } from '@core/feature-flags/legacy-providers';

export type LLMProviderType = 'local' | 'cloud' | 'hybrid';

const localProvider = new NativeLocalProvider();
const proProvider = new ProLocalProvider();
const gemmaProvider = new GemmaProvider();
const remoteProvider = new RemoteApiLLMProvider();

function createDisabledProvider(type: Exclude<LLMProviderType, 'local'>): LLMProvider {
  const message = `Provider Disabled by Policy: ${type} is disabled. ${LOCAL_FIRST_DISABLED_MESSAGE}`;

  return {
    async loadModel() {
      throw new Error(message);
    },
    isLoading() {
      return false;
    },
    isReady() {
      return false;
    },
    async generate() {
      throw new Error(message);
    },
  };
}

export function getLLMProvider(type: LLMProviderType): LLMProvider {
  if (type === 'local') return localProvider;
  if (!isLegacyProvidersEnabled()) return createDisabledProvider(type === 'hybrid' ? 'hybrid' : 'cloud');
  if (type === 'cloud') return remoteProvider;
  // hybrid: önce local uygunsa local, değilse cloud
  return {
    async loadModel() {
      await localProvider.loadModel();
    },
    isLoading() {
      return localProvider.isLoading() && !localProvider.isReady();
    },
    isReady() {
      return localProvider.isReady() || remoteProvider.isReady();
    },
    async generate(prompt: string, onToken?: (token: string) => void, signal?: AbortSignal) {
      if (localProvider.isReady()) {
        return localProvider.generate(prompt, onToken, signal);
      }
      return remoteProvider.generate(prompt, onToken, signal);
    },
  };
}

export function getProLLMProvider(): LLMProvider {
  return proProvider;
}

export function getGemmaLLMProvider(): LLMProvider {
  return gemmaProvider;
}

export function getAvailableProviders(): LLMProviderType[] {
  if (!isLegacyProvidersEnabled()) return ['local'];
  return ['local', 'hybrid', 'cloud'];
}
