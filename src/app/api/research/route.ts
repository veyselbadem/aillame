import { NextRequest } from 'next/server';
import { webSearch } from '@core/research/search';
import { fetchPageContent } from '@core/research/fetch-content';
import { summarizeResearch } from '@core/research/summarize';
import { getLLMProvider } from '@providers/llm/selector';
import type { ResearchResult } from '@apptypes/research';

export async function POST(req: NextRequest) {
  const { query, llmMode = 'hybrid' } = await req.json();
  if (!query) {
    return new Response(JSON.stringify({ error: 'Sorgu gerekli.' }), { status: 400 });
  }

  try {
    const sources = await webSearch(query);
    const provider = getLLMProvider(llmMode);
    const summary = await summarizeResearch(provider, sources);
    const result: ResearchResult = { summary, sources };
    return new Response(JSON.stringify(result), { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error || 'Bilinmeyen bir hata oluştu.');
    const fallbackSummary = `Araştırma sırasında bir hata oluştu: ${message}`;
    return new Response(
      JSON.stringify({ summary: fallbackSummary, sources: [] }),
      { status: 200 }
    );
  }
}
