import { 
  AillameRuntimeInput, 
  AillameRuntimeResult, 
  AillameRuntimeAdapter 
} from '../types/runtime.types';
import { ModelRegistryService } from './model-registry.service';
import { GgufRuntimeService } from './runtimes/gguf-runtime.service';
import { createRuntimeError } from '../utils/runtime-errors';

export class LocalRuntimeService {
  private static adapters: Record<string, AillameRuntimeAdapter> = {
    "aillame-gguf": new GgufRuntimeService()
  };

  /**
   * Gets an adapter by its runtime name.
   */
  static getRuntimeAdapter(runtime: string): AillameRuntimeAdapter | null {
    return this.adapters[runtime] || null;
  }

  /**
   * Generates a response using the appropriate local runtime adapter.
   */
  static async generateWithLocalRuntime(input: AillameRuntimeInput): Promise<AillameRuntimeResult> {
    const { modelId } = input;

    // 1. Get model details to find the runtime
    const model = ModelRegistryService.getModelById(modelId);
    if (!model) {
      return createRuntimeError("MODEL_NOT_FOUND", "Belirtilen model bulunamadı.", { modelId });
    }

    // 2. Get the appropriate adapter
    const adapter = this.getRuntimeAdapter(model.runtime);
    if (!adapter) {
      return createRuntimeError("UNSUPPORTED_RUNTIME", `Runtime desteği bulunamadı: ${model.runtime}`, { modelId, runtime: model.runtime });
    }

    // 3. Generate using the adapter
    return adapter.generate(input);
  }

  /**
   * Returns a list of available adapter names.
   */
  static getAvailableAdapters(): string[] {
    return Object.keys(this.adapters);
  }
}
