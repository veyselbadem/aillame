// [NANO-F4C] Nano v2 eğitim orchestrator
// V1 sistemiyle (train-rust.ts) hiçbir şekilde çakışmaz

import * as fs from 'fs';
import * as path from 'path';
import { ACTIVE_NANO_CONFIG, NANO_VERSION } from './train-rust';
import { getAillameEngine, safeBpeEncode } from './rust-core';
import {
  collectFromExistingSources,
  prepareV2Dataset,
  MIN_TRAINING_EXAMPLES,
} from '../nano-training/prepare-v2-dataset';

const V2_TRAIN_PARAMS = {
  batchSize: 8,
  seqLen: 64, // [NANO-F4C] Varsayılan dizi uzunluğu
  learningRate: 5e-5,
  maxEpochs: 10,
  checkpointEvery: 1,   // Her epoch'ta kaydet
  trainingDataDir: path.join(process.cwd(), 'src', 'core', 'nano-training'),
} as const;

export interface TrainV2Result {
  success: boolean;
  epochs: number;
  finalLoss?: number;
  checkpointPath?: string;
  error?: string;
}

export async function trainNanoV2(engine: any): Promise<TrainV2Result> {
  console.log('[NANO-F4C] ═══════════════════════════════');
  console.log('[NANO-F4C] Nano v2 eğitim pipeline başlıyor');
  console.log('[NANO-F4C] Config:', ACTIVE_NANO_CONFIG);
  console.log('[NANO-F4C] ═══════════════════════════════');

  if (NANO_VERSION !== 'v2') {
    console.warn('[NANO-F4C] Uyarı: NANO_VERSION v2 değil. Eğitim v2 parametreleriyle yapılacak.');
  }

  // 1. Veri topla
  const rawExamples = collectFromExistingSources(V2_TRAIN_PARAMS.trainingDataDir);

  // 2. Dataset hazırla — yetersizse hard stop
  const datasetResult = prepareV2Dataset(
    rawExamples,
    V2_TRAIN_PARAMS.trainingDataDir
  );

  if (!datasetResult) {
    return {
      success: false,
      epochs: 0,
      error: `Yetersiz eğitim verisi. Minimum ${MIN_TRAINING_EXAMPLES} örnek gerekli.`,
    };
  }

  console.log(`[NANO-F4C] ${datasetResult.count} örnek ile eğitim başlıyor...`);

  // 3. V2 modeli başlat
  // 3. V2 modeli başlat
  try {
    const { nativeModule } = await import('./rust-core');
    if (nativeModule && nativeModule.initNanoV2) {
      console.log('[NANO-F4C] Native initNanoV2(engine) çağrılıyor...');
      nativeModule.initNanoV2(engine);
    } else if (engine.initNanoV2) {
      console.log('[NANO-F4C] Rust motoru v2 modunda başlatılıyor...');
      engine.initNanoV2();
    } else {
      console.log('[NANO-F4C] Fallback: initTrainer kullanılıyor...');
      engine.initTrainer(
        ACTIVE_NANO_CONFIG.vocabSize,
        ACTIVE_NANO_CONFIG.nEmbd,
        ACTIVE_NANO_CONFIG.nLayer,
        V2_TRAIN_PARAMS.learningRate
      );
    }

    // [NANO-F6] Artımlı eğitim desteği
    if (process.env.NANO_INCREMENTAL === 'true') {
      const checkpointPath = path.join(process.cwd(), ACTIVE_NANO_CONFIG.checkpointPath);
      if (fs.existsSync(checkpointPath)) {
        console.log(`[NANO-F6] 🔄 Mevcut checkpoint yükleniyor: ${ACTIVE_NANO_CONFIG.checkpointPath}`);
        engine.loadCheckpoint(checkpointPath);
      } else {
        console.warn(`[NANO-F6] Checkpoint bulunamadı, sıfırdan başlanıyor: ${checkpointPath}`);
      }
    }
  } catch (err) {
    return { success: false, epochs: 0, error: `Model init hatası: ${err}` };
  }

  // 4. Eğitim döngüsü
  const datasetContent = fs.readFileSync(datasetResult.path, 'utf-8')
    .split('\n')
    .filter(l => l.trim())
    .map(l => JSON.parse(l).text);

  const allTokens = datasetContent.flatMap(text => safeBpeEncode(text));
  console.log(`[NANO-F4C] Toplam token sayısı: ${allTokens.length}`);

  let lastLoss = 0;
  const stepsPerEpoch = 30; // 2 saatlik hedef için ayarlandı (Batch: 8, Epoch: 10, Steps: 30)

  for (let epoch = 0; epoch < V2_TRAIN_PARAMS.maxEpochs; epoch++) {
    try {
      let epochLoss = 0;
      for (let step = 0; step < stepsPerEpoch; step++) {
        // Rastgele batch'ler oluştur
        const inputs: number[] = [];
        const targets: number[] = [];

        for (let b = 0; b < V2_TRAIN_PARAMS.batchSize; b++) {
          const start = Math.floor(Math.random() * (allTokens.length - V2_TRAIN_PARAMS.seqLen - 1));
          const chunk = allTokens.slice(start, start + V2_TRAIN_PARAMS.seqLen);
          const targetChunk = allTokens.slice(start + 1, start + V2_TRAIN_PARAMS.seqLen + 1);
          inputs.push(...chunk);
          targets.push(...targetChunk);
        }

        lastLoss = await engine.trainBatch(
          new Uint32Array(inputs),
          new Uint32Array(targets),
          V2_TRAIN_PARAMS.batchSize,
          V2_TRAIN_PARAMS.seqLen
        );
        epochLoss += lastLoss;
      }
      
      const avgLoss = epochLoss / stepsPerEpoch;
      console.log(
        `[NANO-F4C] Epoch ${epoch + 1}/${V2_TRAIN_PARAMS.maxEpochs} | Avg Loss: ${avgLoss.toFixed(4)}`
      );

      // Loss kontrolü
      if (avgLoss > 15 || isNaN(avgLoss)) {
        console.error('[NANO-F4C] ❌ Loss anormal — eğitim durduruluyor');
        return { success: false, epochs: epoch + 1, error: 'Loss ıraksadı' };
      }

      // Periyodik checkpoint
      if ((epoch + 1) % V2_TRAIN_PARAMS.checkpointEvery === 0) {
        engine.saveCheckpoint(ACTIVE_NANO_CONFIG.checkpointPath);
        console.log(`[NANO-F4C] 💾 Checkpoint kaydedildi — epoch ${epoch + 1}`);
      }
    } catch (err) {
      return { success: false, epochs: epoch + 1, error: `Epoch hatası: ${err}` };
    }
  }

  // 5. Final checkpoint
  engine.saveCheckpoint(ACTIVE_NANO_CONFIG.checkpointPath);

  console.log('[NANO-F4C] ✅ Eğitim tamamlandı');
  console.log('[NANO-F4C] V1 model etkilenmedi. V2 kaydedildi:', ACTIVE_NANO_CONFIG.checkpointPath);

  return {
    success: true,
    epochs: V2_TRAIN_PARAMS.maxEpochs,
    finalLoss: lastLoss,
    checkpointPath: ACTIVE_NANO_CONFIG.checkpointPath,
  };
}

