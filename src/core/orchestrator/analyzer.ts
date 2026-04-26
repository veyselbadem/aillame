export type ChatRequestType = 'text' | 'image' | 'pdf' | 'epub' | 'research';

export interface AnalyzedRequest {
  type: ChatRequestType;
  content: string;
  meta?: Record<string, any>;
}

export function analyzeRequest(input: string): AnalyzedRequest {
  const normalized = input.trim();
  const lower = normalized.toLowerCase();

  if (/^(araştır(ma)?\w*|search|research|web ara|internet ara)\b/i.test(normalized)) {
    const content = normalized.replace(/^(araştır(ma)?\w*|search|research|web ara|internet ara)\b[:]?\s*/i, '');
    return { type: 'research', content: content || normalized };
  }

  if (/araştır/i.test(lower) || /research/i.test(lower) || /search/i.test(lower)) {
    return { type: 'research', content: normalized };
  }

  if (/^pdf:/i.test(normalized)) {
    return { type: 'pdf', content: normalized.replace(/^pdf:/i, '') };
  }
  if (/^epub:/i.test(normalized)) {
    return { type: 'epub', content: normalized.replace(/^epub:/i, '') };
  }
  if (/^img:/i.test(normalized)) {
    return { type: 'image', content: normalized.replace(/^img:/i, '') };
  }

  return { type: 'text', content: normalized };
}
