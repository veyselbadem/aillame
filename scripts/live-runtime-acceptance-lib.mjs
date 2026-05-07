import fs from 'fs';
import path from 'path';

function fileExists(filePath) {
  try {
    return Boolean(filePath && fs.existsSync(filePath));
  } catch {
    return false;
  }
}

function resolveGgufModelPath() {
  const directPath = process.env.AILLAME_GGUF_MODEL_PATH;
  if (directPath) return directPath;

  const modelDir = process.env.AILLAME_GGUF_MODEL_DIR;
  const activeModel = process.env.AILLAME_GGUF_ACTIVE_MODEL;
  if (!modelDir || !activeModel) return undefined;

  return path.isAbsolute(activeModel)
    ? activeModel
    : path.join(modelDir, activeModel);
}

export function getLiveTextAcceptanceReport() {
  const missingConfig = [];
  const missingFiles = [];
  const missingWorker = [];
  const warnings = [];
  const nextActions = [];

  const enabled = process.env.AILLAME_GGUF_RUNTIME_ENABLED === 'true'
    || process.env.AILLAME_GGUF_WORKER_ENABLED === 'true';
  const runtimeBinary = process.env.AILLAME_GGUF_RUNTIME_BINARY;
  const modelPath = resolveGgufModelPath();
  const modelPathExists = fileExists(modelPath);

  if (!enabled) missingConfig.push('AILLAME_GGUF_RUNTIME_ENABLED is false');
  if (!runtimeBinary) missingConfig.push('AILLAME_GGUF_RUNTIME_BINARY is not set');
  if (!modelPath) missingConfig.push('AILLAME_GGUF_MODEL_PATH or AILLAME_GGUF_MODEL_DIR + AILLAME_GGUF_ACTIVE_MODEL is not set');
  if (modelPath && !modelPathExists) missingFiles.push('Configured GGUF model file was not found');

  missingWorker.push('Aillame-controlled GGUF text generation worker is not implemented/configured.');
  nextActions.push('Configure a local GGUF model, runtime binary and Aillame-controlled generation worker.');
  nextActions.push('Verify a real non-empty response without fallback/degraded/placeholder output.');

  const configured = enabled && Boolean(runtimeBinary) && Boolean(modelPath) && modelPathExists;
  const attempted = false;
  const succeeded = false;
  const finalAcceptanceReady = configured && attempted && succeeded && missingWorker.length === 0;
  const reason = finalAcceptanceReady
    ? 'REAL_LLM_GENERATION_SUCCEEDED'
    : missingConfig[0] ?? missingFiles[0] ?? missingWorker[0] ?? 'REAL_LLM_GENERATION_NOT_ATTEMPTED';

  return {
    liveTextRuntimeAvailable: finalAcceptanceReady,
    finalAcceptanceReady,
    configured,
    attempted,
    succeeded,
    selectedRuntime: 'gguf-text-runtime',
    selectedModelId: process.env.AILLAME_GGUF_ACTIVE_MODEL || (modelPath ? path.basename(modelPath) : 'unconfigured'),
    responseLength: 0,
    fallbackUsed: !finalAcceptanceReady,
    degraded: !finalAcceptanceReady,
    reason,
    missingConfig,
    missingFiles,
    missingWorker,
    warnings,
    nextActions,
    nanoAdvisoryProbe: {
      available: false,
      generatedTokenCount: 0,
      decodedLength: 0,
      reason: 'Nano advisory probe is not used for final LLM acceptance.',
    },
    status: finalAcceptanceReady ? 'READY' : 'NOT_CONFIGURED',
  };
}

