export type ResearchSource = {
  url: string;
  title: string;
  snippet: string;
  sourceName?: string;
};

export type ResearchResult = {
  summary: string;
  sources: ResearchSource[];
};
