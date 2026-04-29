export type OllamaRequest = {
  prompt: string;
  messages?: any[];
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  model?: string;
};

export type OllamaErrorCode = 'server_offline' | 'model_missing' | 'timeout' | 'empty_response' | 'unknown_error';

export class OllamaProviderError extends Error {
  code: OllamaErrorCode;
  statusCode?: number;
  modelId?: string;
  availableModels?: string[];

  constructor(message: string, options: { code: OllamaErrorCode; statusCode?: number; modelId?: string; availableModels?: string[] }) {
    super(message);
    this.name = 'OllamaProviderError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.modelId = options.modelId;
    this.availableModels = options.availableModels;
  }
}

async function listOllamaModels(baseUrl: string, timeout: number): Promise<string[]> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(Math.min(timeout, 5000)) });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.models) ? data.models.map((m: any) => m.name).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function normalizeOllamaBaseUrl(value: string): string {
  return value.replace(/\/+$/, '').replace(/\/api$/i, '');
}

export async function generateOllamaResponse({
  prompt,
  messages = [],
  maxTokens = 512,
  temperature = 0.7,
  timeout = 60000,
  model
}: OllamaRequest): Promise<string> {
  const baseUrl = normalizeOllamaBaseUrl(process.env.AILLAME_OLLAMA_BASE_URL || 'http://127.0.0.1:11434');
  const modelId = model || process.env.AILLAME_OLLAMA_TEXT_MODEL || 'gemma:2b'; // Default to a standard Ollama model

  const chatMessages = messages.length > 0 ? messages : [{ role: 'user', content: prompt }];

  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        model: modelId,
        messages: chatMessages,
        think: false,
        options: {
          num_predict: maxTokens,
          temperature: temperature
        },
        stream: false
      }),
      signal: AbortSignal.timeout(timeout)
    });

    if (!res.ok) {
      if (res.status === 404) {
        const availableModels = await listOllamaModels(baseUrl, timeout);
        throw new OllamaProviderError(
          `Ollama çalışıyor ancak seçili model yüklü değil: ${modelId}. Mevcut modeller: ${availableModels.length ? availableModels.join(', ') : 'bulunamadı'}. .env içinde AILLAME_OLLAMA_TEXT_MODEL değerini mevcut modele ayarlayın veya modeli indirin.`,
          { code: 'model_missing', statusCode: 404, modelId, availableModels }
        );
      }
      throw new OllamaProviderError(`Ollama Server returned ${res.status}.`, {
        code: 'unknown_error',
        statusCode: res.status,
        modelId,
      });
    }

    const data = await res.json();
    const content = typeof data.message?.content === 'string'
      ? data.message.content.trim()
      : typeof data.response === 'string'
        ? data.response.trim()
        : '';

    if (!content) {
      throw new OllamaProviderError('Ollama yanıtı boş döndü; raw thinking/reasoning kullanıcıya aktarılmadı.', {
        code: 'empty_response',
        statusCode: 502,
        modelId,
      });
    }

    return content;
  } catch (e: any) {
    if (e instanceof OllamaProviderError) throw e;

    const message = String(e?.message || '');
    const isTimeout = e.name === 'TimeoutError' || message.includes('timeout') || message.includes('AbortError');
    if (isTimeout) {
      throw new OllamaProviderError(`Ollama zaman aşımına uğradı (${timeout}ms).`, {
        code: 'timeout',
        modelId,
      });
    }

    throw new OllamaProviderError(`Ollama sunucusuna bağlanılamadı. Sunucu açık mı? Detay: ${message}`, {
      code: 'server_offline',
      modelId,
    });
  }
}
