import * as fs from "fs";
import * as path from "path";
import { NANO_DECISION_EVAL_DATASET, type NanoDecisionEvalCase } from "./nano-decision-eval-dataset";

type DecisionTrainingRow = {
  prompt: string;
  answer: string;
  tags: string[];
};

function buildDecisionJson(testCase: NanoDecisionEvalCase): string {
  return JSON.stringify({
    taskType: testCase.expected.taskType,
    contentType: testCase.expected.contentType,
    outputType: testCase.expected.outputType,
    domain: testCase.expected.domain ?? "general",
    requiredCapabilities: testCase.expected.requiredCapabilities,
    decision: `route as ${testCase.expected.taskType} for ${testCase.expected.outputType} output`,
    shouldUseImageModel: Boolean(testCase.expected.shouldUseImageModel),
    shouldUseAgent: Boolean(testCase.expected.shouldUseAgent),
    shouldUseTextModel: Boolean(testCase.expected.shouldUseTextModel),
  });
}

function toTrainingRow(testCase: NanoDecisionEvalCase): DecisionTrainingRow {
  return {
    prompt: [
      "Aillame karar cekirdegi olarak istegi siniflandir.",
      `Kullanici istegi: ${testCase.prompt}`,
      "Sadece karar JSON'u dondur.",
    ].join("\n"),
    answer: buildDecisionJson(testCase),
    tags: [
      "decision",
      testCase.expected.taskType,
      testCase.expected.outputType,
      testCase.expected.domain ?? "general",
    ],
  };
}

const outputPath = path.join(process.cwd(), "src", "core", "engine", "data", "aillame_nano_decision_training.jsonl");
const rows = NANO_DECISION_EVAL_DATASET.map(toTrainingRow);
const jsonl = rows.map((row) => JSON.stringify(row)).join("\n");

fs.writeFileSync(outputPath, `${jsonl}\n`, "utf8");
console.log(`Nano decision training rows exported: ${rows.length}`);
console.log(`Output: ${outputPath}`);
