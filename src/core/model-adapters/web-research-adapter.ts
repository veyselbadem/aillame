import type { ExternalApiMode } from '@core/external-api/types';
import { webSearch } from '@core/research/search';
import { sanitizeResearchSources } from '@core/research/source-safety';
import { createResearchResult } from '@core/research-results/service';
import type {
  CreateResearchResultInput,
  ResearchResultNormalizedTask,
  ResearchResultSource,
  ResearchResultType,
} from '@core/research-results/types';

export type WebResearchAdapterInput = {
  projectId: string;
  mode: ExternalApiMode;
  query: string;
  researchType: ResearchResultType;
  normalizedTask?: ResearchResultNormalizedTask;
  maxResults?: number;
};

export type WebResearchAdapterOutput = {
  success: true;
  query: string;
  researchType: ResearchResultType;
  sources: ResearchResultSource[];
  warnings: string[];
  createdResearchResultId: string;
  summary: string;
} | {
  success: false;
  query: string;
  researchType: ResearchResultType;
  sources: ResearchResultSource[];
  warnings: string[];
  error: string;
};

const MAX_RESULTS_DEFAULT = 5;
const MAX_RESULTS_LIMIT = 10;

function buildCitationText(source: ResearchResultSource): string {
  const sourceName = source.sourceName ?? new URL(source.url).hostname;
  return `Kaynak: ${source.title} (${sourceName})`;
}

function buildResearchSummary(input: WebResearchAdapterInput, sources: ResearchResultSource[]): string {
  const sourceCount = sources.length;
  const hostnames = Array.from(new Set(sources.map((source) => source.sourceName ?? new URL(source.url).hostname))).slice(0, 3);
  const baseSummary = `Bu araştırma, “${input.query}” sorgusu için ${sourceCount} kaynaktan derlendi.`;
  const summaryType = input.researchType === 'economy_news'
    ? ' Bu sonuçlar yatırım tavsiyesi değildir ve finansal kararlar öncesi ek doğrulama gerektirir.'
    : input.researchType === 'documentation'
    ? ' Bu sonuçlar dokümantasyon amaçlı referans olarak sunulmuştur.'
    : '';
  const freshnessHint = ' Kaynakların erişildiği tarih kaydedildi; yayın tarihi bilinmiyorsa güncellik doğrulanmalıdır.';
  const hostHint = hostnames.length > 0 ? ` Kaynaklar arasında ${hostnames.join(', ')} yer alıyor.` : '';

  return `${baseSummary}${summaryType}${hostHint}${freshnessHint}`;
}

export async function runWebResearchAdapter(
  input: WebResearchAdapterInput
): Promise<WebResearchAdapterOutput> {
  const maxResults = Math.min(
    MAX_RESULTS_LIMIT,
    Math.max(1, input.maxResults ?? MAX_RESULTS_DEFAULT)
  );

  const rawSources = await webSearch(input.query);
  const slicedSources = rawSources.slice(0, maxResults);
  const { validSources, warnings: sourceWarnings } = sanitizeResearchSources(slicedSources);

  if (validSources.length === 0) {
    return {
      success: false,
      query: input.query,
      researchType: input.researchType,
      sources: [],
      warnings: sourceWarnings,
      error: 'Geçerli web kaynağı bulunamadı.',
    };
  }

  const resultSources: ResearchResultSource[] = validSources.map((source) => {
    const sourceName = source.sourceName ?? new URL(source.url).hostname;
    const citationText = buildCitationText({
      url: source.url,
      title: source.title,
      snippet: source.snippet,
      sourceName,
      accessedAt: Date.now(),
    });

    return {
      url: source.url,
      title: source.title,
      snippet: source.snippet,
      sourceName,
      accessedAt: Date.now(),
      reliabilityScore: undefined,
      citationText,
    };
  });

  const freshnessWarnings = resultSources.some((source) => source.publishedAt === undefined)
    ? ['Bazı kaynakların yayın tarihi bilinmiyor; güncellik kontrolü önerilir.']
    : [];

  const resultWarnings = [...sourceWarnings, ...freshnessWarnings];
  const summary = buildResearchSummary(input, resultSources);

  const recordInput: CreateResearchResultInput = {
    projectId: input.projectId,
    mode: input.mode,
    researchType: input.researchType,
    query: input.query,
    normalizedTask: input.normalizedTask,
    sources: resultSources,
    summary,
  };

  const resultRecord = await createResearchResult(recordInput);

  return {
    success: true,
    query: input.query,
    researchType: input.researchType,
    sources: resultSources,
    warnings: resultWarnings,
    createdResearchResultId: resultRecord.id,
    summary,
  };
}