export function getLiveImageAcceptanceReport() {
  const missingConfig = [];
  const missingFiles = [];
  const missingWorker = [];
  const warnings = [];
  const nextActions = [];

  const enabled = process.env.AILLAME_IGM_RUNTIME_ENABLED === 'true';
  const modelDir = process.env.AILLAME_IGM_MODEL_DIR;
  const activeModel = process.env.AILLAME_IGM_ACTIVE_MODEL;
  const outputDir = process.env.AILLAME_IGM_OUTPUT_DIR || '.aillame-data/assets/images';

  if (!enabled) missingConfig.push('AILLAME_IGM_RUNTIME_ENABLED is false');
  if (!modelDir) missingConfig.push('AILLAME_IGM_MODEL_DIR is not set');
  if (!activeModel) missingConfig.push('AILLAME_IGM_ACTIVE_MODEL is not set');

  const modelDirExists = fileExists(modelDir);
  if (modelDir && !modelDirExists) missingFiles.push('AILLAME_IGM_MODEL_DIR does not exist');

  let activeModelExists = false;
  if (modelDir && activeModel && modelDirExists) {
    const activeModelPath = path.isAbsolute(activeModel)
      ? activeModel
      : path.join(modelDir, activeModel);
    activeModelExists = fileExists(activeModelPath);
    if (!activeModelExists) {
      missingFiles.push('AILLAME_IGM_ACTIVE_MODEL file was not found in the configured model directory');
    }
  }

  let outputDirWritable = false;
  try {
    if (fs.existsSync(outputDir)) {
      fs.accessSync(outputDir, fs.constants.W_OK);
      outputDirWritable = true;
    } else {
      fs.accessSync(path.dirname(outputDir), fs.constants.W_OK);
      outputDirWritable = true;
      warnings.push('AILLAME_IGM_OUTPUT_DIR does not exist yet; parent directory is writable.');
    }
  } catch {
    missingConfig.push('AILLAME_IGM_OUTPUT_DIR is not writable');
  }

  if (enabled) {
    missingWorker.push('Aillame-controlled IGM worker implementation is not configured.');
  }

  if (!enabled) nextActions.push('Set AILLAME_IGM_RUNTIME_ENABLED=true after a local IGM worker is available.');
  if (!modelDir) nextActions.push('Set AILLAME_IGM_MODEL_DIR to a local diffusion model directory.');
  if (!activeModel) nextActions.push('Set AILLAME_IGM_ACTIVE_MODEL to the local model filename.');
  nextActions.push('Configure an Aillame-controlled IGM worker; placeholders do not count for final acceptance.');

  const configured = enabled && Boolean(modelDir) && Boolean(activeModel) && modelDirExists && activeModelExists && outputDirWritable;
  const attempted = false;
  const succeeded = false;
  const finalAcceptanceReady = configured && attempted && succeeded && missingWorker.length === 0;
  const reason = finalAcceptanceReady
    ? 'REAL_IGM_GENERATION_SUCCEEDED'
    : missingConfig[0] ?? missingFiles[0] ?? missingWorker[0] ?? 'REAL_IGM_GENERATION_NOT_ATTEMPTED';

  return {
    liveImageRuntimeAvailable: finalAcceptanceReady,
    finalAcceptanceReady,
    configured,
    attempted,
    succeeded,
    jobId: undefined,
    assetId: undefined,
    outputPathSanitized: undefined,
    mimeType: undefined,
    fileExists: succeeded,
    placeholderUsed: !succeeded,
    degraded: !finalAcceptanceReady,
    reason,
    missingConfig,
    missingFiles,
    missingWorker,
    warnings,
    nextActions,
    status: finalAcceptanceReady ? 'READY' : 'NOT_CONFIGURED',
  };
}

export function getCombinedLiveRuntimeAcceptanceReport() {
  const text = getLiveTextAcceptanceReport();
  const image = getLiveImageAcceptanceReport();
  const blockers = [];
  if (!text.finalAcceptanceReady) blockers.push('Real local LLM generation is not ready.');
  if (!image.finalAcceptanceReady) blockers.push('Real local IGM generation is not ready.');

  return {
    text,
    image,
    overallFinalAcceptanceReady: text.finalAcceptanceReady && image.finalAcceptanceReady,
    blockers,
    nextActions: [...text.nextActions, ...image.nextActions],
    timestamp: new Date().toISOString(),
  };
}
