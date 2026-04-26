import { exportApprovedTrainingData } from './service';
import type { NanoTrainingRecord } from './types';

/**
 * NanoTrainingBridge
 * Export edilen yapılandırılmış veriyi (JSON)
 * Nano engine'in (input.txt) anlayacağı formatta metne dönüştürür.
 */
export async function generateTrainingDatasetText(): Promise<string> {
  const exportResult = await exportApprovedTrainingData();
  
  if (!exportResult.success || exportResult.count === 0) {
    return '';
  }

  return exportResult.data.map(record => formatRecordForTraining(record)).join('\n');
}

function formatRecordForTraining(record: NanoTrainingRecord): string {
  // Modelin instruction-following yeteneğini geliştirmek için format
  const parts = [
    `\n[DATASET_SOURCE: ${record.source.toUpperCase()}]`,
    `[RISK: ${record.riskLevel.toUpperCase()}]`,
    `Instruction: ${record.instruction}`,
  ];

  if (record.input) {
    parts.push(`Input: ${record.input}`);
  }

  parts.push(`Output: ${record.output}\n`);

  return parts.join('\n');
}

/**
 * Bu fonksiyon gerçek bir eğitim dosyasına ekleme yapmaz,
 * sadece eğitilebilir veriyi döndürür. Güvenlik kuralları
 * nano-training/service.ts içinde uygulanmıştır.
 */
export async function getTrainingReadyBuffer(): Promise<Buffer> {
  const text = await generateTrainingDatasetText();
  return Buffer.from(text, 'utf-8');
}
