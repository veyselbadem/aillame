import type { ResearchSource } from '@apptypes/research';

const SUPPORTED_SCHEMES = ['http:', 'https:'];

export type SanitizedResearchSource = ResearchSource & {
  url: string;
  sourceName?: string;
};

export function normalizeResearchUrl(url: string): string | null {
  if (!url || typeof url !== 'string') {
    return null;
  }

  let trimmed = url.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.toLowerCase().startsWith('javascript:')) {
    return null;
  }

  if (trimmed.startsWith('//')) {
    trimmed = `https:${trimmed}`;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname === 'duckduckgo.com' && parsed.pathname === '/l/') {
      const target = parsed.searchParams.get('uddg');
      if (target) {
        try {
          const decoded = decodeURIComponent(target);
          return normalizeResearchUrl(decoded);
        } catch {
          return null;
        }
      }
    }

    if (!SUPPORTED_SCHEMES.includes(parsed.protocol)) {
      return null;
    }

    return parsed.href;
  } catch {
    return null;
  }
}

export function sanitizeResearchSources(sources: ResearchSource[]): {
  validSources: SanitizedResearchSource[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const validSources: SanitizedResearchSource[] = [];
  const seenUrls = new Set<string>();

  for (const source of sources) {
    if (!source || typeof source !== 'object') {
      warnings.push('Geçersiz kaynak öğesi atlandı.');
      continue;
    }

    const normalizedUrl = normalizeResearchUrl(source.url);
    if (!normalizedUrl) {
      warnings.push(`Güvenli olmayan veya geçersiz kaynak atlandı: ${source?.url ?? 'bilinmeyen'}`);
      continue;
    }

    if (seenUrls.has(normalizedUrl)) {
      continue;
    }

    seenUrls.add(normalizedUrl);
    validSources.push({
      url: normalizedUrl,
      title: source.title || normalizedUrl,
      snippet: source.snippet || '',
      sourceName: source.sourceName,
    });
  }

  return { validSources, warnings };
}
