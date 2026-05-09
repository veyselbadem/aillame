import fs from 'fs';
import path from 'path';
import type { IGMWorker, IGMWorkerRequest, IGMWorkerResponse, IGMWorkerCapabilities } from './igm-worker-contract';
import { getProjectRoot, resolveProjectRelative } from '../../../project-root';

export class IGMWorkerProcessBridge implements IGMWorker {
  async generate(request: IGMWorkerRequest): Promise<IGMWorkerResponse> {
    const { spawn } = require('child_process');
    const projectRoot = getProjectRoot();
    const rawCommand = process.env.AILLAME_IGM_WORKER_COMMAND;
    const command = rawCommand ? resolveProjectRelative(rawCommand) : undefined;
    const argsString = process.env.AILLAME_IGM_WORKER_ARGS || '';
    
    if (!command) {
      return {
        success: false,
        jobId: request.modelId,
        status: 'not-configured',
        error: 'AILLAME_IGM_WORKER_COMMAND is not set.'
      };
    }

    const args = argsString.split(' ').filter(Boolean);
    const protocol = process.env.AILLAME_IGM_PROTOCOL || 'stream'; 
    const tempDir = path.join(projectRoot, '.aillame-data', 'temp');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const requestPath = path.join(tempDir, `igm_req_${Date.now()}_${Math.random().toString(36).slice(2, 5)}.json`);
    const responsePath = path.join(tempDir, `igm_res_${Date.now()}_${Math.random().toString(36).slice(2, 5)}.json`);
    
    return new Promise((resolve) => {
      let responseData: IGMWorkerResponse;
      let stdout = '';
      let stderr = '';

      const cleanup = () => {
        try {
          if (fs.existsSync(requestPath)) fs.unlinkSync(requestPath);
          if (fs.existsSync(responsePath)) fs.unlinkSync(responsePath);
        } catch {}
      };

      const handleResult = (code: number | null) => {
        cleanup();
        if (code !== 0) {
          return resolve({
            success: false,
            jobId: 'na',
            status: 'failed',
            error: `IGM process exited with code ${code}: ${stderr}`
          });
        }

        try {
          if (protocol === 'foundation') {
            if (!fs.existsSync(responsePath)) throw new Error('Worker produced no response file.');
            responseData = JSON.parse(fs.readFileSync(responsePath, 'utf8'));
          } else {
            const jsonMatch = stdout.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('Worker produced no valid JSON output.');
            responseData = JSON.parse(jsonMatch[0]);
          }

          // Handle base64 image data
          if (responseData.success && (responseData as any).image?.startsWith('data:image')) {
            const b64Data = (responseData as any).image.split(',')[1];
            const buffer = Buffer.from(b64Data, 'base64');
            const fileName = `generated_${Date.now()}_${Math.random().toString(36).slice(2, 5)}.png`;
            const outputPath = path.join(request.outputDir, fileName);
            
            if (!fs.existsSync(request.outputDir)) fs.mkdirSync(request.outputDir, { recursive: true });
            fs.writeFileSync(outputPath, buffer);
            
            responseData.imagePath = outputPath;
            responseData.mimeType = (responseData as any).mimeType || 'image/png';
          }

          resolve({
            ...responseData,
            status: responseData.success ? 'completed' : 'failed'
          });
        } catch (err: any) {
          resolve({
            success: false,
            jobId: 'na',
            status: 'failed',
            error: `IGM bridge processing error: ${err.message}. Output: ${stdout.slice(0, 500)}`
          });
        }
      };

      const timeoutMs = Number(process.env.AILLAME_IGM_TIMEOUT_MS) || 300000;
      let fullArgs = [...args];

      if (protocol === 'foundation') {
        fs.writeFileSync(requestPath, JSON.stringify(request, null, 2));
        fullArgs.push('--request', requestPath, '--output', responsePath);
      }

      const child = spawn(command, fullArgs, {
        cwd: projectRoot,
        windowsHide: true,
      });

      const timeout = setTimeout(() => {
        child.kill();
        cleanup();
        resolve({
          success: false,
          jobId: 'na',
          status: 'failed',
          error: `IGM process timed out after ${timeoutMs}ms`
        });
      }, timeoutMs);

      child.stdout.on('data', (data: any) => { stdout += data.toString(); });
      child.stderr.on('data', (data: any) => { stderr += data.toString(); });

      child.on('close', (code: number | null) => {
        clearTimeout(timeout);
        handleResult(code);
      });

      child.on('error', (err: any) => {
        clearTimeout(timeout);
        cleanup();
        resolve({
          success: false,
          jobId: 'na',
          status: 'failed',
          error: `IGM process spawn error: ${err.message}`
        });
      });

      if (protocol === 'stream') {
        child.stdin.write(JSON.stringify(request));
        child.stdin.end();
      }
    });
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
