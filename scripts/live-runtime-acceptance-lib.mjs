import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const LIVE_TEXT_PROMPT = 'Merhaba, Aillame içinde çalışan yerel model olduğunu tek cümleyle açıkla.';
const DEFAULT_TEXT_TIMEOUT_MS = 60000;

function readBoolean(value) {
  return value === '1' || String(value || '').toLowerCase() === 'true';
}

function fileExists(filePath) {
  try {
    return Boolean(filePath && fs.existsSync(filePath));
  } catch {
    return false;
  }
}

function sanitizePath(filePath) {
  return filePath ? path.basename(filePath) : undefined;
}

function resolveGgufModelPath() {
  const directPath = process.env.AILLAME_GGUF_MODEL_PATH;
  if (directPath) return directPath;

  const modelDir = process.env.AILLAME_GGUF_MODEL_DIR;
  const activeModel = process.env.AILLAME_GGUF_ACTIVE_MODEL;
  
  if (modelDir && activeModel) {
    return path.isAbsolute(activeModel)
      ? activeModel
      : path.join(modelDir, activeModel);
  }

  // Fallback to Persistent Store
  const storePath = path.join(process.cwd(), '.aillame-data', 'active-gguf-model.json');
  if (fs.existsSync(storePath)) {
    try {
      const store = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      if (store && store.filePath && store.verified) {
        return store.filePath;
      }
    } catch {
      // Ignore parse errors
    }
  }

  return undefined;
}

function isBlockedRuntimeBinary(binaryPath) {
  const normalized = String(binaryPath || '').toLowerCase();
  return normalized.includes('ollama')
    || normalized.includes('lm studio')
    || normalized.includes('lmstudio')
    || normalized.includes('gemini')
    || normalized.includes('openai');
}

function isExecutableCandidate(binaryPath) {
  if (!fileExists(binaryPath)) return false;
  const ext = path.extname(binaryPath).toLowerCase();
  return ext === '.exe' || ext === '.cmd' || ext === '.bat' || ext === '';
}

function parseGgufFilename(fileName) {
  const name = path.basename(fileName);
  return {
    fileName: name,
    quantization: name.match(/\b(Q[2-8](?:_[A-Z0-9]+)?)\b/i)?.[1]?.toUpperCase(),
    parameterSize: name.match(/\b(\d+(?:\.\d+)?B)\b/i)?.[1]?.toUpperCase(),
  };
}

