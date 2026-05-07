import type { AillameLearningMemoryEntry, AillameLearningMemorySearchResult } from "./learning-memory-types";

export function summarizeLearningMemoryEntry(entry: AillameLearningMemoryEntry): string {
  return `${entry.projectId}/${entry.category}: ${entry.title} [${entry.outcome}, confidence=${entry.confidence}]`;
}

export function buildLearningMemoryRecallNotes(result: AillameLearningMemorySearchResult): string[] {
  if (result.matches.length === 0) {
    return ["No similar learning memory was found."];
  }

  return result.matches.map((entry) => {
    const fixes = entry.recommendedFixes.slice(0, 2).join("; ") || "No fix recommendation recorded.";
    const avoid = entry.commandsToAvoid.length > 0 ? ` Avoid: ${entry.commandsToAvoid.join(", ")}.` : "";
    return `${summarizeLearningMemoryEntry(entry)}. Remember: ${fixes}.${avoid}`;
  });
}
