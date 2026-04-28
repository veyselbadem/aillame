import { LLMProvider, LLMGenerateOptions } from './base';

export class GemmaProvider implements LLMProvider {
  private ready = false;
  private loading = false;

  async loadModel() {
    this.loading = true;
    // Env checks are server-side, but the provider can verify status via API
    try {
      const res = await fetch('/api/admin/model-status/gemma');
      if (res.ok) {
        const status = await res.json();
        this.ready = status.isReady;
      }
    } catch (e) {
      console.warn('[Gemma Provider] Status check failed');
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
      const response = await fetch('/api/core/gemma-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          messages: options?.messages,
          temperature: 0.7,
        }),
        signal,
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Gemma API error');
      }

      const data = await response.json();
      const result = data.response || '';

      if (onToken) {
        for (const char of result) {
          if (signal?.aborted) break;
          onToken(char);
          // Small delay for UI smoothness
          await new Promise(r => setTimeout(r, 5));
        }
      }

      return result;
    } catch (error) {
      console.error('[Gemma Provider] Chat Error:', error);
      throw error;
    }
  }
}
