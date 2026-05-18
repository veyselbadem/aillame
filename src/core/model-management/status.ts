import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { MODEL_REGISTRY, QWEN3_VL_4B_LOCAL_MODEL_ID } from '../models/registry';
import { checkGeminiConfig } from '../inference/gemini';
import { getTextRuntimeRouterStatus } from '../inference/text-runtime-router';
import { listLocalModels } from '../model-library/model-library-service';
import { InstalledModelRegistryService } from '../../services/model/installed-model-registry.service';

const execAsync = promisify(exec);
const homeDir = process.env.USERPROFILE || process.env.HOME || '';

export async function getOllamaReadiness(): Promise<ModelStatusReport> {
  const baseUrl = (process.env.AILLAME_OLLAMA_BASE_URL || 'http://127.0.0.1:11434')
    .replace(/\/+$/, '')
    .replace(/\/api$/i, '');
  const modelId = process.env.AILLAME_OLLAMA_TEXT_MODEL || 'gemma:2b';

  const report: ModelStatusReport = {
    modelId: modelId,
    isReady: false,
    status: 'planning_only',
    details: { pythonFound: true, packagesInstalled: true, modelCached: false, cudaAvailable: true }
  };

  if (process.env.AILLAME_OLLAMA_ENABLED === 'false') {
    report.status = 'error';
    report.details.error = 'Ollama is disabled in .env';
    return report;
  }

  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error('Server returned non-200');
    const data = await res.json();

    const availableModels = Array.isArray(data.models) ? data.models.map((m: any) => m.name).filter(Boolean) : [];
    const hasModel = availableModels.some((name: string) => name === modelId || name.startsWith(modelId));
    if (hasModel) {
      report.isReady = true;
      report.status = 'active';
      report.message = 'Active / Ollama Server Up';
    } else {
      report.status = 'planning_only';
      report.message = `Ollama çalışıyor ancak seçili model yüklü değil: ${modelId}. Mevcut modeller: ${availableModels.length ? availableModels.join(', ') : 'bulunamadı'}.`;
      report.details.error = `Set AILLAME_OLLAMA_TEXT_MODEL to an installed model or run: ollama pull ${modelId}`;
      report.details.availableModels = availableModels;
    }
  } catch (e: any) {
    report.status = 'error';
    report.details.error = 'Ollama server offline or unreachable.';
  }
  return report;
}

export interface ModelStatusReport {
  modelId: string;
  isReady: boolean;
  status: 'active' | 'planning_only' | 'error';
  message?: string;
  details: {
    pythonFound: boolean;
    packagesInstalled: boolean;
    modelCached: boolean;
    cudaAvailable: boolean;
    error?: string;
    availableModels?: string[];
    apiKeyConfigured?: boolean;
    enabled?: boolean;
    proProvider?: string;
  };
}

export type InternalTextRuntimeReadiness = {
  isReady: boolean;
  status: 'active' | 'planning_only' | 'error';
  message: string;
  details: {
    enabled: boolean;
    health: string;
    provider: string;
    lockPhase: string;
    lockOwner: string | null;
    lastError?: string;
  };
};

export async function getInternalTextRuntimeReadiness(): Promise<InternalTextRuntimeReadiness> {
  const status = await getTextRuntimeRouterStatus();
  const lockOwner = status.lock.owner
    ? `${status.lock.owner.provider}:${status.lock.owner.modelId}`
    : null;

  const isReady = status.enabled && status.health === 'healthy';

  return {
    isReady,
    status: isReady ? 'active' : status.enabled ? 'error' : 'planning_only',
    message: isReady
      ? 'Unified internal text runtime is ready.'
      : status.enabled
        ? 'Unified internal text runtime is enabled but not healthy.'
        : 'Unified internal text runtime is disabled.',
    details: {
      enabled: status.enabled,
      health: status.health,
      provider: status.activeProvider || 'gguf',
      lockPhase: status.lock.phase,
      lockOwner,
      lastError: status.lastError,
    },
  };
}

