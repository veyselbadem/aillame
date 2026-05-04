
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getAillameEngine } from './rust-core';
import { AillameTokenizer } from './tokenizer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// [NANO-F4B] Dual-config sistemi
export const NANO_V1_CONFIG = {
  nEmbd: 256,
  nLayer: 8,
  vocabSize: 256,
  checkpointPath: 'src/core/engine/checkpoints/aillame_rust_tuned.safetensors',
} as const;

export const NANO_V2_CONFIG = {
  nEmbd: 512,
  nLayer: 12,
  vocabSize: 8192,
  checkpointPath: 'src/core/engine/checkpoints/aillame_nano_v2.safetensors',
} as const;

export const NANO_V3_CONFIG = {
  nEmbd: 768,
  nLayer: 16,
  vocabSize: 16384,
  checkpointPath: 'src/core/engine/checkpoints/aillame_nano_v3.safetensors',
} as const;

// Env kontrolü — varsayılan her zaman V1
export const NANO_VERSION = (process.env.NANO_VERSION ?? 'v1').trim();
export const ACTIVE_NANO_CONFIG =
  NANO_VERSION === 'v3'
    ? NANO_V3_CONFIG
    : (NANO_VERSION === 'v2' ? NANO_V2_CONFIG : NANO_V1_CONFIG);

// Başlangıçta hangi config aktif olduğunu logla
console.log(`[NANO-F4B] Aktif config: ${NANO_VERSION}`, ACTIVE_NANO_CONFIG);

/**
 * Aillame Turbo Maraton v2 (RUST POWERED - Optimized)
 */
