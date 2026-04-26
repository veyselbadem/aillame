import { extractKeywords } from '@core/documents/keywords';
import { summarizeText } from '@core/documents/summarize';
import type { LLMProvider } from '@providers/llm/base';

export async function analyzeDocument(provider: LLMProvider, text: string) {
  const summary = await summarizeText(provider, text);
  const keywords = extractKeywords(text);
  return { summary, keywords };
}