export async function getSdxlReadiness(): Promise<ModelStatusReport> {
  const pythonPath = process.env.AILLAME_PYTHON || 'python';
  const report: ModelStatusReport = {
    modelId: 'stabilityai/stable-diffusion-xl-base-1.0',
    isReady: false,
    status: 'planning_only',
    details: {
      pythonFound: false,
      packagesInstalled: false,
      modelCached: false,
      cudaAvailable: false,
    }
  };

  if (process.env.AILLAME_SDXL_ENABLED !== 'true') {
    report.status = 'planning_only';
    report.message = 'SDXL is optional and disabled.';
    report.details.error = 'Set AILLAME_SDXL_ENABLED=true only for image generation runs.';
    return report;
  }

  try {
    // 1. Python Check
    if (fs.existsSync(pythonPath) || pythonPath === 'python') {
      report.details.pythonFound = true;
    } else {
      report.status = 'error';
      report.details.error = 'Python path not found.';
      return report;
    }

    // 2. Packages Check
    try {
      const { stdout } = await execAsync(`& "${pythonPath}" -c "import torch, diffusers, transformers, accelerate, safetensors; print('OK'); print(torch.cuda.is_available())"`, { shell: 'powershell.exe' });
      if (stdout.includes('OK')) {
        report.details.packagesInstalled = true;
        report.details.cudaAvailable = stdout.includes('True');
      }
    } catch (e: any) {
      report.status = 'error';
      report.details.error = `Dependencies missing: ${e.message}`;
      return report;
    }

    // 3. Model Cache Check
    const cacheDir = path.join(homeDir, '.cache', 'huggingface', 'hub', 'models--stabilityai--stable-diffusion-xl-base-1.0');
    if (fs.existsSync(cacheDir)) {
      report.details.modelCached = true;
    }

    // Final decision
    if (report.details.pythonFound && report.details.packagesInstalled && report.details.modelCached) {
      report.isReady = true;
      report.status = 'active';
      report.message = report.details.cudaAvailable ? 'Active / GPU Accelerated' : 'Active with CPU offload';
    } else if (report.details.pythonFound && report.details.packagesInstalled) {
      report.status = 'planning_only'; // Ready to download but not cached
      report.message = 'Ready to download. First run will be slow.';
      report.details.error = 'Model not cached. Will be downloaded on first run.';
    }

  } catch (err: any) {
    report.status = 'error';
    report.details.error = err.message;
  }

  return report;
}

export async function getQwenReadiness(): Promise<ModelStatusReport> {
  const modelPath = 'C:\\Aillame\\Models\\nano\\qwen3-vl-4b\\model.gguf';
  const mmprojPath = 'C:\\Aillame\\Models\\nano\\qwen3-vl-4b\\mmproj.gguf';
  const report: ModelStatusReport = {
    modelId: QWEN3_VL_4B_LOCAL_MODEL_ID,
    isReady: false,
    status: 'planning_only',
    details: {
      pythonFound: true,
      packagesInstalled: true,
      modelCached: false,
      cudaAvailable: false,
    }
  };

  try {
    const modelExists = fs.existsSync(modelPath);
    const mmprojExists = fs.existsSync(mmprojPath);
    report.details.modelCached = modelExists && mmprojExists;

    if (modelExists && mmprojExists) {
      report.isReady = true;
      report.status = 'active';
      report.message = 'Active / Local GGUF + mmproj ready';
    } else {
      report.status = 'error';
      report.message = 'Qwen3-VL 4B local vision model is incomplete.';
      report.details.error = `Eksik dosya: ${!modelExists ? modelPath : mmprojPath}`;
    }

  } catch (err: any) {
    report.status = 'error';
    report.details.error = err.message;
  }

  return report;
}

