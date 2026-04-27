import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { MODEL_REGISTRY } from '../models/registry';

const execAsync = promisify(exec);
const homeDir = process.env.USERPROFILE || process.env.HOME || '';

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
  const pythonPath = process.env.AILLAME_PYTHON || 'python';
  const report: ModelStatusReport = {
    modelId: 'Qwen/Qwen3-VL-8B-Instruct',
    isReady: false,
    status: 'planning_only',
    details: {
      pythonFound: false,
      packagesInstalled: false,
      modelCached: false,
      cudaAvailable: false,
    }
  };

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
      const { stdout } = await execAsync(`& "${pythonPath}" -c "import torch, transformers, accelerate, qwen_vl_utils; print('OK'); print(torch.cuda.is_available())"`, { shell: 'powershell.exe' });
      if (stdout.includes('OK')) {
        report.details.packagesInstalled = true;
        report.details.cudaAvailable = stdout.includes('True');
      }
    } catch (e: any) {
      report.status = 'planning_only';
      report.details.error = `Qwen dependencies missing: ${e.message}`;
      return report;
    }

    // 3. Model Cache Check
    const cacheDir = path.join(homeDir, '.cache', 'huggingface', 'hub', 'models--Qwen--Qwen3-VL-8B-Instruct');
    if (fs.existsSync(cacheDir)) {
      report.details.modelCached = true;
    }

    // Final decision
    if (report.details.pythonFound && report.details.packagesInstalled && report.details.modelCached) {
      report.isReady = true;
      report.status = 'active';
      report.message = report.details.cudaAvailable ? 'Active / GPU Accelerated' : 'Active with CPU offload';
    } else if (report.details.pythonFound && report.details.packagesInstalled) {
      report.status = 'planning_only';
      report.message = 'Ready to download (16GB).';
      report.details.error = 'Qwen model not cached. First run will be slow (downloading 16GB).';
    }

  } catch (err: any) {
    report.status = 'error';
    report.details.error = err.message;
  }

  return report;
}

export function getAllModelInstallStatuses() {
  return Object.values(MODEL_REGISTRY).map(model => {
    let installed = false;
    let cachePath = '';
    
    if (model.builtIn) {
      installed = true;
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
      runtimeAvailable: !!process.env.AILLAME_PYTHON || model.runtime === 'rust-candle'
    };
  });
}
