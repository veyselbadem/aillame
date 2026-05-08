import { generateWithBestTextRuntime } from '../runtime/text/text-runtime-router';
import { generateImageWithSdxl } from '../image-generation/sdxl';
import { RuntimeAcceptanceService } from '../runtime/acceptance/acceptance-service';
import { normalizeProjectId } from './project-context';
import type { 
  ProviderApiRequest, 
  ProviderApiResponse, 
  ProviderApiErrorResponse,
  ProviderApiTextRequest,
  ProviderApiImageRequest 
} from './types';

export class ProviderApiService {
  static async handleRequest(request: ProviderApiRequest): Promise<ProviderApiResponse | ProviderApiErrorResponse> {
    const projectId = normalizeProjectId(request.projectId);
    const report = RuntimeAcceptanceService.getReport();
    
    if (!report.overall.finalAcceptanceReady) {
      return {
        success: false,
        error: {
          code: 'RUNTIME_NOT_READY',
          message: 'Aillame local runtime is not fully ready yet.',
          details: report.overall.blockers.join(', ')
        }
      };
    }

    if (request.mode === 'text') {
      return this.handleTextRequest(projectId, request);
    } else if (request.mode === 'image') {
      return this.handleImageRequest(projectId, request);
    }

    return {
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Unsupported mode requested.'
      }
    };
  }

  private static async handleTextRequest(projectId: string, request: ProviderApiTextRequest): Promise<ProviderApiResponse | ProviderApiErrorResponse> {
    try {
      const prompt = request.prompt || (request.messages?.map(m => `${m.role}: ${m.content}`).join('\n')) || '';
      
      const runtimeResult = await generateWithBestTextRuntime({
        projectId,
        mode: 'general',
        taskType: request.taskType || 'general',
        prompt,
        messages: request.messages?.map(m => ({ role: m.role as any, content: m.content })),
        maxTokens: request.options?.maxTokens,
        temperature: request.options?.temperature,
        stream: false,
        metadata: {
          source: 'provider-api'
        }
      });

      const generation = runtimeResult.generation;
      
      // We don't count placeholder/degraded as success for provider mode
      if (generation.placeholderUsed || generation.degraded || !generation.success) {
        return {
          success: false,
          error: {
            code: 'GENERATION_FAILED',
            message: generation.error?.message || 'Local LLM generation failed or degraded.',
            details: generation.diagnostics?.reasonCode
          }
        };
      }

      return {
        success: true,
        provider: 'aillame-local',
        projectId,
        mode: 'text',
        runtime: {
          type: 'llm',
          local: true,
          modelId: generation.modelId,
          device: 'local-cpu-or-gpu',
          degraded: false,
          placeholderUsed: false
        },
        output: {
          text: generation.content
        },
        diagnostics: {
          finalAcceptanceReady: true,
          reason: 'REAL_LLM_GENERATION_SUCCEEDED'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: error.message || 'Internal error during text generation.'
        }
      };
    }
  }

  private static async handleImageRequest(projectId: string, request: ProviderApiImageRequest): Promise<ProviderApiResponse | ProviderApiErrorResponse> {
    try {
      const result = await generateImageWithSdxl({
        prompt: request.prompt,
        width: request.options?.width,
        height: request.options?.height,
        steps: request.options?.steps,
        seed: request.options?.seed,
        preset: 'square'
      });

      return {
        success: true,
        provider: 'aillame-local',
        projectId,
        mode: 'image',
        runtime: {
          type: 'igm',
          local: true,
          modelId: result.modelId,
          device: result.deviceDetails || result.device || 'unknown',
          degraded: false,
          placeholderUsed: false
        },
        output: {
          imageUrl: `data:${result.mimeType};base64,${result.image}`,
          assetId: `asset_${Date.now()}`,
          path: result.imagePath
        },
        diagnostics: {
          finalAcceptanceReady: true,
          reason: 'REAL_IGM_GENERATION_SUCCEEDED'
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: 'GENERATION_FAILED',
          message: error.message || 'Internal error during image generation.'
        }
      };
    }
  }
}
