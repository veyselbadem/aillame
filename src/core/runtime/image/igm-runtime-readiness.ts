import fs from 'fs';

export interface IGMRuntimeDiagnostics {
  enabled: boolean;
  modelDirConfigured: boolean;
  activeModelConfigured: boolean;
  outputDirWritable: boolean;
  workerAvailable: boolean;
  device: 'auto' | 'cpu' | 'gpu';
  finalAcceptanceReady: boolean;
  missingConfig: string[];
}

export class IGMRuntimeReadiness {
  static getDiagnostics(): IGMRuntimeDiagnostics {
    const missingConfig: string[] = [];
    
    const enabled = process.env.AILLAME_IGM_RUNTIME_ENABLED === 'true';
    const modelDir = process.env.AILLAME_IGM_MODEL_DIR;
    const activeModel = process.env.AILLAME_IGM_ACTIVE_MODEL;
    const outputDir = process.env.AILLAME_IGM_OUTPUT_DIR || '.aillame-data/assets/images';
    const device = (process.env.AILLAME_IGM_DEVICE as any) || 'auto';

    if (!enabled) missingConfig.push('AILLAME_IGM_RUNTIME_ENABLED is false');
    if (!modelDir) missingConfig.push('AILLAME_IGM_MODEL_DIR is not set');
    if (!activeModel) missingConfig.push('AILLAME_IGM_ACTIVE_MODEL is not set');

    let outputDirWritable = false;
    try {
      if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
      fs.accessSync(outputDir, fs.constants.W_OK);
      outputDirWritable = true;
    } catch {
      missingConfig.push('AILLAME_IGM_OUTPUT_DIR is not writable');
    }

    const finalAcceptanceReady = enabled && !!modelDir && !!activeModel && outputDirWritable;

    return {
      enabled,
      modelDirConfigured: !!modelDir,
      activeModelConfigured: !!activeModel,
      outputDirWritable,
      workerAvailable: enabled, // Simplified for foundation
      device,
      finalAcceptanceReady,
      missingConfig
    };
  }
}
