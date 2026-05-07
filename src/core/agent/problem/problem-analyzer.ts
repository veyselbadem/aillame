import { classifyProblemLog } from "./log-classifier";
import { interpretProblemSignals } from "./log-interpreter";
import { buildProblemAnalysisReport } from "./problem-report";
import type { AillameProblemAnalysisResult, AillameProblemInput } from "./problem-types";

export function analyzeProblemReadOnly(input: AillameProblemInput): AillameProblemAnalysisResult {
  const signals = classifyProblemLog(input);
  const interpreted = interpretProblemSignals(input, signals);
  return buildProblemAnalysisReport({
    input,
    category: interpreted.category,
    severity: interpreted.severity,
    confidence: interpreted.confidence,
    signals,
  });
}
