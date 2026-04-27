
import { LLMProvider, LLMGenerateOptions } from './base';
import { generateProMultimodalResponse } from '@/core/inference/pro-multimodal';

/**
 * Aillame PRO Server Provider.
 * Calls the inference service directly without internal HTTP fetch.
 * Use this only in server-side contexts (API routes).
 */
export class ProServerProvider implements LLMProvider {
  private ready = true;

  async loadModel() {
    // Direct provider assumes the system is ready or will handle initialization in the service
    this.ready = true;
  }

  isLoading(): boolean {
    return false;
  }

  isReady(): boolean {
    return this.ready;
  }

  async generate(
    prompt: string,
    onToken?: (token: string) => void,
    signal?: AbortSignal,
    options?: LLMGenerateOptions
  ): Promise<string> {
    try {
      const result = await generateProMultimodalResponse({
        prompt,
        images: options?.images ?? [],
        maxTokens: 512,
        temperature: 0.7,
      });

      if (onToken) {
        // Simple mock streaming for consistency
        for (const char of result) {
          onToken(char);
          // No delay needed for server-side direct calls, but if we want to simulate:
          // await new Promise(r => setTimeout(r, 1));
        }
      }

      return result;
    } catch (error) {
      console.error('[PRO Server] Chat Error:', error);
      throw error;
    }
  }
}
