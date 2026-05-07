import { NANO_KNOWLEDGE_BASE } from "./knowledge-base";
import type { NanoKnowledgeHit } from "./types";

function tokenize(text: string): string[] {
  return text
    .toLocaleLowerCase("tr-TR")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

export function retrieveNanoKnowledge(query: string, limit = 4): NanoKnowledgeHit[] {
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return [];

  return NANO_KNOWLEDGE_BASE
    .map((card) => {
      const haystack = tokenize(`${card.title} ${card.content} ${card.tags.join(" ")}`);
      const score = haystack.reduce((total, token) => total + (queryTokens.has(token) ? 1 : 0), 0);
      return {
        id: card.id,
        title: card.title,
        domain: card.domain,
        content: card.content,
        score,
      };
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
