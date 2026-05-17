import { LLMProvider, LLMGenerateOptions } from './base';
import { aillameFetch } from '@/lib/aillame-api-client';

export class NativeLocalProvider implements LLMProvider {
  private _isLoading = false;

  async loadModel(): Promise<void> {
    this._isLoading = true;
    try {
      const res = await aillameFetch('/api/aillame/models/load', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Model yükleme başarısız.');
      }
    } finally {
      this._isLoading = false;
    }
  }

  isLoading(): boolean {
    return this._isLoading;
  }

  isReady(): boolean {
    // We assume true and the API will return 412 if not actually ready
    return true; 
  }

  async getStatus() {
    try {
      const res = await aillameFetch('/api/aillame/runtime/status');
      const data = await res.json();
      const isLoaded = data.runtime?.text?.loaded || false;
      
      return {
        runtimeState: isLoaded ? 'loaded' : 'not_loaded',
        loadStatus: isLoaded ? 'loaded' : 'idle',
        activeModelId: data.runtime?.text?.modelId || null,
        isModelLoaded: isLoaded,
        isGenerating: false,
        errorCode: null,
        warnings: []
      };
    } catch (e) {
      return { runtimeState: 'error', isModelLoaded: false };
    }
  }

  async generate(
    prompt: string,
    onToken?: (token: string) => void,
    signal?: AbortSignal,
    options?: LLMGenerateOptions
  ): Promise<string> {
    
    // Phase 9: Switching to API-based generation
    const res = await aillameFetch('/api/aillame/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        options: {
          maxTokens: (options as any)?.maxTokens,
          temperature: (options as any)?.temperature,
          topP: (options as any)?.topP,
          systemPrompt: (options as any)?.systemPrompt
        }
      }),
      signal
    });

    const data = await res.json();

    if (!res.ok) {
      const errorCode = data.error?.code || 'GENERATION_FAILED';
      throw new Error(errorCode);
    }

    const text = data.text || '';
    
    // Simulate tokens if onToken is provided (since API is non-streaming for now)
    if (onToken && text) {
      const words = text.split(' ');
      for (const word of words) {
        if (signal?.aborted) break;
        onToken(word + ' ');
        // Small delay for UI smoothness
        await new Promise(r => setTimeout(r, 10));
      }
    }

    return text;
  }
}

export const nativeLocalProvider = new NativeLocalProvider();
