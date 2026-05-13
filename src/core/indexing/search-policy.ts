export const DEFAULT_SEARCH_POLICY = {
  maxQueryLength: 200,
  maxResults: 50,
  maxSnippetChars: 300,
  minSearchScore: 0.1,
  // Sensitive keywords that, if found in a query or result, should raise flags or skip.
  sensitivePatterns: [
    /(password|secret|token|api[_-]?key|credentials|private[_-]?key)/i,
    /([a-zA-Z0-9]{40,})/, // Potentially raw tokens/hashes
    /(Bearer\s+[a-zA-Z0-9\-\._~]+)/i, // Bearer tokens
  ],
  pathLikePatterns: [
    /(\/home\/|\/Users\/|[a-zA-Z]:\\[Users|Windows])/i,
  ],
};
