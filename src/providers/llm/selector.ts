import { AillameLocalProvider } from './aillame-provider';
import { ProLocalProvider } from './pro-provider';
import { RemoteApiLLMProvider } from './remote-api';
import type { LLMProvider } from './base';

export type LLMProviderType = 'local' | 'cloud' | 'hybrid';

const localProvider = new AillameLocalProvider();
const proProvider = new ProLocalProvider();
const remoteProvider = new RemoteApiLLMProvider();

export function getLLMProvider(type: LLMProviderType): LLMProvider {
  if (type === 'local') return localProvider;
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

export function getAvailableProviders(): LLMProviderType[] {
  return ['local', 'hybrid', 'cloud'];
}
