export type OllamaRequest = {
  prompt: string;
  messages?: any[];
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  model?: string;
};

export async function generateOllamaResponse({
  prompt,
  messages = [],
  maxTokens = 512,
  temperature = 0.7,
  timeout = 60000,
  model
}: OllamaRequest): Promise<string> {
  const baseUrl = process.env.AILLAME_OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
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
        options: {
          num_predict: maxTokens,
          temperature: temperature
        },
        stream: false
      }),
      signal: AbortSignal.timeout(timeout)
    });

    if (!res.ok) {
      throw new Error(`Ollama Server returned ${res.status}`);
    }

    const data = await res.json();
    return data.message?.content || '';
  } catch (e: any) {
    const isTimeout = e.name === 'TimeoutError' || e.message.includes('timeout') || e.message.includes('AbortError');
    throw new Error(isTimeout ? `Ollama zaman aşımına uğradı (${timeout}ms).` : `Ollama hatası: ${e.message}. Sunucu açık mı?`);
  }
}