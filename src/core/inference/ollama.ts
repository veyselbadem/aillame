export type OllamaRequest = {
  prompt: string;
  messages?: any[];
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  model?: string;
};

export type OllamaErrorCode = 'server_offline' | 'model_missing' | 'timeout' | 'empty_response' | 'both_endpoints_failed' | 'unknown_error';

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

function stripOllamaThinking(value: string): string {
  return value.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function getGeneratePrompt(prompt: string, messages: any[]): string {
  const directPrompt = typeof prompt === 'string' ? prompt.trim() : '';
  if (directPrompt) return directPrompt;

  const lastUserMessage = [...messages].reverse().find((message) => message?.role === 'user');
  if (typeof lastUserMessage?.content === 'string') return lastUserMessage.content.trim();

  return messages
    .map((message) => typeof message?.content === 'string' ? message.content.trim() : '')
    .filter(Boolean)
    .join('\n')
    .trim();
}

function isTimeoutError(error: any): boolean {
  const message = String(error?.message || '');
  return error?.name === 'TimeoutError' || message.includes('timeout') || message.includes('AbortError');
}

function throwBothEndpointsFailed(modelId: string): never {
  throw new OllamaProviderError('empty_response', {
    code: 'both_endpoints_failed',
    statusCode: 502,
    modelId,
  });
}

async function generateWithOllamaGenerate(baseUrl: string, modelId: string, prompt: string, timeout: number): Promise<string> {
  console.warn('ollama /api/chat unusable, falling back to /api/generate');

  const res = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      model: modelId,
      prompt,
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
    throw new OllamaProviderError(`Ollama generate endpoint returned ${res.status}.`, {
      code: 'unknown_error',
      statusCode: res.status,
      modelId,
    });
  }

  const data = await res.json();
  const rawContent = typeof data.response === 'string' ? data.response.trim() : '';
  const content = stripOllamaThinking(rawContent);

  if (!content) throwBothEndpointsFailed(modelId);
  return content;
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
  const generatePrompt = getGeneratePrompt(prompt, chatMessages);

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
    const rawContent = typeof data.message?.content === 'string'
      ? data.message.content.trim()
      : typeof data.response === 'string'
        ? data.response.trim()
        : '';
    const content = stripOllamaThinking(rawContent);

    if (!content) {
      try {
        return await generateWithOllamaGenerate(baseUrl, modelId, generatePrompt, timeout);
      } catch (generateError) {
        if (generateError instanceof OllamaProviderError && generateError.code !== 'both_endpoints_failed') {
          throw generateError;
        }
        throwBothEndpointsFailed(modelId);
      }
    }

    return content;
  } catch (e: any) {
    if (e instanceof OllamaProviderError) throw e;

    if (isTimeoutError(e)) {
      try {
        return await generateWithOllamaGenerate(baseUrl, modelId, generatePrompt, timeout);
      } catch (generateError) {
        if (generateError instanceof OllamaProviderError && generateError.code !== 'both_endpoints_failed') {
          throw generateError;
        }
        throwBothEndpointsFailed(modelId);
      }
    }

    const message = String(e?.message || '');
    throw new OllamaProviderError(`Ollama sunucusuna bağlanılamadı. Sunucu açık mı? Detay: ${message}`, {
      code: 'server_offline',
      modelId,
    });
  }
}