function discoverGgufCandidates(modelDir, activeModel) {
  if (!modelDir || !fileExists(modelDir)) return [];

  let entries = [];
  try {
    entries = fs.readdirSync(modelDir, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.gguf'))
    .map((entry) => {
      const fullPath = path.join(modelDir, entry.name);
      const parsed = parseGgufFilename(entry.name);
      let readable = false;
      try {
        fs.accessSync(fullPath, fs.constants.R_OK);
        readable = true;
      } catch {
        readable = false;
      }
      return {
        ...parsed,
        sanitizedPath: path.join(path.basename(modelDir), entry.name),
        exists: true,
        readable,
        active: activeModel ? entry.name === path.basename(activeModel) : false,
      };
    });
}

function buildGgufArgs(modelPath, prompt) {
  const customArgs = process.env.AILLAME_GGUF_RUNTIME_ARGS;
  if (customArgs && customArgs.trim()) {
    return customArgs
      .match(/"[^"]*"|'[^']*'|\S+/g)
      ?.map((part) => part.replace(/^['"]|['"]$/g, ''))
      .filter(Boolean)
      .map((part) => part
        .replaceAll('{model}', modelPath)
        .replaceAll('{prompt}', prompt)
        .replaceAll('{maxTokens}', '64')
        .replaceAll('{temperature}', '0.2')) ?? [];
  }

  return ['-m', modelPath, '-p', prompt, '-n', '64', '--temp', '0.2'];
}

function cleanGeneratedText(stdout, stderr, prompt) {
  const text = `${stdout || ''}\n${stderr || ''}`
    .replaceAll('\u0000', '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.toLowerCase().includes('llama_print_timings'))
    .filter((line) => !line.toLowerCase().startsWith('system_info:'))
    .join('\n')
    .trim();

  return text.replace(prompt, '').trim();
}

function runGgufGeneration({ enabled, runtimeBinary, modelPath }) {
  if (!enabled || !runtimeBinary || !modelPath) {
    return {
      attempted: false,
      succeeded: false,
      responseLength: 0,
      outputPreview: undefined,
      reason: 'GGUF runtime is not fully configured.',
      warnings: [],
    };
  }

  const timeoutMs = Number(process.env.AILLAME_TEXT_TIMEOUT_MS || DEFAULT_TEXT_TIMEOUT_MS);
  const result = spawnSync(runtimeBinary, buildGgufArgs(modelPath, LIVE_TEXT_PROMPT), {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TEXT_TIMEOUT_MS,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });

  const output = cleanGeneratedText(result.stdout, result.stderr, LIVE_TEXT_PROMPT);
  const timedOut = Boolean(result.error && result.error.message.includes('ETIMEDOUT'));
  const succeeded = result.status === 0 && output.length > 0 && !timedOut;

  return {
    attempted: true,
    succeeded,
    responseLength: output.length,
    outputPreview: output.slice(0, 160),
    reason: succeeded
      ? 'REAL_LLM_GENERATION_SUCCEEDED'
      : timedOut
        ? 'GGUF_GENERATION_TIMEOUT'
        : result.error?.message || `GGUF_RUNTIME_EXIT_${result.status ?? 'UNKNOWN'}`,
    warnings: result.stderr && !succeeded ? ['Runtime wrote diagnostic output to stderr.'] : [],
  };
}

export function getLiveTextAcceptanceReport() {
  const missingConfig = [];
  const missingFiles = [];
  const missingWorker = [];
  const warnings = [];
  const nextActions = [];

  const enabled = readBoolean(process.env.AILLAME_GGUF_RUNTIME_ENABLED)
    || readBoolean(process.env.AILLAME_GGUF_WORKER_ENABLED);
  const runtimeBinary = process.env.AILLAME_GGUF_RUNTIME_BINARY;
  const runtimeBinaryExists = fileExists(runtimeBinary);
  const runtimeBinaryExecutable = isExecutableCandidate(runtimeBinary);
  const runtimeBinaryBlocked = isBlockedRuntimeBinary(runtimeBinary);
  const modelPath = resolveGgufModelPath();
  const modelPathExists = fileExists(modelPath);
  const modelDir = process.env.AILLAME_GGUF_MODEL_DIR;
  const activeModel = process.env.AILLAME_GGUF_ACTIVE_MODEL;
  const discoveredModels = discoverGgufCandidates(modelDir, activeModel);

  if (!enabled) missingConfig.push('AILLAME_GGUF_RUNTIME_ENABLED is false');
  if (!runtimeBinary) missingConfig.push('AILLAME_GGUF_RUNTIME_BINARY is not set');
  if (runtimeBinary && !runtimeBinaryExists) missingFiles.push('AILLAME_GGUF_RUNTIME_BINARY was not found');
  if (runtimeBinary && !runtimeBinaryExecutable) missingWorker.push('AILLAME_GGUF_RUNTIME_BINARY does not look executable');
  if (runtimeBinaryBlocked) missingWorker.push('Blocked runtime binary name: external wrappers are not accepted for Live LLM acceptance');
  if (!modelPath) missingConfig.push('AILLAME_GGUF_MODEL_PATH or AILLAME_GGUF_MODEL_DIR + AILLAME_GGUF_ACTIVE_MODEL is not set');
  if (modelPath && !modelPathExists) missingFiles.push('Configured GGUF model file was not found');

  if (!runtimeBinary) nextActions.push('Set AILLAME_GGUF_RUNTIME_BINARY to an Aillame-controlled local text worker binary.');
  if (!modelPath) nextActions.push('Set AILLAME_GGUF_MODEL_DIR and AILLAME_GGUF_ACTIVE_MODEL, or set AILLAME_GGUF_MODEL_PATH.');
  if (discoveredModels.length > 1 && !activeModel) nextActions.push('Multiple GGUF candidates were found; set AILLAME_GGUF_ACTIVE_MODEL explicitly.');
  nextActions.push('Verify a real non-empty response without fallback/degraded/placeholder output.');

  const configured = enabled
    && Boolean(runtimeBinary)
    && runtimeBinaryExists
    && runtimeBinaryExecutable
    && !runtimeBinaryBlocked
    && Boolean(modelPath)
    && modelPathExists;

  const generation = configured
    ? runGgufGeneration({ enabled, runtimeBinary, modelPath })
    : { attempted: false, succeeded: false, responseLength: 0, outputPreview: undefined, reason: 'GGUF runtime is not fully configured.', warnings: [] };

  warnings.push(...generation.warnings);

  const attempted = generation.attempted;
  const succeeded = generation.succeeded;
  if (configured && attempted && !succeeded) {
    missingWorker.push(generation.reason || 'GGUF generation did not produce accepted output');
  }

  const finalAcceptanceReady = configured && attempted && succeeded && missingWorker.length === 0;
  const reason = finalAcceptanceReady
    ? 'REAL_LLM_GENERATION_SUCCEEDED'
    : missingConfig[0] ?? missingFiles[0] ?? missingWorker[0] ?? generation.reason ?? 'REAL_LLM_GENERATION_NOT_ATTEMPTED';

  return {
    liveTextRuntimeAvailable: finalAcceptanceReady,
    finalAcceptanceReady,
    configured,
    attempted,
    succeeded,
    selectedRuntime: 'gguf-text-runtime',
    selectedModelId: activeModel || (modelPath ? path.basename(modelPath) : 'unconfigured'),
    runtimeBinary: sanitizePath(runtimeBinary),
    modelPathSanitized: sanitizePath(modelPath),
    discoveredModels,
    responseLength: generation.responseLength,
    outputPreview: finalAcceptanceReady ? generation.outputPreview : undefined,
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
