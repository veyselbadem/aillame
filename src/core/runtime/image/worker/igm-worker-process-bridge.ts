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
    
    // Support two modes: 
    // 1. Foundation Mode: --request/--output flags
    // 2. Stream Mode: JSON via stdin, JSON result via stdout (used by sdxl_generate.py)
    const protocol = process.env.AILLAME_IGM_PROTOCOL || 'stream'; 
    
    const tempDir = path.join(process.cwd(), '.aillame-data', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const requestPath = path.join(tempDir, `igm_req_${Date.now()}.json`);
    const responsePath = path.join(tempDir, `igm_res_${Date.now()}.json`);
    
    try {
      let responseData: IGMWorkerResponse;

      if (protocol === 'foundation') {
        fs.writeFileSync(requestPath, JSON.stringify(request, null, 2));
        const fullArgs = [...args, '--request', requestPath, '--output', responsePath];
        const result = spawnSync(command, fullArgs, {
          cwd: process.cwd(),
          encoding: 'utf8',
          timeout: Number(process.env.AILLAME_IGM_TIMEOUT_MS) || 300000,
          windowsHide: true,
        });

        if (result.status !== 0) throw new Error(`Worker exit ${result.status}: ${result.stderr}`);
        if (!fs.existsSync(responsePath)) throw new Error('Worker produced no response file.');
        responseData = JSON.parse(fs.readFileSync(responsePath, 'utf8'));
      } else {
        // Stream mode (sdxl_generate.py style)
        const result = spawnSync(command, args, {
          input: JSON.stringify(request),
          cwd: process.cwd(),
          encoding: 'utf8',
          timeout: Number(process.env.AILLAME_IGM_TIMEOUT_MS) || 300000,
          windowsHide: true,
        });

        if (result.status !== 0) throw new Error(`Worker exit ${result.status}: ${result.stderr}`);
        
        // Find JSON in stdout (it might have some logging before/after)
        const jsonMatch = result.stdout.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Worker produced no valid JSON output.');
        responseData = JSON.parse(jsonMatch[0]);
      }

      // Handle base64 image data in response
      if (responseData.success && (responseData as any).image?.startsWith('data:image')) {
        const b64Data = (responseData as any).image.split(',')[1];
        const buffer = Buffer.from(b64Data, 'base64');
        const fileName = `generated_${Date.now()}.png`;
        const outputPath = path.join(request.outputDir, fileName);
        
        if (!fs.existsSync(request.outputDir)) fs.mkdirSync(request.outputDir, { recursive: true });
        fs.writeFileSync(outputPath, buffer);
        
        responseData.imagePath = outputPath;
        responseData.mimeType = (responseData as any).mimeType || 'image/png';
      }

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
