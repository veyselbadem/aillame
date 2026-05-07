import fs from 'fs';
import path from 'path';

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
}

export class IGMRuntimeReadiness {
  static getDiagnostics(): IGMRuntimeDiagnostics {
    const missingConfig: string[] = [];
    const missingFiles: string[] = [];
    const missingWorker: string[] = [];
    const warnings: string[] = [];
    const nextActions: string[] = [];
    
    const enabled = process.env.AILLAME_IGM_RUNTIME_ENABLED === 'true';
    const modelDir = process.env.AILLAME_IGM_MODEL_DIR;
    const activeModel = process.env.AILLAME_IGM_ACTIVE_MODEL;
    const outputDir = process.env.AILLAME_IGM_OUTPUT_DIR || '.aillame-data/assets/images';
    const device = (process.env.AILLAME_IGM_DEVICE as any) || 'auto';

    if (!enabled) missingConfig.push('AILLAME_IGM_RUNTIME_ENABLED is false');
    if (!modelDir) missingConfig.push('AILLAME_IGM_MODEL_DIR is not set');
    if (!activeModel) missingConfig.push('AILLAME_IGM_ACTIVE_MODEL is not set');

    const modelDirExists = Boolean(modelDir && fs.existsSync(modelDir));
    if (modelDir && !modelDirExists) {
      missingFiles.push('AILLAME_IGM_MODEL_DIR does not exist');
    }

    let activeModelExists = false;
    if (modelDir && activeModel && modelDirExists) {
      const activeModelPath = path.isAbsolute(activeModel)
        ? activeModel
        : path.join(modelDir, activeModel);
      activeModelExists = fs.existsSync(activeModelPath);
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
        const parentDir = path.dirname(outputDir);
        fs.accessSync(parentDir, fs.constants.W_OK);
        outputDirWritable = true;
        warnings.push('AILLAME_IGM_OUTPUT_DIR does not exist yet; parent directory is writable.');
      }
    } catch {
      missingConfig.push('AILLAME_IGM_OUTPUT_DIR is not writable');
    }

    const workerCommand = process.env.AILLAME_IGM_WORKER_COMMAND;
    const workerExists = Boolean(workerCommand && fs.existsSync(workerCommand));
    const workerAvailable = enabled && workerExists;

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
      && workerExists;

    const attempted = false;
    const succeeded = false;
    const finalAcceptanceReady = configured && attempted && succeeded;

    if (!enabled) nextActions.push('Set AILLAME_IGM_RUNTIME_ENABLED=true after a local IGM worker is available.');
    if (!modelDir) nextActions.push('Set AILLAME_IGM_MODEL_DIR to a local diffusion model directory.');
    if (!activeModel) nextActions.push('Set AILLAME_IGM_ACTIVE_MODEL to the local model filename.');
    if (!workerAvailable) nextActions.push('Configure an Aillame-controlled IGM worker; placeholders do not count for final acceptance.');
    if (!outputDirWritable) nextActions.push('Set AILLAME_IGM_OUTPUT_DIR to a writable local output directory.');

    const reason = finalAcceptanceReady
      ? 'REAL_IGM_GENERATION_SUCCEEDED'
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
      reason
    };
  }
}
