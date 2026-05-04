export type OpenAIChatRole = 'system' | 'user' | 'assistant';

export type OpenAIChatMessage = {
  role: OpenAIChatRole;
  content: string;
};

type NormalizeResult =
  | { success: true; messages: OpenAIChatMessage[] }
  | { success: false; error: string };

const MAX_MESSAGES = 64;
const MAX_SINGLE_MESSAGE_CHARS = 12000;
const MAX_PROMPT_CHARS = 16000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRole(value: unknown): value is OpenAIChatRole {
  return value === 'system' || value === 'user' || value === 'assistant';
}

function normalizeMessage(raw: unknown): OpenAIChatMessage | undefined {
  if (!isRecord(raw)) return undefined;
  if (!isRole(raw.role)) return undefined;
  if (typeof raw.content !== 'string') return undefined;

  const content = raw.content.trim();
  if (!content) return undefined;

  return {
    role: raw.role,
    content: content.slice(0, MAX_SINGLE_MESSAGE_CHARS),
  };
}

export function normalizeOpenAIChatMessages(messages: unknown): NormalizeResult {
  if (!Array.isArray(messages)) {
    return { success: false, error: 'messages must be an array.' };
  }

  if (messages.length === 0) {
    return { success: false, error: 'messages must not be empty.' };
  }

  if (messages.length > MAX_MESSAGES) {
    return { success: false, error: `messages exceeds limit (${MAX_MESSAGES}).` };
  }

  const normalized: OpenAIChatMessage[] = [];
  for (const raw of messages) {
    const item = normalizeMessage(raw);
    if (!item) {
      return {
        success: false,
        error: 'Each message must include a valid role (system|user|assistant) and non-empty content.',
      };
    }
    normalized.push(item);
  }

  return { success: true, messages: normalized };
}

export function buildPromptFromMessages(messages: OpenAIChatMessage[]): string {
  const parts = messages.map((message) => `${message.role.toUpperCase()}: ${message.content}`);
  const fullPrompt = parts.join('\n\n');
  if (fullPrompt.length <= MAX_PROMPT_CHARS) {
    return fullPrompt;
  }
  return fullPrompt.slice(fullPrompt.length - MAX_PROMPT_CHARS);
}

export function extractLastUserMessage(messages: OpenAIChatMessage[]): string | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === 'user') {
      return messages[index].content;
    }
  }
  return undefined;
}
