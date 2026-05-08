import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const LIVE_TEXT_PROMPT = 'Merhaba, Aillame içinde çalışan yerel model olduğunu tek cümleyle açıkla.';
const DEFAULT_TEXT_TIMEOUT_MS = 60000;

// Manual .env loader for standalone smoke tests
function loadEnv() {
  const envPath = path.join(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split(/\r?\n/).forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        if (!process.env[key]) process.env[key] = value;
      }
    });
  }
}

loadEnv();

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

async function runGgufGeneration({ enabled, runtimeBinary, modelPath }) {
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

  const isServerBinary = runtimeBinary.toLowerCase().includes('llama-server');
  const timeoutMs = Number(process.env.AILLAME_TEXT_TIMEOUT_MS || DEFAULT_TEXT_TIMEOUT_MS);
  
  // Try CLI mode first (unless we are sure it's ONLY a server)
  let result = spawnSync(runtimeBinary, buildGgufArgs(modelPath, LIVE_TEXT_PROMPT), {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: Number.isFinite(timeoutMs) ? timeoutMs : DEFAULT_TEXT_TIMEOUT_MS,
    windowsHide: true,
    maxBuffer: 1024 * 1024,
  });

  let output = cleanGeneratedText(result.stdout, result.stderr, LIVE_TEXT_PROMPT);
  let timedOut = Boolean(result.error && result.error.message.includes('ETIMEDOUT'));
  let succeeded = result.status === 0 && output.length > 0 && !timedOut;

  // Fallback: If it's llama-server and CLI failed (expected), try HTTP probe if already running
  if (!succeeded && isServerBinary) {
    const port = process.env.AILLAME_GEMMA_PORT || '8080';
    const url = `http://127.0.0.1:${port}/completion`;
    const ggufWarnings = [];
    
    try {
      // Check if port is open before fetching
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: 'Hi, say hello.', 
          n_predict: 32, 
          temperature: 0.1
        }),
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const json = await response.json();
        const content = json.content || json.choices?.[0]?.text || json.choices?.[0]?.message?.content;
        if (content && content.length > 0) {
          output = content.trim();
          succeeded = true;
          return {
            attempted: true,
            succeeded: true,
            responseLength: output.length,
            outputPreview: output.slice(0, 160),
            reason: 'REAL_LLM_GENERATION_SUCCEEDED_VIA_HTTP_PROBE',
            warnings: ['Used HTTP probe for llama-server.'],
          };
        } else {
          ggufWarnings.push('HTTP probe returned empty content');
        }
      } else {
        const errText = await response.text().catch(() => 'No error body');
        ggufWarnings.push(`HTTP probe failed with status ${response.status}: ${errText.slice(0, 100)}`);
      }
    } catch (e) {
      if (e.name === 'AbortError' || e.message.includes('timeout')) {
        ggufWarnings.push(`HTTP probe timed out at ${url}. Is the server loaded?`);
      } else {
        ggufWarnings.push(`HTTP probe error at ${url}: ${e.message}. Ensure llama-server is running.`);
      }
    }
    
    // If we're here, both CLI and HTTP probe failed.
    return {
      attempted: true,
      succeeded: false,
      responseLength: 0,
      outputPreview: undefined,
      reason: result.status === 1 ? 'SERVER_BINARY_REQUIRES_ACTIVE_SERVICE' : (result.error?.message || `GGUF_RUNTIME_EXIT_${result.status ?? 'UNKNOWN'}`),
      warnings: [
        'llama-server.exe detected. This binary usually requires an active server process.',
        'If the app is not running, start it or run llama-server manually.',
        ...(result.stderr ? [`Last CLI Stderr: ${result.stderr.slice(0, 200)}`] : []), 
        ...ggufWarnings
      ],
    };
  }

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


