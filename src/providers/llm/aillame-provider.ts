import { LLMProvider, LLMGenerateOptions } from './base';

export class AillameLocalProvider implements LLMProvider {
    private _isReady: boolean = false;
    private _isLoading: boolean = false;

    constructor() {}

    async loadModel() {
        // Rust Core is managed on the server-side,
        // so "loading" just means checking if the server is up.
        this._isLoading = true;
        try {
            const res = await this.fetchWithTimeout('/api/core/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: 'PING', maxTokens: 1 }),
            });
            if (res.ok) {
                this._isReady = true;
                console.log('✅ Aillame Rust Core (via API) is ready.');
            }
        } catch (error) {
            console.error('❌ Aillame Rust Core initialization failed:', error);
        } finally {
            this._isLoading = false;
        }
    }

    isLoading(): boolean { return this._isLoading; }
    isReady(): boolean { return this._isReady; }

    private normalizeApiUrl(url: string): string {
        const trimmed = (url || '').trim();
        return trimmed || '/api/core/chat';
    }

    private async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
        const parsedTimeout = process.env.NEXT_PUBLIC_AILLAME_NANO_TIMEOUT_MS
            ? Number.parseInt(process.env.NEXT_PUBLIC_AILLAME_NANO_TIMEOUT_MS, 10)
            : 60000;
        const envTimeout = Number.isFinite(parsedTimeout) ? parsedTimeout : 60000;
        
        // Clamp timeout between 5s and 60s
        const timeoutMs = Math.min(Math.max(envTimeout, 5000), 60000);
        
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        let cleanup: (() => void) | undefined;

        if (options.signal) {
            if (options.signal.aborted) {
                controller.abort();
            } else {
                const abortHandler = () => controller.abort();
                options.signal.addEventListener('abort', abortHandler, { once: true });
                cleanup = () => options.signal?.removeEventListener('abort', abortHandler);
            }
        }

        try {
            return await fetch(this.normalizeApiUrl(url), { ...options, signal: controller.signal });
        } finally {
            clearTimeout(timeout);
            if (cleanup) cleanup();
        }
    }

    async generate(prompt: string, onToken?: (token: string) => void, signal?: AbortSignal, options?: LLMGenerateOptions): Promise<string> {
        if (!this._isReady) {
            await this.loadModel();
            if (!this._isReady) {
                return 'Yerel model şu anda hazır değil. Lütfen Pro modunu veya hizmeti kontrol edin.';
            }
        }

        try {
            const safePrompt = typeof prompt === 'string' ? prompt.trim() : '';
            const safeMessages = Array.isArray(options?.messages) ? options.messages : [];
            const response = await this.fetchWithTimeout('/api/core/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt: safePrompt,
                    messages: safeMessages,
                    temperature: 0.8 
                }),
                signal,
            });

            if (!response.ok) {
                const payload = await response.text().catch(() => '');
                throw new Error(payload || 'API Error');
            }

            const data = await response.json().catch(() => ({}));
            const rawResult = typeof data?.response === 'string'
                ? data.response
                : (typeof data?.answer === 'string' ? data.answer : '');
            const result = rawResult.trim();

            if (!result) {
                return 'Aillame Nano şu an anlamlı bir yanıt üretemedi. Lütfen isteği biraz daha netleştirip tekrar deneyin.';
            }

            if (onToken) {
                for (const char of result) {
                    if (signal?.aborted) throw new Error('AbortError');
                    onToken(char);
                    // await new Promise((r) => setTimeout(r, 10)); // [NANO-F2] Eski yapay gecikme
                    await Promise.resolve(); // [NANO-F2] Yapay gecikme kaldırıldı
                }
            }

            return result;
        } catch (error) {
            if (error instanceof Error && error.name === 'AbortError') {
                return 'Aillame Nano şu an yanıtı tamamlayamadı. Lütfen daha kısa bir mesajla tekrar deneyin.';
            }
            console.error('Chat Error:', error);
            return 'Üzgünüm, bir hata oluştu.';
        }
    }
}
