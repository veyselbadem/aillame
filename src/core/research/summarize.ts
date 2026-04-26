import type { LLMProvider } from '@providers/llm/base';
import type { ResearchSource } from '@apptypes/research';

export async function summarizeResearch(
  provider: LLMProvider,
  sources: ResearchSource[],
  onToken?: (token: string) => void
): Promise<string> {
  const context = sources.map((s, i) => `(${i + 1}) ${s.title}: ${s.snippet}`).join('\n');
  const prompt = `Aşağıdaki kaynaklardan araştırma özeti çıkar:\n${context}`;
  const result = await provider.generate(prompt, onToken);
  return typeof result === 'string' ? result : '';
}
