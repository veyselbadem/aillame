import type { NanoGenerationConfig } from "./nano-generation-config";

export type NanoOutputCleanupResult = {
  content: string;
  useful: boolean;
  reason?: string;
  removedPromptEcho: boolean;
};

function startsWithTokens(outputIds: readonly number[], inputIds: readonly number[]): boolean {
  if (outputIds.length <= inputIds.length) return false;
  return inputIds.every((token, index) => outputIds[index] === token);
}

function trimStopSequences(content: string, stopSequences: readonly string[]): string {
  let result = content;
  for (const stopSequence of stopSequences) {
    const index = result.indexOf(stopSequence);
    if (index >= 0) {
      result = result.slice(0, index);
    }
  }
  return result;
}

function stripPromptMarkers(content: string): string {
  return content
    .replace(/<[^>\n]{1,40}>/g, " ")
    .replace(/^(Yanıt|Yanit|Assistant|Asistan)\s*:\s*/i, "");
}

function normalizeWhitespace(content: string): string {
  return content
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function trimDanglingFragments(content: string): string {
  return content
    .replace(/^[\]\[{}()'"`.,;:\s]+/, "")
    .replace(/[\]\[{}'"`\s]+$/, "")
    .trim();
}

function countUsefulChars(content: string): number {
  return Array.from(content).filter((char) => /[\p{L}\p{N}]/u.test(char)).length;
}

function countUsefulTokens(content: string): number {
  return content.split(/\s+/).filter((token) => /[\p{L}\p{N}]{2,}/u.test(token)).length;
}

function getWordTokens(content: string): string[] {
  return content
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);
}

function getFragmentRatio(tokens: readonly string[]): number {
  if (tokens.length === 0) return 1;
  const fragments = tokens.filter((token) => token.length <= 2).length;
  return fragments / tokens.length;
}

function getUniqueRatio(tokens: readonly string[]): number {
  if (tokens.length === 0) return 0;
  return new Set(tokens.map((token) => token.toLocaleLowerCase("tr-TR"))).size / tokens.length;
}

export function extractGeneratedTokenIds(
  outputIds: readonly number[],
  inputIds: readonly number[]
): { generatedIds: number[]; removedPromptEcho: boolean } {
  if (startsWithTokens(outputIds, inputIds)) {
    return {
      generatedIds: outputIds.slice(inputIds.length),
      removedPromptEcho: true,
    };
  }

  return {
    generatedIds: [...outputIds],
    removedPromptEcho: false,
  };
}

export function cleanupNanoOutput(
  rawContent: string,
  config: NanoGenerationConfig
): NanoOutputCleanupResult {
  const cleaned = trimDanglingFragments(
    normalizeWhitespace(stripPromptMarkers(trimStopSequences(rawContent, config.stopSequences)))
  );
  const usefulChars = countUsefulChars(cleaned);
  const usefulTokens = countUsefulTokens(cleaned);
  const wordTokens = getWordTokens(cleaned);
  const fragmentRatio = getFragmentRatio(wordTokens);
  const uniqueRatio = getUniqueRatio(wordTokens);

  if (!cleaned) {
    return {
      content: "",
      useful: false,
      reason: "EMPTY_ENGINE_OUTPUT",
      removedPromptEcho: false,
    };
  }

  if (usefulChars < config.minUsefulChars || usefulTokens < config.minUsefulTokens) {
    return {
      content: cleaned,
      useful: false,
      reason: "LOW_USEFUL_OUTPUT",
      removedPromptEcho: false,
    };
  }

  if (wordTokens.length >= config.minUsefulTokens && fragmentRatio > 0.45) {
    return {
      content: cleaned,
      useful: false,
      reason: "FRAGMENTED_ENGINE_OUTPUT",
      removedPromptEcho: false,
    };
  }

  if (wordTokens.length >= 12 && uniqueRatio < 0.35) {
    return {
      content: cleaned,
      useful: false,
      reason: "REPETITIVE_ENGINE_OUTPUT",
      removedPromptEcho: false,
    };
  }

  return {
    content: cleaned,
    useful: true,
    removedPromptEcho: false,
  };
}
