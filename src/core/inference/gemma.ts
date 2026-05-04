import { getScriptPath, parsePythonJson, runPythonScript } from '@core/model-management/python-runner';
import { ensureGemmaServerRunning, GemmaRuntimeError } from '@core/local-runtime/gemma-runtime-manager';

export type GemmaRequest = {
  prompt: string;
  messages?: any[];
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
};

export type GemmaErrorCode =
  | 'server_offline'
  | 'timeout'
  | 'endpoint_not_found'
  | 'server_error'
  | 'empty_response'
  | 'runtime_start_failed'
  | 'unknown_error';

export class GemmaProviderError extends Error {
  code: GemmaErrorCode;
  statusCode?: number;
  hint?: string;

  constructor(message: string, options: { code: GemmaErrorCode; statusCode?: number; hint?: string }) {
    super(message);
    this.name = 'GemmaProviderError';
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.hint = options.hint;
  }
}

type PythonGemmaResponse = {
  response: string;
  modelId: string;
};

type GgufChatCompletion = {
  choices?: Array<{
    message?: {
      content?: string;
      reasoning_content?: string;
    };
    text?: string;
    finish_reason?: string;
  }>;
  content?: string;
  response?: string;
};

export const GEMMA_SAFE_FALLBACK_MESSAGE = 'Gemma yanıtı tamamlayamadı; kısa cevap tekrar denenebilir.';

export function isGemmaFallbackResponse(value?: string): boolean {
  const trimmed = (value || '').trim();
  if (!trimmed) return true;
  const normalized = trimmed.toLocaleLowerCase('tr-TR');
  if (normalized.includes('gemma yanıtı tamamlayamadı')) return true;
  if (normalized.includes('kısa cevap tekrar denenebilir')) return true;
  if (normalized.includes('kullanılabilir sentez üretemedi')) return true;
  return trimmed.length < 32 && /yanıt|cevap|tekrar|denenebilir/i.test(normalized);
}

function buildChatMessages(prompt: string, messages: any[]): any[] {
  const systemMessage = {
    role: 'system',
    content: 'Cevabı doğrudan ver. Düşünme sürecini yazma. Sadece final cevap ver. Türkçe karakterleri doğru kullan.',
  };

  if (messages.length > 0) {
    const hasSystem = messages.some((message) => message?.role === 'system');
    return hasSystem ? messages : [systemMessage, ...messages];
  }

  return [systemMessage, { role: 'user', content: prompt }];
}

function cleanText(value?: string): string {
  return typeof value === 'string' ? value.trim() : '';
}

function trimInputText(value: string | undefined, maxChars: number): string {
  if (typeof value !== 'string') return '';
  if (!Number.isFinite(maxChars) || maxChars < 1 || value.length <= maxChars) return value;
  return value.slice(0, maxChars);
}

function trimMessageInput(messages: any[], maxChars: number): any[] {
  if (!Number.isFinite(maxChars) || maxChars < 1) return messages;
  return messages.map((message) => {
    if (typeof message?.content !== 'string') return message;
    return { ...message, content: trimInputText(message.content, maxChars) };
  });
}

function extractGemmaText(data: GgufChatCompletion): string {
  const choice = data.choices?.[0];
  const content = cleanText(choice?.message?.content);
  if (content) return content;

  const reasoning = cleanText(choice?.message?.reasoning_content);
  if (reasoning) {
    return GEMMA_SAFE_FALLBACK_MESSAGE;
  }

  const text = cleanText(choice?.text);
  if (text) return text;

  const directContent = cleanText(data.content);
  if (directContent) return directContent;

  const directResponse = cleanText(data.response);
  if (directResponse) return directResponse;

  return '';
}

