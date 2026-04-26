import type { ResearchSource } from '@apptypes/research';

type DuckDuckGoResponse = {
  AbstractText?: string;
  AbstractURL?: string;
  RelatedTopics?: Array<any>;
};

function parseRelatedTopics(topics: Array<any>): ResearchSource[] {
  const sources: ResearchSource[] = [];

  const handleTopic = (topic: any) => {
    if (topic.Topics && Array.isArray(topic.Topics)) {
      topic.Topics.forEach(handleTopic);
      return;
    }

    if (topic.FirstURL && topic.Text) {
      sources.push({
        url: topic.FirstURL,
        title: topic.Text.split(' - ')[0],
        snippet: topic.Text,
      });
    }
  };

  topics.forEach(handleTopic);
  return sources;
}

function decodeHtml(html: string): string {
  return html
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
}

async function searchDuckDuckGoJson(query: string): Promise<ResearchSource[]> {
  const url = new URL('https://api.duckduckgo.com/');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'json');
  url.searchParams.set('no_html', '1');
  url.searchParams.set('skip_disambig', '1');
  url.searchParams.set('t', 'aillame');

  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; Aillame/1.0; +https://aillame.local)',
    },
  });

  if (!res.ok) {
    throw new Error('DuckDuckGo JSON araması başarısız.');
  }

  const data = (await res.json()) as DuckDuckGoResponse;
  const results: ResearchSource[] = [];

  if (data.AbstractText && data.AbstractURL) {
    results.push({
      url: data.AbstractURL,
      title: data.AbstractText.split(' - ')[0],
      snippet: data.AbstractText,
    });
  }

  if (data.RelatedTopics) {
    results.push(...parseRelatedTopics(data.RelatedTopics));
  }

  return results.slice(0, 5);
}

async function searchDuckDuckGoHtml(query: string): Promise<ResearchSource[]> {
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'text/html',
      'User-Agent': 'Mozilla/5.0 (compatible; Aillame/1.0; +https://aillame.local)',
    },
  });

  if (!res.ok) {
    throw new Error('DuckDuckGo HTML araması başarısız.');
  }

  const html = await res.text();
  const results: ResearchSource[] = [];
  const regex = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>(.*?)<\/a>/gi;
  let match: RegExpExecArray | null;

  while (results.length < 5 && (match = regex.exec(html)) !== null) {
    const url = decodeHtml(match[1]);
    const title = decodeHtml(match[2].replaceAll(/<[^>]+>/g, '').trim());
    const snippet = decodeHtml(match[3].replaceAll(/<[^>]+>/g, '').trim());

    results.push({
      url,
      title: title || query,
      snippet: snippet || query,
    });
  }

  return results;
}

export async function searchDuckDuckGo(query: string): Promise<ResearchSource[]> {
  try {
    const jsonResults = await searchDuckDuckGoJson(query);
    if (jsonResults.length > 0) {
      return jsonResults;
    }
  } catch {
    // JSON API başarısız olursa HTML yedeğine geç.
  }

  return searchDuckDuckGoHtml(query);
}
