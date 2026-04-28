import { getScriptPath, parsePythonJson, runPythonScript } from '@core/model-management/python-runner';

export type GemmaRequest = {
  prompt: string;
  messages?: any[];
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
};

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
  }>;
};

export async function generateGemmaResponse({
  prompt,
  messages = [],
  maxTokens = 512,
  temperature = 0.7,
  timeout = 30000,
}: GemmaRequest): Promise<string> {
  const modelId = process.env.AILLAME_GEMMA_MODEL_ID || 'google/gemma-4-E4B-it';
  const runtime = process.env.AILLAME_GEMMA_RUNTIME || 'gguf';

  if (runtime === 'gguf') {
    const serverUrl = process.env.AILLAME_GEMMA_SERVER_URL || 'http://127.0.0.1:8080';
    try {
      const chatMessages = messages.length > 0 ? messages : [{ role: 'user', content: prompt }];
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
        throw new Error(`GGUF Server returned ${res.status}`);
      }

      const data = await res.json() as GgufChatCompletion;
      const message = data.choices?.[0]?.message;
      return message?.content || message?.reasoning_content || '';
    } catch (e: any) {
      throw new Error(`GGUF (llama-server) hatası: ${e.message}. Sunucu açık mı?`);
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
