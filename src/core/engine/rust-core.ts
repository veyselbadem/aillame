/**
 * Aillame Rust Core Bridge
 * Bu dosya Rust tarafından derlenen native modülü TypeScript dünyasına bağlar.
 */
import * as path from 'path';

// Native modülü yükle
let engine: any;
try {
    const rootPath = process.cwd();
    const nodePath = path.join(rootPath, 'aillame-core.win32-x64-msvc.node');
    
    // eval('require') Next.js/Turbopack bundler'larını tamamen atlatır
    // ve doğrudan çalışma zamanındaki Node.js require mekanizmasını kullanır.
    engine = eval('require')(nodePath);
} catch (e) {
    console.warn('⚠️ Aillame Rust Core yüklenemedi. Lütfen derleme yapın.');
    console.error(e);
    engine = null;
}

export interface RustEngine {
    initTrainer(vocabSize: number, nEmbd: number, nLayer: number, lr: number): void;
    trainBatch(inputData: Uint32Array | number[], targetData: Uint32Array | number[], batch_size: number, seq_len: number): Promise<number>;
    saveCheckpoint(path: string): void;
    loadCheckpoint(path: string): void;
    getVocabSize(): number;
    trainTokenizer(text: string): void;
    
    addToMemory(content: string, vectorData: Float32Array | number[]): void;
    searchMemory(queryVectorData: Float32Array | number[], topK: number): string[];
    getEmbeddings(inputIds: Uint32Array | number[]): Float32Array;
    generate(inputIds: Uint32Array | number[], maxLen: number, temperature?: number): number[];
}

export interface ProEngine {
    loadModel(repoId: string, filename: string): Promise<boolean>;
    generateText(prompt: string, maxTokens: number, temperature: number): Promise<string>;
}

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
