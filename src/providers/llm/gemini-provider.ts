import { LLMProvider } from './base';

export class GeminiProvider implements LLMProvider {
  private _isLoading = false;
  private _isReady = true; // API tabanlı olduğu için her zaman hazır sayılabilir

  isLoading() { return this._isLoading; }
  isReady() { return this._isReady; }

  async loadModel() {
    // API provider için yüklemeye gerek yok
  }

  async generate(prompt: string, onToken?: (token: string) => void, signal?: AbortSignal): Promise<string> {
    this._isLoading = true;
    try {
      const response = await fetch('/api/llm/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
        signal: signal // API isteğine sinyali aktar
      });

      if (!response.ok) {
        throw new Error('Gemini API hatası');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream okunamadı');

      let fullText = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done || signal?.aborted) break;

        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        if (onToken) onToken(chunk);
      }

      return fullText;
    } catch (error: any) {
      if (error.name === 'AbortError') return '[İşlem Durduruldu]';
      console.error('Gemini error:', error);
      return 'Üzgünüm, şu an cevap veremiyorum.';
    } finally {
      this._isLoading = false;
    }
  }
}
