import { spawnSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import type { IGMWorker, IGMWorkerRequest, IGMWorkerResponse, IGMWorkerCapabilities } from './igm-worker-contract';

export class IGMWorkerProcessBridge implements IGMWorker {
  async generate(request: IGMWorkerRequest): Promise<IGMWorkerResponse> {
    const command = process.env.AILLAME_IGM_WORKER_COMMAND;
    const argsString = process.env.AILLAME_IGM_WORKER_ARGS || '';
    
    if (!command) {
      return {
        success: false,
        jobId: request.modelId, // Fallback
        status: 'not-configured',
        error: 'AILLAME_IGM_WORKER_COMMAND is not set.'
      };
    }

    // Prepare arguments
    const args = argsString.split(' ').filter(Boolean);
    
    // In a real implementation, we would pass the request as JSON or arguments
    // For this bridge foundation, we assume the worker accepts a JSON payload via stdin or a temp file.
    // To keep it simple and safe for now, we'll use a temporary JSON file.
    const tempDir = path.join(process.cwd(), '.aillame-data', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const requestPath = path.join(tempDir, `igm_req_${Date.now()}.json`);
    const responsePath = path.join(tempDir, `igm_res_${Date.now()}.json`);
    
    try {
      fs.writeFileSync(requestPath, JSON.stringify(request, null, 2));
      
      const fullArgs = [...args, '--request', requestPath, '--output', responsePath];
      
      const result = spawnSync(command, fullArgs, {
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: Number(process.env.AILLAME_IGM_TIMEOUT_MS) || 300000, // 5 min default
        windowsHide: true,
      });

      if (result.status !== 0) {
        return {
          success: false,
          jobId: 'na',
          status: 'failed',
          error: `IGM worker exited with code ${result.status}: ${result.stderr}`
        };
      }

      if (!fs.existsSync(responsePath)) {
        return {
          success: false,
          jobId: 'na',
          status: 'failed',
          error: 'IGM worker did not produce a response file.'
        };
      }

      const responseData = JSON.parse(fs.readFileSync(responsePath, 'utf8')) as IGMWorkerResponse;
      return {
        ...responseData,
        status: responseData.success ? 'completed' : 'failed'
      };

    } catch (err: any) {
      return {
        success: false,
        jobId: 'na',
        status: 'failed',
        error: `IGM process bridge error: ${err.message}`
      };
    } finally {
      try {
        if (fs.existsSync(requestPath)) fs.unlinkSync(requestPath);
        if (fs.existsSync(responsePath)) fs.unlinkSync(responsePath);
      } catch {}
    }
  }

  async getCapabilities(): Promise<IGMWorkerCapabilities> {
    // This could also be probed from the worker binary
    return {
      supportedModels: [],
      maxResolution: { width: 2048, height: 2048 },
      supportsNegativePrompt: true,
      supportsSeed: true
    };
  }
}
