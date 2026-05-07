export type NanoDecisionTrainingConfig = {
  datasetPath: string;
  baseCheckpointPath: string;
  outputCheckpointPath: string;
  maxRows: number;
  epochs: number;
  learningRate: number;
  maxInputChars: number;
  maxTargetChars: number;
  saveEveryRows: number;
  dryRun: boolean;
  format: "legacy" | "probe-json";
  alignment: "random-window" | "json-answer-only";
};

export const DEFAULT_NANO_DECISION_TRAINING_CONFIG: NanoDecisionTrainingConfig = {
  datasetPath: "src/core/engine/data/aillame_nano_decision_training.jsonl",
  baseCheckpointPath: "src/core/engine/checkpoints/aillame_nano_intelligence_v1.safetensors",
  outputCheckpointPath: "src/core/engine/checkpoints/aillame_nano_decision_v3.safetensors",
  maxRows: 42,
  epochs: 5,
  learningRate: 0.00008,
  maxInputChars: 1200,
  maxTargetChars: 800,
  saveEveryRows: 42,
  dryRun: false,
  format: "probe-json",
  alignment: "json-answer-only",
};

function readNumberEnv(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function readBooleanEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (!raw) return fallback;
  return ["1", "true", "yes"].includes(raw.toLocaleLowerCase("tr-TR"));
}

function readFormatEnv(): NanoDecisionTrainingConfig["format"] {
  const raw = process.env.AILLAME_NANO_DECISION_FORMAT;
  if (raw === "legacy" || raw === "probe-json") return raw;
  return DEFAULT_NANO_DECISION_TRAINING_CONFIG.format;
}

function readAlignmentEnv(): NanoDecisionTrainingConfig["alignment"] {
  const raw = process.env.AILLAME_NANO_DECISION_ALIGNMENT;
  if (raw === "random-window" || raw === "json-answer-only") return raw;
  return DEFAULT_NANO_DECISION_TRAINING_CONFIG.alignment;
}

export function buildNanoDecisionTrainingConfig(): NanoDecisionTrainingConfig {
  return {
    datasetPath: process.env.AILLAME_NANO_DECISION_DATASET_PATH
      ?? DEFAULT_NANO_DECISION_TRAINING_CONFIG.datasetPath,
    baseCheckpointPath: process.env.AILLAME_NANO_DECISION_BASE_CHECKPOINT
      ?? DEFAULT_NANO_DECISION_TRAINING_CONFIG.baseCheckpointPath,
    outputCheckpointPath: process.env.AILLAME_NANO_DECISION_OUTPUT
      ?? process.env.AILLAME_NANO_DECISION_OUTPUT_CHECKPOINT
      ?? DEFAULT_NANO_DECISION_TRAINING_CONFIG.outputCheckpointPath,
    maxRows: Math.trunc(readNumberEnv(
      "AILLAME_NANO_DECISION_MAX_ROWS",
      DEFAULT_NANO_DECISION_TRAINING_CONFIG.maxRows,
      1,
      10000
    )),
    epochs: Math.trunc(readNumberEnv(
      "AILLAME_NANO_DECISION_EPOCHS",
      DEFAULT_NANO_DECISION_TRAINING_CONFIG.epochs,
      1,
      1000
    )),
    learningRate: readNumberEnv(
      "AILLAME_NANO_DECISION_LR",
      DEFAULT_NANO_DECISION_TRAINING_CONFIG.learningRate,
      0.000001,
      0.01
    ),
    maxInputChars: Math.trunc(readNumberEnv(
      "AILLAME_NANO_DECISION_MAX_INPUT_CHARS",
      DEFAULT_NANO_DECISION_TRAINING_CONFIG.maxInputChars,
      64,
      10000
    )),
    maxTargetChars: Math.trunc(readNumberEnv(
      "AILLAME_NANO_DECISION_MAX_TARGET_CHARS",
      DEFAULT_NANO_DECISION_TRAINING_CONFIG.maxTargetChars,
      64,
      10000
    )),
    saveEveryRows: Math.trunc(readNumberEnv(
      "AILLAME_NANO_DECISION_SAVE_EVERY_ROWS",
      DEFAULT_NANO_DECISION_TRAINING_CONFIG.saveEveryRows,
      1,
      10000
    )),
    dryRun: readBooleanEnv(
      "AILLAME_NANO_DECISION_DRY_RUN",
      DEFAULT_NANO_DECISION_TRAINING_CONFIG.dryRun
    ),
    format: readFormatEnv(),
    alignment: readAlignmentEnv(),
  };
}
