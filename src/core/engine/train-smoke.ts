import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getAillameEngine } from './rust-core';
import { AillameTokenizer } from './tokenizer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startSmokeTraining() {
    console.log('🚀 Aillame Smoke Training v1.3.1 Başlatılıyor...');

    const dataPath = path.join(__dirname, 'data', 'input_smoke.txt');
    const checkpointPath = path.join(__dirname, 'checkpoints', 'aillame_rust_tuned_v1_3_1_smoke.safetensors');
    const baseCheckpointPath = path.join(__dirname, 'checkpoints', 'aillame_rust_tuned.safetensors');
    
    if (!fs.existsSync(dataPath)) {
        console.error('❌ Eğitim verisi (input_smoke.txt) bulunamadı!');
        return;
    }

    const text = fs.readFileSync(dataPath, 'utf8');
    const tokenizer = new AillameTokenizer();
    tokenizer.train(text);
    const vocabSize = tokenizer.vocabSize;

    const engine = getAillameEngine();
    if (!engine) {
        console.error('❌ Rust Core yüklenemedi.');
        return;
    }

    const fixedVocabSize = 256; 
    engine.trainTokenizer(text);
    engine.initTrainer(fixedVocabSize, 256, 8, 0.0001); // Lower learning rate for fine-tuning

    if (fs.existsSync(baseCheckpointPath)) {
        console.log('📂 Ana checkpoint temel olarak yükleniyor...');
        engine.loadCheckpoint(baseCheckpointPath);
    }

    const epochs = 1000; // Small number for smoke test
    const batchSize = 16;
    const seqLen = 32;

    let tokens = tokenizer.encode(text);
    console.log(`--- Smoke Training: Epochs: ${epochs}, Tokens: ${tokens.length} ---`);

    for (let i = 1; i <= epochs; i++) {
        const inputs = [];
        const targets = [];

        for (let b = 0; b < batchSize; b++) {
            const start = Math.floor(Math.random() * (tokens.length - seqLen - 1));
            const chunk = tokens.slice(start, start + seqLen);
            const targetChunk = tokens.slice(start + 1, start + seqLen + 1);
            inputs.push(...chunk);
            targets.push(...targetChunk);
        }

        try {
            const loss = await engine.trainBatch(new Uint32Array(inputs), new Uint32Array(targets), batchSize, seqLen);

            if (i % 100 === 0) {
                console.log(`Step ${i}/${epochs} - Loss: ${loss.toFixed(4)}`);
            }
        } catch (err) {
            console.error(`Eğitim hatası step ${i}:`, err);
            break;
        }
    }

    console.log('💾 Yeni checkpoint kaydediliyor...');
    engine.saveCheckpoint(checkpointPath);
    console.log('✅ Smoke Training Tamamlandı!');
}

startSmokeTraining().catch(console.error);