export async function getLiveTextAcceptanceReport() {
  const missingConfig = [];
  const missingFiles = [];
  const missingWorker = [];
  const warnings = [];
  const nextActions = [];

  const enabled = readBoolean(process.env.AILLAME_GGUF_RUNTIME_ENABLED)
    || readBoolean(process.env.AILLAME_GGUF_WORKER_ENABLED)
    || readBoolean(process.env.AILLAME_GEMMA_ENABLED); // Legacy fallback

  const runtimeBinary = process.env.AILLAME_GGUF_RUNTIME_BINARY
    || process.env.AILLAME_GEMMA_LLAMA_SERVER_EXE; // Legacy fallback

  const runtimeBinaryExists = fileExists(runtimeBinary);
  const runtimeBinaryExecutable = isExecutableCandidate(runtimeBinary);
  const runtimeBinaryBlocked = isBlockedRuntimeBinary(runtimeBinary);
  const modelPath = resolveGgufModelPath() 
    || process.env.AILLAME_GEMMA_GGUF_FILE 
    || process.env.AILLAME_GEMMA_MODEL_PATH; // Legacy fallbacks

  const modelPathExists = fileExists(modelPath);
  const modelDir = process.env.AILLAME_GGUF_MODEL_DIR;
  const activeModel = process.env.AILLAME_GGUF_ACTIVE_MODEL 
    || process.env.AILLAME_GEMMA_MODEL_ID; // Legacy fallback

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
    ? await runGgufGeneration({ enabled, runtimeBinary, modelPath })
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

async function runIgmGeneration({ enabled, modelPath }) {
  const workerCommand = process.env.AILLAME_IGM_WORKER_COMMAND;
  if (!enabled || !workerCommand || !modelPath) {
    return {
      attempted: false,
      succeeded: false,
      reason: 'IGM worker or model not configured.',
      warnings: [],
    };
  }

  const outputDir = process.env.AILLAME_IGM_OUTPUT_DIR || '.aillame-data/assets/images';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const jobId = `smoke_igm_${Date.now()}`;
  const assetId = `asset_${jobId}`;
  const protocol = process.env.AILLAME_IGM_PROTOCOL || 'stream';

  const request = {
    prompt: 'a simple blue cube on a clean white background, minimal style',
    width: 256,
    height: 256,
    steps: 1, // Fast probe
    seed: 42,
    modelId: path.basename(modelPath),
    outputDir,
    jobId,
    assetId
  };

  try {
    let result;
    let response;

    const workerArgsString = process.env.AILLAME_IGM_WORKER_ARGS || '';
    const workerArgs = workerArgsString.split(' ').filter(Boolean);

    if (protocol === 'foundation') {
      const tempDir = path.join(process.cwd(), '.aillame-data', 'temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const requestPath = path.join(tempDir, `${jobId}_req.json`);
      const responsePath = path.join(tempDir, `${jobId}_res.json`);
      fs.writeFileSync(requestPath, JSON.stringify(request));
      
      const fullArgs = [...workerArgs, '--request', requestPath, '--output', responsePath];
      result = spawnSync(workerCommand, fullArgs, {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 60000,
        windowsHide: true,
      });

      if (result.status === 0 && fs.existsSync(responsePath)) {
        response = JSON.parse(fs.readFileSync(responsePath, 'utf8'));
      }
    } else {
      // Stream mode
      result = spawnSync(workerCommand, workerArgs, {
        input: JSON.stringify(request),
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 60000,
        windowsHide: true,
      });


      if (result.status === 0) {
        const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) response = JSON.parse(jsonMatch[0]);
      }
    }

    if (response && response.success) {
      // Handle base64 or file
      let finalPath = response.imagePath;
      if (response.image?.startsWith('data:image')) {
        const b64Data = response.image.split(',')[1];
        const buffer = Buffer.from(b64Data, 'base64');
        finalPath = path.join(outputDir, `${assetId}.png`);
        fs.writeFileSync(finalPath, buffer);
      }

      if (finalPath && fs.existsSync(finalPath)) {
        return {
          attempted: true,
          succeeded: true,
          jobId,
          assetId,
          outputPath: finalPath,
          reason: 'REAL_IGM_GENERATION_SUCCEEDED',
          warnings: [],
        };
      }
    }

    return {
      attempted: true,
      succeeded: false,
      reason: result?.status !== 0 ? `IGM_WORKER_EXIT_${result?.status}` : 'IGM_WORKER_NO_VALID_OUTPUT',
      warnings: result?.stderr ? ['Worker wrote to stderr.'] : [],
    };
  } catch (err) {
    return {
      attempted: true,
      succeeded: false,
      reason: `IGM_PROBE_ERROR: ${err.message}`,
      warnings: [],
    };
  }
}

export async function getLiveImageAcceptanceReport() {
  const missingConfig = [];
  const missingFiles = [];
  const missingWorker = [];
  const warnings = [];
  const nextActions = [];

  const enabled = process.env.AILLAME_IGM_RUNTIME_ENABLED === 'true';
  const workerCommand = process.env.AILLAME_IGM_WORKER_COMMAND;
  const modelDir = process.env.AILLAME_IGM_MODEL_DIR;
  const activeModel = process.env.AILLAME_IGM_ACTIVE_MODEL;
  const outputDir = process.env.AILLAME_IGM_OUTPUT_DIR || '.aillame-data/assets/images';

  if (!enabled) missingConfig.push('AILLAME_IGM_RUNTIME_ENABLED is false');
  if (!workerCommand) missingConfig.push('AILLAME_IGM_WORKER_COMMAND is not set');
  if (!modelDir) missingConfig.push('AILLAME_IGM_MODEL_DIR is not set');
  if (!activeModel) missingConfig.push('AILLAME_IGM_ACTIVE_MODEL is not set');

  const workerExists = fileExists(workerCommand);
  if (workerCommand && !workerExists) missingWorker.push(`IGM worker command not found: ${workerCommand}`);

  const modelDirExists = fileExists(modelDir);
  if (modelDir && !modelDirExists) missingFiles.push('AILLAME_IGM_MODEL_DIR does not exist');

  let activeModelExists = false;
  let modelPath = '';
  if (modelDir && activeModel && modelDirExists) {
    modelPath = path.isAbsolute(activeModel) ? activeModel : path.join(modelDir, activeModel);
    activeModelExists = fileExists(modelPath);
    if (!activeModelExists) {
      missingFiles.push('AILLAME_IGM_ACTIVE_MODEL file was not found');
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
    }
  } catch {
    missingConfig.push('AILLAME_IGM_OUTPUT_DIR is not writable');
  }

  if (enabled && !workerCommand) {
    missingWorker.push('Aillame-controlled IGM worker command is not configured.');
  }

  if (!enabled) nextActions.push('Set AILLAME_IGM_RUNTIME_ENABLED=true');
  if (!workerCommand) nextActions.push('Set AILLAME_IGM_WORKER_COMMAND to a local IGM worker binary or script.');
  if (!modelDir) nextActions.push('Set AILLAME_IGM_MODEL_DIR');
  if (!activeModel) nextActions.push('Set AILLAME_IGM_ACTIVE_MODEL');

  const configured = enabled && workerExists && activeModelExists && outputDirWritable;
  const generation = configured 
    ? await runIgmGeneration({ enabled, modelPath })
    : { attempted: false, succeeded: false, reason: 'IGM not configured', warnings: [] };

  const attempted = generation.attempted;
  const succeeded = generation.succeeded;
  const finalAcceptanceReady = configured && attempted && succeeded && missingWorker.length === 0;

  const reason = finalAcceptanceReady
    ? 'REAL_IGM_GENERATION_SUCCEEDED'
    : missingConfig[0] ?? missingFiles[0] ?? missingWorker[0] ?? generation.reason ?? 'REAL_IGM_GENERATION_NOT_ATTEMPTED';

  return {
    liveImageRuntimeAvailable: finalAcceptanceReady,
    finalAcceptanceReady,
    configured,
    attempted,
    succeeded,
    workerConfigured: workerExists,
    modelConfigured: activeModelExists,
    jobId: generation.jobId,
    assetId: generation.assetId,
    outputPathSanitized: generation.outputPath ? path.basename(generation.outputPath) : undefined,
    mimeType: succeeded ? 'image/png' : undefined,
    fileExists: succeeded,
    placeholderUsed: !succeeded,
    degraded: !finalAcceptanceReady,
    reason,
    missingConfig,
    missingFiles,
    missingWorker,
    warnings: [...warnings, ...generation.warnings],
    nextActions,
    status: finalAcceptanceReady ? 'READY' : 'NOT_CONFIGURED',
  };
}

export async function getCombinedLiveRuntimeAcceptanceReport() {
  const text = await getLiveTextAcceptanceReport();
  const image = await getLiveImageAcceptanceReport();
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
