// [NANO-F4C] V2 eğitim verisi hazırlama ve kalite filtresi
import * as fs from 'fs';
import * as path from 'path';

export interface TrainingExample {
  input: string;
  output: string;
  quality: number; // 0-1
  source: 'user_approved' | 'model_output' | 'manual';
}

const QUALITY_FILTERS = {
  minInputLength: 20,
  maxOutputLength: 800,
  minQuality: 0.6,
  unsafePatterns: [
    /sk-[a-zA-Z0-9]{20,}/,           // OpenAI key
    /AIza[a-zA-Z0-9_-]{35}/,         // Google key
    /password|şifre|parola/i,
    /Bearer [a-zA-Z0-9_-]{20,}/,     // Bearer token
  ],
};

export const MIN_TRAINING_EXAMPLES = 500;

export function filterTrainingExamples(
  examples: TrainingExample[]
): { valid: TrainingExample[]; rejected: TrainingExample[]; reasons: string[] } {
  const valid: TrainingExample[] = [];
  const rejected: TrainingExample[] = [];
  const reasons: string[] = [];

  for (const ex of examples) {
    if (ex.input.length < QUALITY_FILTERS.minInputLength) {
      rejected.push(ex);
      reasons.push(`Çok kısa input: "${ex.input.slice(0, 30)}..."`);
      continue;
    }
    if (ex.output.length > QUALITY_FILTERS.maxOutputLength) {
      rejected.push(ex);
      reasons.push(`Çok uzun output: ${ex.output.length} karakter`);
      continue;
    }
    if (ex.quality < QUALITY_FILTERS.minQuality) {
      rejected.push(ex);
      reasons.push(`Düşük kalite skoru: ${ex.quality}`);
      continue;
    }
    const combined = ex.input + ex.output;
    const unsafeMatch = QUALITY_FILTERS.unsafePatterns.find(p => p.test(combined));
    if (unsafeMatch) {
      rejected.push(ex);
      reasons.push(`Güvensiz içerik tespit edildi`);
      continue;
    }
    valid.push(ex);
  }

  return { valid, rejected, reasons };
}

export function prepareV2Dataset(
  examples: TrainingExample[],
  outputDir: string
): { count: number; rejected: number; path: string } | null {
  const { valid, rejected, reasons } = filterTrainingExamples(examples);

  console.log(`[NANO-F4C] Toplam: ${examples.length} | Geçerli: ${valid.length} | Reddedilen: ${rejected.length}`);

  if (valid.length < MIN_TRAINING_EXAMPLES) {
    console.error(
      `[NANO-F4C] ❌ Yetersiz veri: ${valid.length}/${MIN_TRAINING_EXAMPLES} minimum.\n` +
      `İlk 5 ret nedeni:\n${reasons.slice(0, 5).join('\n')}`
    );
    return null; // Hard block — eğitim başlatılmaz
  }

  // BPE uyumlu format: <BOS>input<SEP>output<EOS>
  const lines = valid.map(ex =>
    JSON.stringify({ text: `<BOS>${ex.input}<SEP>${ex.output}<EOS>` })
  );

  const outputPath = path.join(outputDir, 'nano_v2_dataset.jsonl');
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, lines.join('\n'), 'utf-8');

  console.log(`[NANO-F4C] ✅ Dataset yazıldı: ${outputPath}`);
  return { count: valid.length, rejected: rejected.length, path: outputPath };
}

// Mevcut input.txt veya learning candidates'tan örnek topla
export function collectFromExistingSources(
  trainingDir: string
): TrainingExample[] {
  const examples: TrainingExample[] = [];

  // [NANO-F4C] input.txt lokasyonunu kontrol et (trainingDir veya engine/data)
  const possiblePaths = [
    path.join(trainingDir, 'input.txt'),
    path.join(process.cwd(), 'src', 'core', 'engine', 'data', 'input.txt')
  ];

  for (const inputTxt of possiblePaths) {
    if (fs.existsSync(inputTxt)) {
      const lines = fs.readFileSync(inputTxt, 'utf-8')
        .split('\n')
        .filter(l => l.trim().length > 20);

      // Satır çiftlerini input/output olarak eşleştir
      for (let i = 0; i < lines.length - 1; i += 2) {
        examples.push({
          input: lines[i].trim(),
          output: lines[i + 1]?.trim() ?? '',
          quality: 0.7, // Varsayılan kalite
          source: 'manual',
        });
      }
      console.log(`[NANO-F4C] ${inputTxt} üzerinden ${examples.length} örnek toplandı`);
      break; 
    }
  }
  // Learning candidates klasörü varsa tara
  const candidatesDir = path.join(trainingDir, 'candidates');
  if (fs.existsSync(candidatesDir)) {
    const files = fs.readdirSync(candidatesDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(candidatesDir, file), 'utf-8'));
        if (data.input && data.output) {
          examples.push({ ...data, source: 'model_output' });
        }
      } catch { /* bozuk dosyaları atla */ }
    }
    console.log(`[NANO-F4C] Candidates'dan ${files.length} dosya tarandı`);
  }

  // [NANO-F6] .jsonl formatındaki ek veri kaynaklarını tara
  const jsonlFiles = fs.readdirSync(trainingDir).filter(f => f.endsWith('.jsonl') && f !== 'nano_v2_dataset.jsonl' && f !== 'quality-log.jsonl');
  for (const file of jsonlFiles) {
    try {
      const lines = fs.readFileSync(path.join(trainingDir, file), 'utf-8').split('\n').filter(l => l.trim());
      for (const line of lines) {
        const data = JSON.parse(line);
        if (data.text) {
          // BPE formatlı text varsa parçalamaya çalış veya direkt input/output olarak böl
          const parts = data.text.split(/### (?:Kullanıcı|Asistan): /).filter(Boolean);
          if (parts.length >= 2) {
            examples.push({ input: parts[0].trim(), output: parts[1].trim(), quality: 0.9, source: 'manual' });
          }
        } else if (data.input && data.output) {
          examples.push({ ...data, source: data.source || 'manual' });
        }
      }
      console.log(`[NANO-F6] ${file} üzerinden ${lines.length} satır işlendi`);
    } catch (err) {
      console.warn(`[NANO-F6] ${file} okuma hatası:`, err);
    }
  }

  return examples;
}
