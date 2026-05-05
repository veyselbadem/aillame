const baseUrl = (process.env.AILLAME_EXTERNAL_API_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const apiKey = (process.env.AILLAME_EXTERNAL_API_KEY || '').trim();

function createHeaders() {
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  return headers;
}

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return { raw: text };
  }
}

function fail(message, details) {
  if (details) {
    console.error(`[smoke:external-api] ${message}: ${details}`);
  } else {
    console.error(`[smoke:external-api] ${message}`);
  }
  process.exitCode = 1;
}

async function testModels() {
  const response = await fetch(`${baseUrl}/api/v1/models`, {
    method: 'GET',
    headers: createHeaders(),
  });
  const data = await readJson(response);

  if (!response.ok) {
    throw new Error(`GET /api/v1/models failed with HTTP ${response.status}`);
  }

  if (!data || data.object !== 'list' || !Array.isArray(data.data)) {
    throw new Error('GET /api/v1/models returned a non OpenAI-compatible model list.');
  }

  console.log(`[smoke:external-api] models ok (${data.data.length} models)`);
}

async function testChat() {
  const response = await fetch(`${baseUrl}/api/v1/chat/completions`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify({
      model: 'aillame-default',
      messages: [{ role: 'user', content: 'Merhaba, kısa cevap ver.' }],
      projectId: 'smoke-test',
      mode: 'general',
    }),
  });
  const data = await readJson(response);

  if (!response.ok) {
    const code = typeof data?.error?.code === 'string' ? data.error.code : `HTTP ${response.status}`;
    throw new Error(`POST /api/v1/chat/completions failed with ${code}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (data?.object !== 'chat.completion' || typeof content !== 'string') {
    throw new Error('POST /api/v1/chat/completions returned a non OpenAI-compatible chat completion.');
  }

  console.log('[smoke:external-api] chat ok');
}

async function main() {
  try {
    await testModels();
    await testChat();

    if (!process.exitCode) {
      console.log('[smoke:external-api] all checks passed');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown smoke test error.';
    fail('smoke test failed', message);
  }
}

main();
