import type { LLMProvider } from '@providers/llm/base';

export async function summarizeEpub(
  provider: LLMProvider,
  text: string,
  onToken?: (token: string) => void
): Promise<string> {
  const prompt = `Aşağıdaki EPUB metnini özetle:\n\n${text.slice(0, 2000)}`;
  const result = await provider.generate(prompt, onToken);
  return typeof result === 'string' ? result : '';
}
