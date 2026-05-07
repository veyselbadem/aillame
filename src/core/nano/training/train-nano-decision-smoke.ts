import * as fs from "fs";
import * as path from "path";
import { getAillameEngine } from "../../engine/rust-core";
import { AillameTokenizer } from "../../engine/tokenizer";
import { buildNanoDecisionPrompt } from "../decision/nano-decision-prompt";
import { buildNanoDecisionTrainingConfig } from "./nano-decision-training-config";
import type { NanoDecisionTrainingConfig } from "./nano-decision-training-config";

type DecisionTrainingRow = {
  prompt: string;
  answer: string;
  tags?: string[];
};

type TrainingSample = {
  id: number;
  prompt: string;
  answer: string;
  text: string;
};

const BATCH_SIZE = 1;
const SEQ_LEN = 64;

function resolveFromCwd(filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
}

function loadJsonlRows(filePath: string, maxRows: number): DecisionTrainingRow[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Decision training dataset not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, maxRows)
    .map((line) => JSON.parse(line) as DecisionTrainingRow);
}

function clampText(value: string, maxChars: number): string {
  return value.length > maxChars ? value.slice(0, maxChars) : value;
}

function extractUserPrompt(prompt: string): string {
  const match = prompt.match(/Kullanici istegi:\s*(.+?)(?:\r?\n|$)/);
  return match?.[1]?.trim() || prompt.trim();
}

function enrichDecisionAnswer(answer: string): string {
  try {
    const parsed = JSON.parse(answer) as Record<string, unknown>;
    if (typeof parsed.decision !== "string") {
      parsed.decision = "classified from decision training dataset";
    }
    return JSON.stringify(parsed);
  } catch {
    return answer;
  }
}

function buildPromptForFormat(row: DecisionTrainingRow, format: NanoDecisionTrainingConfig["format"]): string {
  if (format === "probe-json") {
    return buildNanoDecisionPrompt({
      prompt: extractUserPrompt(row.prompt),
    });
  }

  return row.prompt;
}

function buildSample(
  row: DecisionTrainingRow,
  index: number,
  config: Pick<NanoDecisionTrainingConfig, "format" | "alignment" | "maxInputChars" | "maxTargetChars">
): TrainingSample {
  const prompt = clampText(buildPromptForFormat(row, config.format), config.maxInputChars);
  const answer = clampText(enrichDecisionAnswer(row.answer), config.maxTargetChars);
  const text = config.alignment === "json-answer-only"
    ? [prompt, answer].join("\n")
    : [
      "<decision-training>",
      `tags: ${row.tags?.join(",") ?? "decision"}`,
      "user:",
      prompt,
      "assistant-json:",
      answer,
      "</decision-training>",
    ].join("\n");

  return {
    id: index + 1,
    prompt,
    answer,
    text,
  };
}

function padTokens(tokens: number[], minLength: number): number[] {
  const padded = [...tokens];
  while (padded.length < minLength) padded.push(0);
  return padded;
}

function sampleWindow(tokens: number[], seqLen: number): { input: number[]; target: number[] } {
  const padded = padTokens(tokens, seqLen + 1);
  if (padded.length <= seqLen + 1) {
    return {
      input: padded.slice(0, seqLen),
      target: padded.slice(1, seqLen + 1),
    };
  }

  const start = Math.floor(Math.random() * (padded.length - seqLen - 1));
  return {
    input: padded.slice(start, start + seqLen),
    target: padded.slice(start + 1, start + seqLen + 1),
  };
}

function alignedJsonAnswerWindow(sample: TrainingSample, tokenizer: AillameTokenizer, seqLen: number): { input: number[]; target: number[] } {
  const promptTokens = tokenizer.encode(`${sample.prompt}\n`);
  const fullTokens = tokenizer.encode(sample.text);
  const answerStart = promptTokens.length;
  const contextChars = Math.max(8, Math.floor(seqLen / 2));
  const start = Math.max(0, answerStart - contextChars);
  const padded = padTokens(fullTokens.slice(start), seqLen + 1);

  return {
    input: padded.slice(0, seqLen),
    target: padded.slice(1, seqLen + 1),
  };
}

