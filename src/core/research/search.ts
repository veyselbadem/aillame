import type { ResearchSource } from '@apptypes/research';
import { searchDuckDuckGo } from './duckduckgo';

export async function webSearch(query: string): Promise<ResearchSource[]> {
  try {
    const sources = await searchDuckDuckGo(query);
    if (sources.length > 0) {
      return sources;
    }
  } catch {
    // DuckDuckGo API çağrısı başarısız olursa fallback olarak mock veri döner.
  }

  return [
    {
      url: 'https://example.com/1',
      title: 'Örnek Sonuç 1',
      snippet: 'Bu birinci örnek arama sonucudur.',
    },
    {
      url: 'https://example.com/2',
      title: 'Örnek Sonuç 2',
      snippet: 'Bu ikinci örnek arama sonucudur.',
    },
  ];
}
