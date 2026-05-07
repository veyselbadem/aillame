/**
 * Aillame Rust Core Bridge
 * Bu dosya Rust tarafından derlenen native modülü TypeScript dünyasına bağlar.
 */
import * as path from 'path';
import * as fs from 'fs';

// Native modülü yükle
let engine: any;
try {
    const rootPath = process.cwd();
    const nodePath = path.join(rootPath, 'aillame-core-v7.node');
    
    // eval('require') Next.js/Turbopack bundler'larını tamamen atlatır
    // ve doğrudan çalışma zamanındaki Node.js require mekanizmasını kullanır.
    engine = eval('require')(nodePath);
    // [NANO-F7] Yeni modül yüklendi
    if (engine && !engine.initNanoV3) {
        console.warn('[NANO-F7] Uyarı: aillame-core-v7.node yüklendi ama initNanoV3 eksik!');
    }
} catch (e) {
    console.warn('⚠️ Aillame Rust Core yüklenemedi. Lütfen derleme yapın.');
    console.error(e);
    engine = null;
}

export const nativeModule = engine;

export interface RustEngine {
    initTrainer(vocabSize: number, nEmbd: number, nLayer: number, lr: number): void;
    trainBatch(inputData: Uint32Array | number[], targetData: Uint32Array | number[], batch_size: number, seq_len: number): Promise<number>;
    saveCheckpoint(path: string): void;
    loadCheckpoint(path: string): void;
    getVocabSize(): number;
    trainTokenizer(text: string): void;
    
    // [NANO-F4B] V2/V3 model fonksiyonları
    initNanoV2?(): void;
    initNanoV3?(): void; // [NANO-F7]
    getActiveConfig?(version: string): string;
    
    addToMemory(content: string, vectorData: Float32Array | number[]): void;
    searchMemory(queryVectorData: Float32Array | number[], topK: number): string[];
    getEmbeddings(inputIds: Uint32Array | number[]): Float32Array;
    
    // [NANO-F7] Gelişmiş üretim fonksiyonu
    generate(
        inputIds: Uint32Array | number[], 
        maxLen: number, 
        temperature?: number,
        topK?: number,
        stopToken?: number
    ): number[];
    
    // [NANO-F4A] BPE tokenizer köprüsü (instance-based)
    bpeEncode(text: string): number[];
    bpeDecode(tokens: number[]): string;
    bpeVocabSize?(): number;
}

export interface ProEngine {
    loadModel(repoId: string, filename: string): Promise<boolean>;
    generateText(prompt: string, maxTokens: number, temperature: number): Promise<string>;
}

export type AillameNativeModuleStatus = {
  nativeModuleLoaded: boolean;
  nativeModulePath: string;
  loadError?: string;
};

export type AillameCheckpointStatus = {
  checkpointConfigured: boolean;
  checkpointPath: string;
  checkpointPathExists: boolean;
};

export type AillameNanoEngineInitResult = {
  success: boolean;
  reason?: string;
  checkpoint: AillameCheckpointStatus;
};

export type AillameTextRuntimeProbeResult = {
  success: boolean;
  reason?: string;
  generatedTokenCount: number;
  decodedLength: number;
  checkpoint: AillameCheckpointStatus;
};

export const getAillameEngine = (): RustEngine | null => {
    if (!engine || !engine.AillameEngine) return null;
    return new engine.AillameEngine();
};

let proEngineInstance: ProEngine | null = null;
export const getProEngine = (): ProEngine | null => {
    if (!engine || !engine.AillameProEngine) return null;
    if (!proEngineInstance) {
        proEngineInstance = new engine.AillameProEngine();
    }
    return proEngineInstance;
};

export function getNativeModuleStatus(): AillameNativeModuleStatus {
  const rootPath = process.cwd();
  const nodePath = path.join(rootPath, 'aillame-core-v7.node');
  return {
    nativeModuleLoaded: Boolean(engine),
    nativeModulePath: nodePath,
    loadError: undefined, // nativeLoadError logic could be added if needed
  };
}

export function getNanoCheckpointStatus(): AillameCheckpointStatus {
  const rootPath = process.cwd();
  const checkpointPath = process.env.AILLAME_NANO_CHECKPOINT_PATH
    ?? path.join(rootPath, "src", "core", "engine", "checkpoints", "aillame_nano_intelligence_v1.safetensors");

  return {
    checkpointConfigured: true,
    checkpointPath,
    checkpointPathExists: fs.existsSync(checkpointPath),
  };
}

export function initializeAillameNanoEngine(targetEngine: RustEngine): AillameNanoEngineInitResult {
  const checkpoint = getNanoCheckpointStatus();

  try {
    // [NANO-F7] v3 init preferred if available
    if (targetEngine.initNanoV3) {
      targetEngine.initNanoV3();
    } else {
      targetEngine.initTrainer(256, 256, 8, 0.00008);
    }

    if (!checkpoint.checkpointPathExists) {
      return {
        success: false,
        reason: "CHECKPOINT_NOT_FOUND",
        checkpoint,
      };
    }

    targetEngine.loadCheckpoint(checkpoint.checkpointPath);
    return {
      success: true,
      checkpoint,
    };
  } catch (error) {
    return {
      success: false,
      reason: error instanceof Error ? error.message : "NANO_ENGINE_INIT_FAILED",
      checkpoint,
    };
  }
}

export function probeAillameTextRuntime(): AillameTextRuntimeProbeResult {
  const checkpoint = getNanoCheckpointStatus();
  const targetEngine = getAillameEngine();

  if (!targetEngine) {
    return {
      success: false,
      reason: "NATIVE_ENGINE_NOT_AVAILABLE",
      generatedTokenCount: 0,
      decodedLength: 0,
      checkpoint,
    };
  }

  const init = initializeAillameNanoEngine(targetEngine);
  if (!init.success) {
    return {
      success: false,
      reason: init.reason ?? "NANO_ENGINE_INIT_FAILED",
      generatedTokenCount: 0,
      decodedLength: 0,
      checkpoint: init.checkpoint,
    };
  }

  try {
    const probeInput = new Uint32Array([83, 101, 108, 97, 109]); // "Selam"
    const output = targetEngine.generate(probeInput, 8, 0.2);
    const generatedTokenCount = output.length;
    const decodedLength = output.filter((token) => Number.isFinite(token) && token > 0).length;

    return {
      success: generatedTokenCount > 0 && decodedLength > 0,
      reason: generatedTokenCount > 0 && decodedLength > 0 ? undefined : "EMPTY_ENGINE_OUTPUT",
      generatedTokenCount,
      decodedLength,
      checkpoint,
    };
  } catch (error) {
    return {
      success: false,
      reason: error instanceof Error ? error.message : "TEXT_RUNTIME_PROBE_FAILED",
      generatedTokenCount: 0,
      decodedLength: 0,
      checkpoint,
    };
  }
}

// [NANO-F4A] BPE tokenizer köprüsü — mevcut char tokenizer'a dokunmaz
export const bpe_encode = engine?.bpeEncode;
export const bpe_decode = engine?.bpeDecode;
export const bpe_vocab_size = engine?.bpeVocabSize;

// Güvenli wrapper — BPE yoksa char-level'a fallback
export function safeBpeEncode(
  text: string
): number[] {
  if (bpe_encode) {
    return bpe_encode(text, 8192);
  }
  // Fallback: mevcut char tokenizer (basit char code)
  console.warn('[NANO-F4A] BPE mevcut değil, char fallback kullanılıyor');
  return Array.from(text).map(c => c.charCodeAt(0) % 256);
}