async function startRustTraining() {

    console.log('=== [Aillame Nano Training Script Started] ===');
    console.log('cwd:', process.cwd());
    // ENV parametrelerini oku
    const inputEnv = process.env.AILLAME_TRAIN_INPUT_FILE;
    const outputEnv = process.env.AILLAME_TRAIN_OUTPUT_CHECKPOINT;
    const dryRun = process.env.AILLAME_TRAIN_DRY_RUN === '1';
    const maxEpochsEnv = process.env.AILLAME_TRAIN_MAX_EPOCHS;
    const saveEveryEnv = process.env.AILLAME_TRAIN_SAVE_EVERY;
    const batchSizeEnv = process.env.AILLAME_TRAIN_BATCH_SIZE;
    const seqLenEnv = process.env.AILLAME_TRAIN_SEQ_LEN;

    const parseEnvInt = (value: string | undefined, defaultValue: number, name: string): number => {
        if (value === undefined) return defaultValue;
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            console.warn(`⚠️ ${name} invalid value '${value}', using default ${defaultValue}`);
            return defaultValue;
        }
        return parsed;
    };

    // Varsayılan dosya yolları
    const defaultInput = path.join(__dirname, 'data', 'input.txt');
    const defaultOutput = path.join(__dirname, 'checkpoints', 'aillame_rust_tuned.safetensors');

    // Parametre veya env ile gelen dosya yolları
    const dataPath = inputEnv ? path.resolve(process.cwd(), inputEnv) : defaultInput;
    const checkpointPath = outputEnv 
        ? path.resolve(process.cwd(), outputEnv) 
        : path.resolve(process.cwd(), ACTIVE_NANO_CONFIG.checkpointPath);

    console.log('Input file (resolved):', dataPath);
    console.log('Output checkpoint (resolved):', checkpointPath);

    const epochs = parseEnvInt(maxEpochsEnv, 1000000, 'AILLAME_TRAIN_MAX_EPOCHS');
    const batchSize = parseEnvInt(batchSizeEnv, 32, 'AILLAME_TRAIN_BATCH_SIZE');
    const seqLen = parseEnvInt(seqLenEnv, 64, 'AILLAME_TRAIN_SEQ_LEN');
    const saveEvery = parseEnvInt(saveEveryEnv, 200, 'AILLAME_TRAIN_SAVE_EVERY');
    console.log(`Training config: epochs=${epochs}, batchSize=${batchSize}, seqLen=${seqLen}, saveEvery=${saveEvery}`);

    // input dosyası kontrolü
    const inputExists = fs.existsSync(dataPath);
    console.log('Input exists:', inputExists);
    let inputSize = 0;
    if (inputExists) {
        inputSize = fs.statSync(dataPath).size;
        console.log('Input file size:', inputSize, 'bytes');
    }
    if (!inputExists) {
        console.error(`❌ Eğitim verisi bulunamadı: ${dataPath}`);
        process.exit(2);
    }
    if (inputSize === 0) {
        console.error(`❌ Eğitim verisi dosyası boş: ${dataPath}`);
        process.exit(3);
    }

    // output checkpoint overwrite koruması
    if (checkpointPath === defaultOutput && outputEnv) {
        console.error('❌ Aktif checkpoint üzerine yazmak riskli! Lütfen farklı bir dosya adı belirtin.');
        process.exit(4);
    }

    // output klasörü yoksa oluştur
    const outputDir = path.dirname(checkpointPath);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    console.log('Output checkpoint parent exists:', fs.existsSync(outputDir));

    // DRY RUN MODU
    if (dryRun) {
        console.log('=== [DRY RUN MODE] ===');
        const engine = getAillameEngine();
        if (!engine) {
            console.error('❌ Rust Core yüklenemedi. Önce derlemeniz gerekiyor.');
            process.exit(5);
        }
        const hasSave = typeof engine.saveCheckpoint === 'function';
        console.log('engine.saveCheckpoint fonksiyonu mevcut mu?', hasSave);
        if (!hasSave) {
            console.error('❌ Rust core wrapper saveCheckpoint fonksiyonu eksik!');
            process.exit(6);
        }
        console.log('DRY RUN OK');
        process.exit(0);
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
        process.exit(7);
    }
    if (typeof engine.saveCheckpoint !== 'function') {
        console.error('❌ Rust core wrapper saveCheckpoint fonksiyonu eksik!');
        process.exit(8);
    }

    const fixedVocabSize = ACTIVE_NANO_CONFIG.vocabSize; 
    engine.trainTokenizer(text);
    
    // [NANO-F4B] V2/V3 seçiliyse yeni init fonksiyonunu kullan
    if (NANO_VERSION === 'v3' && engine.initNanoV3) {
        engine.initNanoV3();
    } else if (NANO_VERSION === 'v2' && engine.initNanoV2) {
        engine.initNanoV2();
    } else {
        engine.initTrainer(fixedVocabSize, ACTIVE_NANO_CONFIG.nEmbd, ACTIVE_NANO_CONFIG.nLayer, 0.0003);
    }

    // Varsa eski checkpoint'i yükle
    if (fs.existsSync(checkpointPath)) {
        console.log('📂 Mevcut checkpoint yükleniyor...');
        engine.loadCheckpoint(checkpointPath);
    }

    // 3. Eğitim Döngüsü
    let tokens = tokenizer.encode(text);
    let lastFileSize = fs.statSync(dataPath).size;

    console.log(`--- Eğitim Başlıyor (DINAMIK): Vocab: ${vocabSize}, Epochs: ${epochs}, Batch: ${batchSize}, Seq: ${seqLen}, SaveEvery: ${saveEvery} ---`);

    let trainingSuccess = true;
    console.log('--- Eğitim başlatılıyor ---');
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
                const logMsg = `Zaman Dilimi ${i}/${epochs} - Kayıp: ${loss.toFixed(4)}`;
                console.log(logMsg);
                try {
                    fs.appendFileSync(path.join(process.cwd(), 'training_log.txt'), logMsg + '\n');
                } catch (e) {
                    // Log yazma hatası eğitimi durdurmasın
                }
            }

            if (i % saveEvery === 0) {
                engine.saveCheckpoint(checkpointPath);
            }
        } catch (err) {
            console.error(`Eğitim hatası epoch ${i}:`, err);
            trainingSuccess = false;
            break;
        }
    }

    if (trainingSuccess) {
        try {
            console.log('Final checkpoint save başlatılıyor...');
            engine.saveCheckpoint(checkpointPath);
            console.log(`💾 Final checkpoint saved: ${checkpointPath}`);
        } catch (e) {
            console.error(`❌ Final checkpoint save failed: ${e}`);
        }
    }

    console.log('✅ Eğitim Tamamlandı!');
}

if (import.meta.url === `file:///${path.join(process.cwd(), 'src/core/engine/train-rust.ts').replace(/\\/g, '/')}`) {
  startRustTraining().catch((err) => {
      console.error('❌ Main function error:', err && err.message ? err.message : err);
      process.exit(9);
  });
}