// Hızlı dataset durum kontrolü — eğitim başlatmadan
export async function checkDatasetStatus(): Promise<void> {
  const examples = collectFromExistingSources(V2_TRAIN_PARAMS.trainingDataDir);
  console.log(`[NANO-F4C] Mevcut veri: ${examples.length} örnek`);
  console.log(`[NANO-F4C] Minimum gereken: ${MIN_TRAINING_EXAMPLES}`);
  console.log(`[NANO-F4C] Durum: ${examples.length >= MIN_TRAINING_EXAMPLES ? '✅ Yeterli' : '❌ Yetersiz'}`);
}

// Script olarak çalıştırıldığında eğitimi başlat
const isMain = process.argv[1] && (
  process.argv[1].endsWith('train-v2.ts') || 
  process.argv[1].endsWith('train-v2')
);

if (isMain) {
  const engine = getAillameEngine();
  if (engine) {
    trainNanoV2(engine).then(res => {
      if (res.success) {
        console.log('[NANO-F4C] Eğitim başarıyla tamamlandı.');
        process.exit(0);
      } else {
        console.error('[NANO-F4C] Eğitim başarısız:', res.error);
        process.exit(1);
      }
    }).catch(err => {
      console.error('[NANO-F4C] Beklenmedik hata:', err);
      process.exit(1);
    });
  } else {
    console.error('Rust engine not found');
    process.exit(1);
  }
}
