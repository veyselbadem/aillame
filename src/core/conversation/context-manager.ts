// [NANO-F3] Dinamik Context Manager
// conversation-quality.ts ile uyumlu çalışır
// Bağımsız olarak test edilebilir

export interface ContextMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: number;
}

export interface ContextBuildOptions {
  maxChars?: number;          // Varsayılan: 4000
  memoryReserveChars?: number; // RAG için: 800
  prioritizeRecent?: boolean;  // Varsayılan: true
}

export interface ContextResult {
  messages: ContextMessage[];
  usedChars: number;
  droppedCount: number;
  memoryInjected: boolean;
}

export function buildDynamicContext(
  history: ContextMessage[],
  memories: string[] = [],
  options: ContextBuildOptions = {}
): ContextResult {
  const {
    maxChars = 4000,
    memoryReserveChars = 800,
    prioritizeRecent = true,
  } = options;

  const hasMemory = memories.length > 0;
  const availableChars = hasMemory
    ? maxChars - memoryReserveChars
    : maxChars;

  const selected: ContextMessage[] = [];
  let usedChars = 0;
  let droppedCount = 0;

  const ordered = prioritizeRecent
    ? [...history].reverse()
    : [...history];

  for (const msg of ordered) {
    const len = msg.content.length;
    if (usedChars + len > availableChars) {
      droppedCount++;
      continue;
    }
    selected.unshift(msg);
    usedChars += len;
  }

  // Fallback: hiç mesaj seçilemediyse son 3'ü al
  if (selected.length === 0 && history.length > 0) {
    const fallbackSlice = history.slice(-3);
    return {
      messages: fallbackSlice,
      usedChars: fallbackSlice.reduce((s, m) => s + m.content.length, 0),
      droppedCount: history.length - 3,
      memoryInjected: false,
    };
  }

  return {
    messages: selected,
    usedChars,
    droppedCount,
    memoryInjected: false,
  };
}

export function injectMemories(
  context: ContextResult,
  memories: string[],
  maxMemories: number = 3
): ContextResult {
  if (memories.length === 0) return context;

  const memoryMessage: ContextMessage = {
    role: 'system',
    content: `[Nano Hafıza Bağlamı]\n${
      memories.slice(0, maxMemories).join('\n---\n')
    }`,
    timestamp: Date.now(),
  };

  return {
    ...context,
    messages: [memoryMessage, ...context.messages],
    memoryInjected: true,
  };
}

// Mevcut sistemle uyumluluk için basit wrapper
export function legacyFallback(
  history: ContextMessage[]
): ContextMessage[] {
  return history.slice(-4); // Eski davranış — fallback olarak kalır
}