export async function generateGemmaResponse({
  prompt = '',
  messages = [],
  maxTokens = 512,
  temperature = 0.7,
  timeout = 60000,
}: GemmaRequest): Promise<string> {
  const modelId = process.env.AILLAME_GEMMA_MODEL_ID || process.env.AILLAME_GEMMA_GGUF_FILE || 'gemma-4-E4B-it-Q4_K_M.gguf';
  const runtime = process.env.AILLAME_GEMMA_RUNTIME || 'gguf';

  if (runtime === 'gguf') {
    const serverUrl = process.env.AILLAME_GEMMA_SERVER_URL || 'http://127.0.0.1:8080';
    const maxInputChars = parseInt(process.env.AILLAME_GEMMA_MAX_INPUT_CHARS || '12000', 10);
    try {
      if (process.env.AILLAME_GEMMA_AUTO_START === 'true') {
        try {
          await ensureGemmaServerRunning();
        } catch (runtimeError: any) {
          const message = runtimeError instanceof GemmaRuntimeError
            ? runtimeError.message
            : 'Gemma local server otomatik başlatılamadı.';
          const hint = runtimeError instanceof GemmaRuntimeError
            ? runtimeError.hint
            : 'AILLAME_GEMMA_LLAMA_SERVER_EXE ve AILLAME_GEMMA_MODEL_PATH değerlerini kontrol edin.';

          throw new GemmaProviderError(message, {
            code: 'runtime_start_failed',
            hint: hint || 'Model yolu veya llama-server.exe yolu kontrol edilmeli.',
          });
        }
      }

      const chatMessages = buildChatMessages(
        trimInputText(prompt, maxInputChars),
        trimMessageInput(messages, maxInputChars)
      );
      const res = await fetch(`${serverUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json; charset=utf-8',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          model: modelId,
          messages: chatMessages,
          max_tokens: maxTokens,
          temperature,
          stream: false
        }),
        signal: AbortSignal.timeout(timeout)
      });

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        if (res.status === 404) {
          throw new GemmaProviderError('Gemma endpoint veya model bulunamadı.', {
            code: 'endpoint_not_found',
            statusCode: 404,
            hint: 'llama-server /v1/chat/completions endpointini ve model alias ayarını kontrol edin.',
          });
        }
        throw new GemmaProviderError(`Gemma server hata döndürdü: HTTP ${res.status}${body ? ` - ${body.slice(0, 300)}` : ''}`, {
          code: 'server_error',
          statusCode: res.status,
          hint: 'llama-server loglarını kontrol edin.',
        });
      }

      const data = await res.json() as GgufChatCompletion;
      const answer = extractGemmaText(data);
      if (!answer) {
        throw new GemmaProviderError('Gemma boş yanıt döndürdü. maxTokens veya prompt ayarı kontrol edilmeli.', {
          code: 'empty_response',
          hint: 'maxTokens değerini artırın veya daha kısa bir prompt deneyin.',
        });
      }
      return answer;
    } catch (e: any) {
      if (e instanceof GemmaProviderError) throw e;

      const message = String(e?.message || '');
      const lowerMessage = message.toLowerCase();
      const isTimeout = e?.name === 'TimeoutError' || e?.name === 'AbortError' || lowerMessage.includes('timeout');
      if (isTimeout) {
        throw new GemmaProviderError('Gemma yanıt süresi doldu. Timeout artırılabilir veya daha kısa prompt denenebilir.', {
          code: 'timeout',
          hint: 'AILLAME_GEMMA_TIMEOUT_MS değerini artırın veya promptu kısaltın.',
        });
      }

      if (lowerMessage.includes('fetch failed') || lowerMessage.includes('econnrefused')) {
        throw new GemmaProviderError('Gemma sunucusuna bağlanılamadı. llama-server açık mı?', {
          code: 'server_offline',
          hint: 'C:\\aillame-llama klasöründe llama-server.exe komutunu başlatın.',
        });
      }

      throw new GemmaProviderError(`Gemma bilinmeyen hata döndürdü: ${message}`, {
        code: 'unknown_error',
        hint: 'llama-server loglarını ve endpoint yanıtını kontrol edin.',
      });
    }
  }

  // Transformers Fallback (Python)
  const runnerInput = {
    modelId,
    prompt: prompt.trim(),
    messages,
    maxNewTokens: maxTokens,
    temperature,
  };

  try {
    const result = await runPythonScript(
      getScriptPath('inference', 'scripts', 'gemma_infer.py'),
      [],
      runnerInput,
      timeout
    );
    const parsed = parsePythonJson<PythonGemmaResponse>(result);
    return parsed.response;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown runtime error.';
    throw new Error(
      `Gemma (Transformers) inference failed. Details: ${reason}`
    );
  }
}
