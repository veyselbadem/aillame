import { getAillameEngine } from './rust-core';
import { AillameTokenizer } from './tokenizer';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testRustInference() {
    console.log('🔍 Aillame Rust Inference Testi Başlatılıyor...');

    const engine = getAillameEngine();
    if (!engine) {
        console.error('❌ Rust Core bulunamadı!');
        return;
    }

    const checkpointPath = path.join(__dirname, 'checkpoints', 'aillame_rust_tuned.safetensors');
    const dataPath = path.join(__dirname, 'data', 'input.txt');
    
    const tokenizer = new AillameTokenizer();
    if (fs.existsSync(dataPath)) {
        const text = fs.readFileSync(dataPath, 'utf8');
        tokenizer.train(text);
        engine.trainTokenizer(text);
    }

    const fixedVocabSize = 256;
    engine.initTrainer(fixedVocabSize, 256, 8, 0.0003); // Match PRO architecture

    if (fs.existsSync(checkpointPath)) {
        console.log('📂 Checkpoint yüklendi.');
        engine.loadCheckpoint(checkpointPath);
    } else {
        console.warn('⚠️ Checkpoint bulunamadı, model rastgele tahmin yapacak.');
    }

    const prompt = process.argv[2] || "Aillame nedir?";
    console.log(`\nSoru: ${prompt}`);
    
    // Fix: inputIds definition was missing in previous edit
    const inputIds = tokenizer.encode(prompt);
    // uint32 array, camelCase generate, and 0.8 temperature
    const outputIds = engine.generate(new Uint32Array(inputIds), 100, 0.8);
    
    const result = tokenizer.decode(outputIds);
    console.log(`\nCevap: ${result}\n`);
}

testRustInference().catch(console.error);