function buildTrainingWindow(
  sample: TrainingSample,
  tokenizer: AillameTokenizer,
  config: NanoDecisionTrainingConfig
): { input: number[]; target: number[] } {
  if (config.alignment === "json-answer-only") {
    return alignedJsonAnswerWindow(sample, tokenizer, SEQ_LEN);
  }

  return sampleWindow(tokenizer.encode(sample.text), SEQ_LEN);
}

async function trainNanoDecisionSmoke(): Promise<void> {
  const config = buildNanoDecisionTrainingConfig();
  const datasetPath = resolveFromCwd(config.datasetPath);
  const baseCheckpointPath = resolveFromCwd(config.baseCheckpointPath);
  const outputCheckpointPath = resolveFromCwd(config.outputCheckpointPath);
  const rows = loadJsonlRows(datasetPath, config.maxRows);
  const samples = rows.map((row, index) => buildSample(row, index, config));
  const trainingText = samples.map((sample) => sample.text).join("\n\n");

  console.log("Aillame Nano decision training smoke started.");
  console.log(`Dataset: ${datasetPath}`);
  console.log(`Rows: ${rows.length}, epochs: ${config.epochs}, lr: ${config.learningRate}`);
  console.log(`Format: ${config.format}`);
  console.log(`Alignment: ${config.alignment}`);
  console.log(`Base checkpoint: ${baseCheckpointPath}`);
  console.log(`Output checkpoint: ${outputCheckpointPath}`);

  if (rows.length === 0) {
    throw new Error("Decision training dataset is empty.");
  }

  if (config.dryRun) {
    console.log("Dry run enabled; dataset parsed successfully, native training skipped.");
    return;
  }

  const engine = getAillameEngine();
  if (!engine) {
    throw new Error("Aillame Rust core could not be loaded.");
  }

  const tokenizer = new AillameTokenizer();
  tokenizer.train(trainingText);
  engine.trainTokenizer(trainingText);
  engine.initTrainer(256, 256, 8, config.learningRate);

  if (fs.existsSync(baseCheckpointPath)) {
    console.log("Loading base checkpoint.");
    engine.loadCheckpoint(baseCheckpointPath);
  } else {
    console.log("Base checkpoint not found; training from initialized weights.");
  }

  let trainedRows = 0;
  let lastLoss = 0;
  for (let epoch = 1; epoch <= config.epochs; epoch += 1) {
    let epochLossTotal = 0;
    let epochLossMin = Number.POSITIVE_INFINITY;
    let epochLossMax = Number.NEGATIVE_INFINITY;
    for (const sample of samples) {
      const window = buildTrainingWindow(sample, tokenizer, config);
      lastLoss = await engine.trainBatch(
        new Uint32Array(window.input),
        new Uint32Array(window.target),
        BATCH_SIZE,
        SEQ_LEN
      );
      epochLossTotal += lastLoss;
      epochLossMin = Math.min(epochLossMin, lastLoss);
      epochLossMax = Math.max(epochLossMax, lastLoss);
      trainedRows += 1;

      if (trainedRows % config.saveEveryRows === 0) {
        engine.saveCheckpoint(outputCheckpointPath);
        console.log(`Checkpoint saved at row ${trainedRows}; loss=${lastLoss.toFixed(4)}`);
      }
    }
    const avgLoss = epochLossTotal / samples.length;
    console.log(
      `Epoch ${epoch}/${config.epochs} complete; avgLoss=${avgLoss.toFixed(4)}, minLoss=${epochLossMin.toFixed(4)}, maxLoss=${epochLossMax.toFixed(4)}, lastLoss=${lastLoss.toFixed(4)}`
    );
  }

  engine.saveCheckpoint(outputCheckpointPath);
  console.log(`Aillame Nano decision checkpoint saved: ${outputCheckpointPath}`);
  console.log(`Training smoke complete. trainedRows=${trainedRows}, lastLoss=${lastLoss.toFixed(4)}`);
}

trainNanoDecisionSmoke().catch((error) => {
  console.error(error);
  throw error;
});
