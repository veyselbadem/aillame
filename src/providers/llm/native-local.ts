import { LLMProvider, LLMGenerateOptions } from './base';
import { tauriModelBridge } from '@core/platform/tauri-model-bridge';
import { listen } from '@tauri-apps/api/event';

export class NativeLocalProvider implements LLMProvider {
  private _isLoading = false;

  async loadModel(): Promise<void> {
    // Check if runtime is ready
    const session = await tauriModelBridge.getSafeRuntimeSession();
    if (!session || (session.processState !== 'runtime_ready' && session.processState !== 'loaded')) {
      await tauriModelBridge.startRuntime({
        devicePreference: "auto",
        startTimeoutMs: 30000,
        handshakeTimeoutMs: 30000,
        shutdownTimeoutMs: 10000
      });
    }
  }

  isLoading(): boolean {
    return this._isLoading;
  }

  isReady(): boolean {
    // Provider level ready means it can accept generate calls.
    // We check this in generate, but for selector/router we can't do async check easily.
    // So we assume true and fail fast if not actually ready.
    return true; 
  }

  async getStatus() {
    const session = await tauriModelBridge.getSafeRuntimeSession();
    if (!session) return { runtimeState: 'stopped', isModelLoaded: false };
    
    return {
      runtimeState: session.processState,
      loadStatus: session.processState === 'loaded' ? 'loaded' : 'idle',
      activeModelId: session.activeModelId,
      isModelLoaded: session.processState === 'loaded',
      isGenerating: session.isInferring,
      errorCode: session.lastErrorCode,
      warnings: session.lastErrorCode ? [session.lastErrorCode] : []
    };
  }

  async generate(
    prompt: string,
    onToken?: (token: string) => void,
    signal?: AbortSignal,
    options?: LLMGenerateOptions
  ): Promise<string> {
    const session = await tauriModelBridge.getSafeRuntimeSession();
    
    if (!session || session.processState !== 'loaded' || !session.activeModelId) {
      throw new Error('MODEL_INFERENCE_MODEL_NOT_LOADED');
    }

    if (session.isInferring) {
      throw new Error('MODEL_INFERENCE_BUSY');
    }

    if (!onToken) {
      const resp = await tauriModelBridge.safeModelInfer(prompt, session.activeModelId);
      if (resp.errorCode) throw new Error(resp.errorCode);
      return resp.text;
    }

    // Streaming implementation
    return new Promise<string>(async (resolve, reject) => {
      let fullText = '';
      let unlisten: (() => void) | null = null;

      const cleanup = () => {
        if (unlisten) unlisten();
      };

      if (signal) {
        signal.addEventListener('abort', () => {
          tauriModelBridge.cancelModelInferenceStream().catch(console.error);
          cleanup();
          reject(new Error('AbortError'));
        });
      }

      const setupListener = async () => {
        const unsubscribe = await listen('inference_event', (event: any) => {
          const payload = event.payload;
          
          if (payload.event === 'token' && payload.delta) {
            fullText += payload.delta;
            onToken(payload.delta);
          } else if (payload.event === 'completed' || payload.event === 'stream_completed') {
            cleanup();
            resolve(fullText);
          } else if (payload.event === 'failed' || payload.event === 'stream_failed') {
            cleanup();
            reject(new Error(payload.error_code || 'STREAM_FAILED'));
          } else if (payload.event === 'stream_cancelled') {
            cleanup();
            reject(new Error('STREAM_CANCELLED'));
          }
        });
        unlisten = unsubscribe;
      };

      try {
        await setupListener();
        const startResp = await tauriModelBridge.safeModelInferStream(prompt, session.activeModelId!);
        if (startResp.errorCode) {
          cleanup();
          reject(new Error(startResp.errorCode));
        }
      } catch (err) {
        cleanup();
        reject(err);
      }
    });
  }
}

export const nativeLocalProvider = new NativeLocalProvider();
