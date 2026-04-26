import type { LLMProvider } from './base';

export class RemoteApiLLMProvider implements LLMProvider {
  private loading = false;
  private ready = true; // Cloud API her zaman hazır kabul edilir

  async loadModel(): Promise<void> {
    // Cloud API için model yükleme gerekmez
    this.loading = false;
  }

  isLoading(): boolean {
    return this.loading;
  }

  isReady(): boolean {
    return this.ready;
  }

  async generate(prompt: string, onToken?: (token: string) => void, signal?: AbortSignal): Promise<string> {
    // Burada gerçek bir API çağrısı yapılmalı
    // Örnek/mock cevap:
    const fakeResponse = 'Cloud API cevabı.';
    if (onToken) {
      for (const char of fakeResponse) {
        if (signal?.aborted) throw new Error('AbortError');
        await new Promise((res) => setTimeout(res, 30));
        onToken(char);
      }
    }
    return fakeResponse;
  }
}
