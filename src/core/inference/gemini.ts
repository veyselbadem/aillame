import type { ImageAttachment } from '@apptypes/attachments';
import { normalizeAssistantAnswer } from '@core/conversation/conversation-quality';

export type GeminiErrorCode =
  | 'api_key_missing'
  | 'provider_disabled'
  | 'auth_error'
  | 'model_not_found'
  | 'timeout'
  | 'empty_response'
  | 'provider_error';

export type GeminiConfig = {
  enabled: boolean;
  apiKeyConfigured: boolean;
  model: string;
  timeoutMs: number;
};

export type GeminiGenerateInput = {
  prompt: string;
  systemInstruction?: string;
  model?: string;
  timeoutMs?: number;
  maxOutputTokens?: number;
  temperature?: number;
  images?: ImageAttachment[];
};

export type GeminiGenerateSuccess = {
  success: true;
  provider: 'gemini';
  model: string;
  answer: string;
};

export type GeminiGenerateError = {
  success: false;
  provider: 'gemini';
  code: GeminiErrorCode;
  error: string;
  model?: string;
  status?: number;
};

export type GeminiGenerateResult = GeminiGenerateSuccess | GeminiGenerateError;

type GeminiApiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
  error?: {
    code?: number;
    message?: string;
    status?: string;
  };
  text?: string;
};

function parseEnvInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function checkGeminiConfig(): GeminiConfig {
  const apiKey = process.env.AILLAME_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
  return {
    enabled: process.env.AILLAME_GEMINI_ENABLED !== 'false',
    apiKeyConfigured: apiKey.trim().length > 0,
    model: process.env.AILLAME_GEMINI_MODEL || 'gemini-2.5-flash',
    timeoutMs: parseEnvInt(process.env.AILLAME_GEMINI_TIMEOUT_MS, 60000),
  };
}

function getGeminiApiKey(): string {
  return (process.env.AILLAME_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '').trim();
}

function normalizeModelName(model: string): string {
  return model.replace(/^models\//i, '').trim();
}

function buildGeminiUrl(model: string, apiKey: string): string {
  const normalizedModel = normalizeModelName(model);
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(normalizedModel)}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

function imageToGeminiPart(image: ImageAttachment) {
  const match = image.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;

  return {
    inline_data: {
      mime_type: match[1],
      data: match[2],
    },
  };
}

function extractGeminiText(data: GeminiApiResponse): string {
  if (typeof data.text === 'string') return data.text;

  return (data.candidates || [])
    .flatMap((candidate) => candidate.content?.parts || [])
    .map((part) => part.text || '')
    .join('\n')
    .trim();
}

function sanitizeProviderMessage(message?: string): string {
  return (message || '')
    .replace(/key=[^&\s]+/gi, 'key=<redacted>')
    .replace(/AIza[0-9A-Za-z_-]+/g, '<redacted>')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 260);
}

function mapGeminiHttpError(status: number, model: string, data?: GeminiApiResponse): GeminiGenerateError {
  const rawMessage = sanitizeProviderMessage(data?.error?.message);

  if (status === 401 || status === 403) {
    return {
      success: false,
      provider: 'gemini',
      code: 'auth_error',
      error: 'Gemini API anahtarı geçersiz veya bu model için yetkili değil.',
      model,
      status,
    };
  }

  if (status === 404 || /not found|not_found|model/i.test(rawMessage)) {
    return {
      success: false,
      provider: 'gemini',
      code: 'model_not_found',
      error: `Gemini modeli bulunamadı veya bu API sürümüyle uyumlu değil: ${model}.`,
      model,
      status,
    };
  }

  return {
    success: false,
    provider: 'gemini',
    code: 'provider_error',
    error: rawMessage ? `Gemini sağlayıcı hatası: ${rawMessage}` : 'Gemini sağlayıcı hatası oluştu.',
    model,
    status,
  };
}

export async function generateGeminiResponse(input: GeminiGenerateInput): Promise<GeminiGenerateResult> {
  const config = checkGeminiConfig();
  const apiKey = getGeminiApiKey();
  const model = input.model || config.model;

  if (!config.enabled) {
    return {
      success: false,
      provider: 'gemini',
      code: 'provider_disabled',
      error: 'Gemini provider devre dışı.',
      model,
    };
  }

  if (!apiKey) {
    return {
      success: false,
      provider: 'gemini',
      code: 'api_key_missing',
      error: 'Gemini API key tanımlı değil.',
      model,
    };
  }

  const prompt = input.prompt.trim();
  if (!prompt && (!input.images || input.images.length === 0)) {
    return {
      success: false,
      provider: 'gemini',
      code: 'empty_response',
      error: 'Gemini için prompt veya görsel gerekli.',
      model,
    };
  }

  const imageParts = (input.images || [])
    .map(imageToGeminiPart)
    .filter((part): part is NonNullable<typeof part> => Boolean(part));

  const body = {
    systemInstruction: input.systemInstruction
      ? { parts: [{ text: input.systemInstruction }] }
      : undefined,
    contents: [
      {
        role: 'user',
        parts: [
          ...(prompt ? [{ text: prompt }] : []),
          ...imageParts,
        ],
      },
    ],
    generationConfig: {
      temperature: input.temperature ?? 0.7,
      maxOutputTokens: Math.max(input.maxOutputTokens ?? 1024, 1024),
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  try {
    const response = await fetch(buildGeminiUrl(model, apiKey), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(input.timeoutMs || config.timeoutMs),
    });

    const data = await response.json().catch(() => ({})) as GeminiApiResponse;

    if (!response.ok) {
      return mapGeminiHttpError(response.status, model, data);
    }

    const finishReason = data.candidates?.[0]?.finishReason;
    const blockReason = data.promptFeedback?.blockReason;
    const answer = normalizeAssistantAnswer(extractGeminiText(data));

    if (!answer) {
      const reason = blockReason || finishReason;
      return {
        success: false,
        provider: 'gemini',
        code: 'empty_response',
        error: reason
          ? `Gemini kullanılabilir metin döndürmedi. Neden: ${reason}.`
          : 'Gemini boş cevap döndürdü.',
        model,
      };
    }

    if (finishReason && !['STOP', 'MAX_TOKENS'].includes(finishReason)) {
      return {
        success: false,
        provider: 'gemini',
        code: 'provider_error',
        error: `Gemini yanıtı tamamlayamadı. Finish reason: ${finishReason}.`,
        model,
      };
    }

    return {
      success: true,
      provider: 'gemini',
      model,
      answer,
    };
  } catch (error: any) {
    const message = String(error?.message || '');
    const isTimeout = error?.name === 'TimeoutError' || error?.name === 'AbortError' || /timeout|aborted/i.test(message);

    return {
      success: false,
      provider: 'gemini',
      code: isTimeout ? 'timeout' : 'provider_error',
      error: isTimeout
        ? 'Gemini yanıt süresi doldu.'
        : 'Gemini sağlayıcısına ulaşılamadı veya beklenmeyen hata oluştu.',
      model,
    };
  }
}
