import { RUNTIME_CONFIG } from "../../config/runtime.config";
import { safeImport } from "../../utils/esm-interop";

/**
 * Shared Llama instance to prevent CUDA initialization conflicts.
 */
let sharedLlama: any = null;
let cachedHardwareInfo: { gpu: string; canUseGpu: boolean } | null = null;

export async function getSharedLlama(): Promise<any> {
  if (!sharedLlama) {
    const useGpu = RUNTIME_CONFIG.useGpu;
    console.log(`[SharedLlama] Initializing with GPU: ${useGpu}`);
    
    try {
      const { getLlama } = await safeImport("node-llama-cpp");
      sharedLlama = await getLlama({
        gpu: useGpu ? "auto" : false
      } as any);
    } catch (error) {
      console.warn(`[SharedLlama] Failed to initialize with GPU: ${useGpu}. Falling back to CPU.`, error);
      const { getLlama } = await safeImport("node-llama-cpp");
      sharedLlama = await getLlama({
        gpu: false
      } as any);
    }
  }
  return sharedLlama!;
}

export async function getHardwareInfo(): Promise<{ gpu: string; canUseGpu: boolean }> {
  if (cachedHardwareInfo) return cachedHardwareInfo;
  
  try {
    const { getLlama } = await safeImport("node-llama-cpp");
    const llama = await getLlama({ gpu: "auto" });
    cachedHardwareInfo = {
      gpu: llama.gpu || "none",
      canUseGpu: !!llama.gpu
    };
    return cachedHardwareInfo;
  } catch (error) {
    console.error("[HardwareInfo] Detection failed:", error);
    return { gpu: "none", canUseGpu: false };
  }
}

export function clearSharedLlama() {
    sharedLlama = null;
}
