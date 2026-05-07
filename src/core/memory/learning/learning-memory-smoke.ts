import { createLearningMemoryStore } from "./learning-memory-store";
import { buildLearningMemoryRecallNotes } from "./learning-memory-report";

const store = createLearningMemoryStore();

const entry = store.create({
  projectId: "aillame",
  source: "problem-analysis",
  category: "typescript",
  title: "TS module resolution failure",
  summary: "TypeScript could not resolve a local import. apiKey=SECRET_SHOULD_NOT_SURVIVE",
  problemSignature: "TS2307 cannot find module",
  errorPatterns: ["TS2307", "Cannot find module"],
  likelyCauses: ["Import path or tsconfig paths mismatch."],
  recommendedFixes: ["Inspect import path casing and tsconfig paths before editing."],
  relatedFiles: ["tsconfig.json", "src/app.ts"],
  commandsToTry: ["node node_modules/typescript/bin/tsc --noEmit"],
  commandsToAvoid: ["rm -rf dist"],
  safetyNotes: ["Do not write files until user approves a patch."],
  outcome: "unknown",
  confidence: 0.91,
  tags: ["TypeScript", "Module-Resolution"],
  metadata: {
    token: "SECRET_SHOULD_NOT_SURVIVE",
    note: "safe metadata",
  },
});

const search = store.search({
  projectId: "aillame",
  query: "cannot find module ts2307",
  tags: ["typescript"],
});

if (search.total !== 1 || search.matches[0].id !== entry.id) {
  console.error(search);
  throw new Error("Learning memory search smoke failed.");
}

if (entry.summary.includes("SECRET_SHOULD_NOT_SURVIVE") || entry.metadata?.token !== "[REDACTED_SECRET]") {
  console.error(entry);
  throw new Error("Learning memory sanitizer smoke failed.");
}

console.log(`[PASS] learning entry=${entry.id}`);
console.log(`[PASS] matches=${search.total}`);
console.log(`[PASS] recall=${buildLearningMemoryRecallNotes(search).length}`);
