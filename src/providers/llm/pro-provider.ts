import { MODEL_REGISTRY, PRO_CHAT_MODEL_ID } from '@core/models/registry';
import type { LLMGenerateOptions, LLMProvider } from './base';

/**
 * Aillame PRO provider.
 * Qwen3-VL 8B is served by the server-side multimodal route so text-only and
 * image+text requests keep the same provider boundary.
 */
export class ProLocalProvider implements LLMProvider {
  private ready = false;
  private loading = false;

  async loadModel() {
    this.loading = true;

    try {
      const res = await fetch('/api/core/pro-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'load', modelId: PRO_CHAT_MODEL_ID }),
      });

      if (res.ok) {
        this.ready = true;
        console.log(`Aillame PRO (${MODEL_REGISTRY[PRO_CHAT_MODEL_ID].label}) is ready.`);
      }
    } catch (error) {
      console.error('Aillame PRO initialization failed:', error);
    } finally {
      this.loading = false;
    }
  }

  isLoading(): boolean {
    return this.loading;
  }

  isReady(): boolean {
    return this.ready;
  }

  async generate(
    prompt: string,
    onToken?: (token: string) => void,
    signal?: AbortSignal,
    options?: LLMGenerateOptions
  ): Promise<string> {
    try {
      const response = await fetch('/api/core/pro-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          images: options?.images ?? [],
          modelId: PRO_CHAT_MODEL_ID,
          temperature: 0.6,
        }),
        signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Pro API error');
      }

      const data = await response.json();
      const result = data.response || '';

      if (onToken) {
        for (const char of result) {
          onToken(char);
          await new Promise((resolve) => setTimeout(resolve, 15));
        }
      }

      return result;
    } catch (error) {
      console.error('[PRO Core] Chat Error:', error);
      return error instanceof Error ? error.message : 'Pro modeli cevap üretemedi.';
    }
  }
}
