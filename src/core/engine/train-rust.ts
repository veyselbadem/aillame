import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getAillameEngine } from './rust-core';
import { AillameTokenizer } from './tokenizer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Aillame Turbo Maraton v2 (RUST POWERED - Optimized)
 */
async function startRustTraining() {
    console.log('🚀 Aillame Turbo Maraton v2 Başlatılıyor (Rust Core)...');

    const dataPath = path.join(__dirname, 'data', 'input.txt');
    const checkpointPath = path.join(__dirname, 'checkpoints', 'aillame_rust_tuned.safetensors');
    
    if (!fs.existsSync(dataPath)) {
        console.error('❌ Eğitim verisi (input.txt) bulunamadı!');
        return;
    }

    // 1. Veri ve Tokenizer Hazırlığı
    const text = fs.readFileSync(dataPath, 'utf8');
    const tokenizer = new AillameTokenizer();
    tokenizer.train(text);
    // const tokens = tokenizer.encode(text); // Redundant now
    const vocabSize = tokenizer.vocabSize;

    // 2. Rust Motorunu Başlat
    const engine = getAillameEngine();
    if (!engine) {
        console.error('❌ Rust Core yüklenemedi. Önce derlemeniz gerekiyor.');
        return;
    }

    const fixedVocabSize = 256; 
    engine.trainTokenizer(text);
    engine.initTrainer(fixedVocabSize, 256, 8, 0.0003); // PRO ARCHITECTURE: 256 embd, 8 layers

    // Varsa eski checkpoint'i yükle
    if (fs.existsSync(checkpointPath)) {
        console.log('📂 Mevcut checkpoint yükleniyor...');
        engine.loadCheckpoint(checkpointPath);
    }

    // 3. Eğitim Döngüsü
    const epochs = 1000000; // Artık çok daha uzun bir hedef koyabiliriz
    const batchSize = 32;
    const seqLen = 64;

    let tokens = tokenizer.encode(text);
    let lastFileSize = fs.statSync(dataPath).size;

    console.log(`--- Eğitim Başlıyor (DINAMIK): Vocab: ${vocabSize}, Batch: ${batchSize}, Seq: ${seqLen} ---`);

    for (let i = 1; i <= epochs; i++) {
        // Her 500 epoch'ta bir dosyayı kontrol et (Hoca yeni bir şey yazdı mı?)
        if (i % 500 === 0) {
            try {
                const currentSize = fs.statSync(dataPath).size;
                if (currentSize !== lastFileSize) {
                    console.log('🔄 Hoca yeni bir şeyler ekledi! Veri seti güncelleniyor...');
                    const updatedText = fs.readFileSync(dataPath, 'utf8');
                    tokens = tokenizer.encode(updatedText);
                    lastFileSize = currentSize;
                }
            } catch (e) {
                // Dosya o an yazım aşamasındaysa geç
            }
        }

        const inputs: number[] = [];
        const targets: number[] = [];

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
                const logMsg = `Zaman Dilimi ${i}/1000000 - Kayıp: ${loss.toFixed(4)}`;
                console.log(logMsg);
                try {
                    fs.appendFileSync(path.join(process.cwd(), 'training_log.txt'), logMsg + '\n');
                } catch (e) {
                    // Log yazma hatası eğitimi durdurmasın
                }
            }

            if (i % 200 === 0) {
                engine.saveCheckpoint(checkpointPath);
            }
        } catch (err) {
            console.error(`Eğitim hatası epoch ${i}:`, err);
            break;
        }
    }

    console.log('✅ Eğitim Tamamlandı!');
}

startRustTraining().catch(console.error);