export function getGeminiReadiness(): ModelStatusReport {
  const config = checkGeminiConfig();
  const report: ModelStatusReport = {
    modelId: config.model,
    isReady: config.enabled && config.apiKeyConfigured,
    status: config.enabled && config.apiKeyConfigured ? 'active' : 'planning_only',
    details: {
      pythonFound: true,
      packagesInstalled: true,
      modelCached: true,
      cudaAvailable: false,
      apiKeyConfigured: config.apiKeyConfigured,
      enabled: config.enabled,
      proProvider: process.env.AILLAME_PRO_PROVIDER || (config.apiKeyConfigured ? 'gemini' : 'auto'),
    },
  };

  if (!config.enabled) {
    report.message = 'Gemini provider is disabled.';
    report.details.error = 'Set AILLAME_GEMINI_ENABLED=true to use Gemini for Pro Chat.';
  } else if (!config.apiKeyConfigured) {
    report.message = 'Gemini API key missing.';
    report.details.error = 'Set AILLAME_GEMINI_API_KEY or GEMINI_API_KEY.';
  } else {
    report.message = 'Active / Gemini API configured';
  }

  return report;
}

export async function getGemmaReadiness(): Promise<ModelStatusReport> {
  const pythonPath = process.env.AILLAME_PYTHON || 'python';
  const runtime = process.env.AILLAME_GEMMA_RUNTIME || 'gguf';
  const gemmaModelId = process.env.AILLAME_GEMMA_MODEL_ID || 'google/gemma-4-E4B-it';
  const ggufFile = process.env.AILLAME_GEMMA_GGUF_FILE || 'gemma-4-E4B-it-Q4_K_M.gguf';

  const report: ModelStatusReport = {
    modelId: gemmaModelId,
    isReady: false,
    status: 'planning_only',
    details: {
      pythonFound: false,
      packagesInstalled: false,
      modelCached: false,
      cudaAvailable: false,
    }
  };

  if (process.env.AILLAME_GEMMA_ENABLED !== 'true') {
    report.status = 'planning_only';
    report.message = 'Gemma is optional and disabled.';
    report.details.error = 'Set AILLAME_GEMMA_ENABLED=true when the local Gemma server/runtime is ready.';
    return report;
  }

  try {
    if (runtime === 'gguf') {
      // GGUF Check: Support absolute paths or default relative location
      const ggufPath = path.isAbsolute(ggufFile)
        ? ggufFile
        : path.join(process.cwd(), 'data', 'models', 'gguf', ggufFile);
      const fileExists = fs.existsSync(ggufPath);

      report.details.modelCached = fileExists;

      // Llama Server Check (Optional, but good for status)
      const serverUrl = process.env.AILLAME_GEMMA_SERVER_URL || 'http://127.0.0.1:8080';
      let serverUp = false;
      try {
        const res = await fetch(`${serverUrl}/health`, { signal: AbortSignal.timeout(2000) });
        serverUp = res.ok;
      } catch (e) {}

      if (fileExists) {
        report.isReady = true; // For GGUF, file exists = ready (server might need start)
        report.status = 'active';
        report.message = serverUp ? 'Active / GGUF Server Up' : 'Active / GGUF File Ready (Start server to use)';
      } else {
        report.status = 'planning_only';
        report.message = 'GGUF model file missing.';
        report.details.error = `Place ${ggufFile} in data/models/gguf/`;
      }
      return report;
    }

    // Transformers Runtime Check
    if (fs.existsSync(pythonPath) || pythonPath === 'python') {
      report.details.pythonFound = true;
    }

    try {
      const { stdout } = await execAsync(`& "${pythonPath}" -c "import torch, transformers; print('OK'); print(torch.cuda.is_available())"`, { shell: 'powershell.exe' });
      if (stdout.includes('OK')) {
        report.details.packagesInstalled = true;
        report.details.cudaAvailable = stdout.includes('True');
      }
    } catch (e: any) {
      report.status = 'planning_only';
      report.details.error = `Gemma dependencies missing: ${e.message}`;
      return report;
    }

    const folderName = `models--${gemmaModelId.replace(/\//g, '--')}`;
    const cacheDir = path.join(homeDir, '.cache', 'huggingface', 'hub', folderName);
    if (fs.existsSync(cacheDir)) {
      report.details.modelCached = true;
    }

    if (report.details.pythonFound && report.details.packagesInstalled && report.details.modelCached) {
      report.isReady = true;
      report.status = 'active';
      report.message = report.details.cudaAvailable ? 'Active / GPU Accelerated' : 'Active / CPU Mode';
    } else {
      report.status = 'planning_only';
      report.message = 'Model download required (Transformers).';
    }

  } catch (err: any) {
    report.status = 'error';
    report.details.error = err.message;
  }

  return report;
}

