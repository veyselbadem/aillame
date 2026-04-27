import { getAillameEngine, RustEngine } from '@core/engine/rust-core';
import { AillameTokenizer } from '@core/engine/tokenizer';
import * as path from 'path';
import * as fs from 'fs';

// Global singletons
let globalEngine: RustEngine | null = null;
let globalTokenizer: AillameTokenizer | null = null;
let currentCheckpoint: string | null = null;

let initializationPromise: Promise<{ engine: RustEngine, tokenizer: AillameTokenizer } | null> | null = null;

export async function getSharedCore(checkpointName: string = 'aillame_rust_tuned.safetensors') {
    if (globalEngine && globalTokenizer && currentCheckpoint === checkpointName) {
        return { engine: globalEngine, tokenizer: globalTokenizer };
    }

    if (!initializationPromise) {
        initializationPromise = (async () => {
            const engine = getAillameEngine();
            if (!engine) return null;

            const tokenizer = new AillameTokenizer();
            const rootPath = process.cwd();
            const dataPath = path.join(rootPath, 'src', 'core', 'engine', 'data', 'input.txt');
            const vocabPath = path.join(rootPath, 'src', 'core', 'engine', 'data', 'vocab.json');
            const checkpointPath = path.join(rootPath, 'src', 'core', 'engine', 'checkpoints', checkpointName);

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
            
            // Rust core still needs the raw text to match the same vocab generation logic 
            // since it has its own internal tokenizer.
            if (text) {
                engine.trainTokenizer(text);
            }
            
            const vocabSize = 256;
            engine.initTrainer(vocabSize, 256, 8, 0.0003); // Optimized Pro Specs

            if (fs.existsSync(checkpointPath)) {
                engine.loadCheckpoint(checkpointPath);
            }

            globalEngine = engine;
            globalTokenizer = tokenizer;
            currentCheckpoint = checkpointName;

            return { engine: globalEngine, tokenizer: globalTokenizer };
        })();
    } else if (currentCheckpoint !== checkpointName) {
        // If already initialized but with a different checkpoint, reload it
        const rootPath = process.cwd();
        const checkpointPath = path.join(rootPath, 'src', 'core', 'engine', 'checkpoints', checkpointName);
        if (fs.existsSync(checkpointPath) && globalEngine) {
            globalEngine.loadCheckpoint(checkpointPath);
            currentCheckpoint = checkpointName;
        }
    }

    return initializationPromise;
}

/**
 * Belirli bir checkpoint ile core motorunu alır (Test amaçlı)
 */
export async function getCoreWithCheckpoint(checkpointName: string) {
    return getSharedCore(checkpointName);
}
