import fs from 'fs';
import path from 'path';
import { getProjectRoot, resolveProjectRelative } from '../../project-root';

export interface IGMRuntimeDiagnostics {
  enabled: boolean;
  modelDirConfigured: boolean;
  activeModelConfigured: boolean;
  modelDirExists: boolean;
  activeModelExists: boolean;
  outputDirWritable: boolean;
  workerAvailable: boolean;
  device: 'auto' | 'cpu' | 'gpu';
  configured: boolean;
  attempted: boolean;
  succeeded: boolean;
  finalAcceptanceReady: boolean;
  missingConfig: string[];
  missingFiles: string[];
  missingWorker: string[];
  warnings: string[];
  nextActions: string[];
  reason: string;
  deviceDetails?: string;
  deviceReason?: string;
  performanceWarning?: boolean;
}

export class IGMRuntimeReadiness {
  static getDiagnostics(): IGMRuntimeDiagnostics {
    const missingConfig: string[] = [];
    const missingFiles: string[] = [];
    const missingWorker: string[] = [];
    const warnings: string[] = [];
    const nextActions: string[] = [];
    let lastDeviceDetails: string | undefined = undefined;
    let lastDeviceReason: string | undefined = undefined;
    
    const enabled = process.env.AILLAME_IGM_RUNTIME_ENABLED === 'true';
    const modelDir = process.env.AILLAME_IGM_MODEL_DIR;
    const activeModel = process.env.AILLAME_IGM_ACTIVE_MODEL;
    const visionModelPath = process.env.AILLAME_VISION_MODEL_PATH;
    const outputDir = process.env.AILLAME_IGM_OUTPUT_DIR 
        ? resolveProjectRelative(process.env.AILLAME_IGM_OUTPUT_DIR)
        : resolveProjectRelative('.aillame-data/assets/images');
    const device = (process.env.AILLAME_IGM_DEVICE as any) || 'auto';

    if (!enabled) missingConfig.push('AILLAME_IGM_RUNTIME_ENABLED is false');
    if (!modelDir && !visionModelPath) missingConfig.push('AILLAME_IGM_MODEL_DIR or AILLAME_VISION_MODEL_PATH is not set');
    if (!activeModel && !visionModelPath) missingConfig.push('AILLAME_IGM_ACTIVE_MODEL is not set');

    const modelDirExists = Boolean(modelDir && fs.existsSync(modelDir));
    if (modelDir && !modelDirExists) {
      missingFiles.push('AILLAME_IGM_MODEL_DIR does not exist');
    }

    let activeModelExists = false;
    let resolvedActiveModelPath = '';
    
    if (visionModelPath && fs.existsSync(visionModelPath)) {
      activeModelExists = true;
      resolvedActiveModelPath = visionModelPath;
    } else if (modelDir && activeModel && modelDirExists) {
      const activeModelPath = path.isAbsolute(activeModel)
        ? activeModel
        : path.join(modelDir, activeModel);
      activeModelExists = fs.existsSync(activeModelPath);
      resolvedActiveModelPath = activeModelExists ? activeModelPath : '';
      if (!activeModelExists) {
        missingFiles.push('AILLAME_IGM_ACTIVE_MODEL file was not found in the configured model directory');
      }
    } else if (visionModelPath && !fs.existsSync(visionModelPath)) {
      missingFiles.push('AILLAME_VISION_MODEL_PATH file was not found');
    }

    let outputDirWritable = false;
    try {
      if (fs.existsSync(outputDir)) {
        fs.accessSync(outputDir, fs.constants.W_OK);
        outputDirWritable = true;
      } else {
        const parentDir = path.dirname(outputDir);
        fs.accessSync(parentDir, fs.constants.W_OK);
        outputDirWritable = true;
        warnings.push('AILLAME_IGM_OUTPUT_DIR does not exist yet; parent directory is writable.');
      }
    } catch {
      missingConfig.push('AILLAME_IGM_OUTPUT_DIR is not writable');
    }

    const rawWorkerCommand = process.env.AILLAME_IGM_WORKER_COMMAND;
    const workerCommand = rawWorkerCommand ? resolveProjectRelative(rawWorkerCommand) : undefined;
    const workerExists = Boolean(workerCommand && fs.existsSync(workerCommand));
    const workerAvailable = enabled && workerExists;

    let packagesInstalled = false;
    if (enabled && workerExists) {
      try {
        const { spawnSync } = require('child_process');
        const depCheck = spawnSync(workerCommand, ['-c', 'import torch, diffusers, transformers, accelerate, safetensors, PIL, huggingface_hub; print("OK")'], { encoding: 'utf8' });
        if (depCheck.status === 0 && depCheck.stdout.includes('OK')) {
          packagesInstalled = true;
        } else {
          const projectRoot = getProjectRoot();
          missingWorker.push('IGM Python dependencies missing: torch, diffusers, transformers, accelerate, safetensors, pillow, huggingface_hub.');
          if (depCheck.stderr) {
             const sanitizedPath = workerCommand ? path.basename(workerCommand) : 'unknown';
             warnings.push(`Dependency check failed with ${sanitizedPath} in ${path.basename(projectRoot)}. Details: ${depCheck.stderr.slice(0, 100)}`);
          }
        }
      } catch (e) {
        warnings.push('Failed to run IGM dependency check.');
      }
    }

    if (enabled && !workerCommand) {
      missingWorker.push('AILLAME_IGM_WORKER_COMMAND is not set.');
    } else if (enabled && !workerExists) {
      missingWorker.push(`IGM worker binary not found: ${workerCommand}`);
    }
    const configured = enabled
      && Boolean(modelDir)
      && Boolean(activeModel)
      && modelDirExists
      && activeModelExists
      && outputDirWritable
      && workerExists
      && packagesInstalled;

    let attempted = false;

    let succeeded = false;

    // Check actual job history for acceptance
    const dataDir = process.env.AILLAME_DATA_DIR 
        ? resolveProjectRelative(process.env.AILLAME_DATA_DIR)
        : resolveProjectRelative('.aillame-data');
    const jobsFile = path.join(dataDir, 'image-jobs.jsonl');
    
    if (fs.existsSync(jobsFile)) {
      try {
        const content = fs.readFileSync(jobsFile, 'utf8');
        const lines = content.split('\n').filter(l => l.trim());
        if (lines.length > 0) {
          attempted = true;
          // Find the latest successful real job to extract device info
          for (let i = 0; i < lines.length; i++) {
            try {
              const job = JSON.parse(lines[i]);
              const isSuccess = job.status === 'completed' && !job.isPlaceholder && !job.isMock;
              if (isSuccess) {
                succeeded = true;
                if (job.deviceDetails) {
                  lastDeviceDetails = job.deviceDetails;
                  lastDeviceReason = job.deviceReason;
                  break; // Found the latest one
                }
              }
            } catch {
              continue;
            }
          }
        }
      } catch (e) {
        warnings.push(`Error reading job history: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    const finalAcceptanceReady = configured && attempted && succeeded;

    if (!enabled) nextActions.push('Set AILLAME_IGM_RUNTIME_ENABLED=true after a local IGM worker is available.');
    if (!modelDir) nextActions.push('Set AILLAME_IGM_MODEL_DIR to a local diffusion model directory.');
    if (!activeModel) nextActions.push('Set AILLAME_IGM_ACTIVE_MODEL to the local model filename.');
    if (!workerAvailable) nextActions.push('Set AILLAME_IGM_WORKER_COMMAND to a local IGM worker binary or script.');
    if (!outputDirWritable) nextActions.push('Set AILLAME_IGM_OUTPUT_DIR to a writable local output directory.');
    
    if (configured && !succeeded) {
      nextActions.push('Run a real image generation job to pass final acceptance.');
    }

    const reason = finalAcceptanceReady
      ? 'REAL_IGM_GENERATION_SUCCEEDED'
      : (configured && !attempted) 
        ? 'Awaiting first real generation attempt.'
        : (configured && !succeeded)
          ? 'Generation attempts failed or only placeholders produced.'
          : missingConfig[0] ?? missingFiles[0] ?? missingWorker[0] ?? 'REAL_IGM_GENERATION_NOT_ATTEMPTED';


    return {
      enabled,
      modelDirConfigured: !!modelDir,
      activeModelConfigured: !!activeModel,
      modelDirExists,
      activeModelExists,
      outputDirWritable,
      workerAvailable,
      device,
      configured,
      attempted,
      succeeded,
      finalAcceptanceReady,
      missingConfig,
      missingFiles,
      missingWorker,
      warnings,
      nextActions,
      reason,
      deviceDetails: lastDeviceDetails,
      deviceReason: lastDeviceReason,
      performanceWarning: lastDeviceDetails?.toLowerCase().includes('fallback')
    };
  }
}