function formatBytes(bytes?: number): string {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export async function getAllModelInstallStatuses() {
  const managed = Object.values(MODEL_REGISTRY).map(model => {
    let installed = false;
    let cachePath = '';

    if (model.builtIn) {
      installed = true;
    } else if (model.id === QWEN3_VL_4B_LOCAL_MODEL_ID) {
      const localModelPath = 'C:\\Aillame\\Models\\nano\\qwen3-vl-4b\\model.gguf';
      const localMmprojPath = 'C:\\Aillame\\Models\\nano\\qwen3-vl-4b\\mmproj.gguf';
      installed = fs.existsSync(localModelPath) && fs.existsSync(localMmprojPath);
      cachePath = localModelPath;
    } else if (model.repoId) {
      const folderName = `models--${model.repoId.replace('/', '--')}`;
      const fullPath = path.join(homeDir, '.cache', 'huggingface', 'hub', folderName);
      if (fs.existsSync(fullPath)) {
        installed = true;
        cachePath = fullPath;
      }
    }

    return {
      ...model,
      installed,
      cachePath,
      runtimeAvailable: model.runtime === 'aillame-gguf' || !!process.env.AILLAME_PYTHON || model.runtime === 'rust-candle'
    };
  }).filter(model => model.enabled !== false || model.installed);

  // Include discovered models
  try {
    const [discovered, registered] = await Promise.all([
      listLocalModels(),
      InstalledModelRegistryService.getInstalledModels(),
    ]);
    const registeredModels = registered
      .filter(m => m.status === 'registered')
      .filter(m => !managed.some(man => man.id === m.id))
      .map(m => ({
        id: m.id,
        label: m.name,
        purpose: (m.type === 'image' ? 'image-generation' : 'chat') as 'chat' | 'image-generation',
        tier: 'nano' as const,
        runtime: m.runtime,
        sizeLabel: formatBytes(m.sizeBytes),
        capabilities: m.capabilities || (m.type === 'vision' ? ['vision', 'chat'] : ['text']),
        description: m.modality === 'vision_language'
          ? 'Registered local vision-language GGUF model.'
          : 'Registered local GGUF model.',
        installHint: `Registered at: ${m.path}`,
        installed: true,
        builtIn: false,
        cachePath: m.path,
        runtimeAvailable: true
      }));
    const discoveredModels = discovered
      .filter(m => !managed.some(man => man.id === m.id) && !registeredModels.some(reg => reg.id === m.id)) // avoid duplicates
      .map(m => ({
        id: m.id,
        label: m.name,
        purpose: (m.capabilities.includes('image') ? 'image-generation' : 'chat') as 'chat' | 'image-generation',
        tier: 'nano' as const, // discovered models default to nano tier for UI
        runtime: m.runtime,
        sizeLabel: formatBytes(m.sizeBytes),
        capabilities: m.capabilities,
        description: m.description || `Discovered local model from ${m.provider}.`,
        installHint: `Found at: ${m.localPath || 'ollama'}`,
        installed: m.status === 'available',
        builtIn: false,
        cachePath: m.localPath,
        runtimeAvailable: true
      }));

    return [...managed, ...registeredModels, ...discoveredModels];
  } catch (err) {
    console.error('[status] Failed to list discovered models:', err);
    return managed;
  }
}
