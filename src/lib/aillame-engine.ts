import { getAillameEngine, RustEngine } from '@core/engine/rust-core';
import { AillameTokenizer } from '@core/engine/tokenizer';
import * as path from 'path';
import * as fs from 'fs';
import { modelLoader } from '@core/engine/model-loader';
import { NANO_V1_CONFIG } from '@core/engine/train-rust';

// Global singletons
let globalEngineV1: RustEngine | null = null;
let globalEngineV2: RustEngine | null = null;
let globalTokenizer: AillameTokenizer | null = null;

let initializationPromise: Promise<{ engine: RustEngine, tokenizer: AillameTokenizer } | null> | null = null;

export async function getSharedCore(version: 'v1' | 'v2' = 'v1') {
    if (!initializationPromise) {
        initializationPromise = (async () => {
            const engineV1 = getAillameEngine();
            if (!engineV1) return null;

            const tokenizer = new AillameTokenizer();
            const rootPath = process.cwd();
            const dataPath = path.join(rootPath, 'src', 'core', 'engine', 'data', 'input.txt');
            const vocabPath = path.join(rootPath, 'src', 'core', 'engine', 'data', 'vocab.json');

            let text = '';
            if (fs.existsSync(dataPath)) {
                text = fs.readFileSync(dataPath, 'utf8');
            }

            if (!tokenizer.load(vocabPath)) {
                if (text) {
                    tokenizer.train(text);
                    tokenizer.save(vocabPath);
                }
            }
            
            if (text) {
                engineV1.trainTokenizer(text);
            }
            
            // V1 Engine Hazırla
            engineV1.initTrainer(NANO_V1_CONFIG.vocabSize, NANO_V1_CONFIG.nEmbd, NANO_V1_CONFIG.nLayer, 0.0003);
            const v1Path = path.join(rootPath, NANO_V1_CONFIG.checkpointPath);
            if (fs.existsSync(v1Path)) {
                engineV1.loadCheckpoint(v1Path);
            }

            globalEngineV1 = engineV1;
            globalTokenizer = tokenizer;

            // [NANO-F5] modelLoader entegrasyonu (V1 her zaman hazır)
            modelLoader.setEngine(globalEngineV1);
            // V1 yüklü olarak işaretle (içeride setEngine yapıldığı için v1 için engineV1 kullanılacak)
            
            return { engine: globalEngineV1, tokenizer: globalTokenizer };
        })();
    }

    const core = await initializationPromise;
    if (!core) return null;

    if (version === 'v2') {
        if (!globalEngineV2) {
            // V2 için AYRI bir engine instance'ı oluştur (VarMap çakışmasını önlemek için)
            const engineV2 = getAillameEngine();
            if (engineV2) {
                globalEngineV2 = engineV2;
                // V2 tokenizer eğitimi (karakter bazlı fallback için gerekebilir)
                const dataPath = path.join(process.cwd(), 'src', 'core', 'engine', 'data', 'input.txt');
                if (fs.existsSync(dataPath)) {
                    const text = fs.readFileSync(dataPath, 'utf8');
                    globalEngineV2.trainTokenizer(text);
                }
            }
        }
        return { engine: globalEngineV2!, tokenizer: core.tokenizer };
    }

    return { engine: globalEngineV1!, tokenizer: core.tokenizer };
}

/**
 * Belirli bir checkpoint ile core motorunu alır (Test amaçlı)
 */
export async function getCoreWithCheckpoint(checkpointName: string) {
    return getSharedCore('v1'); // Legacy support
}
