// [NANO-F5] V2 yanıt kalite logu — manuel inceleme için
// Paralel mod biterken V1 vs V2 karşılaştırması burada birikir

import * as fs from 'fs';
import * as path from 'path';

export interface QualityLogEntry {
  timestamp: number;
  input: string;
  v1Response: string;
  v2Response?: string;
  routingDecision: string;
  taskScore: Record<string, number>;
  v2LoadTime?: number;
}

const LOG_DIR = path.join(process.cwd(), 'src', 'core', 'nano-training');
const LOG_PATH = path.join(LOG_DIR, 'quality-log.jsonl');

export function logQualityEntry(entry: QualityLogEntry): void {
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(LOG_PATH, line, 'utf-8');
  } catch (err) {
    // Log başarısız olsa bile kullanıcı yanıtı etkilenmez
    console.warn('[NANO-F5] Quality log yazılamadı:', err);
  }
}

export function readQualityLog(): QualityLogEntry[] {
  if (!fs.existsSync(LOG_PATH)) return [];
  try {
    return fs.readFileSync(LOG_PATH, 'utf-8')
      .split('\n')
      .filter(l => l.trim())
      .map(l => JSON.parse(l));
  } catch {
    return [];
  }
}

export function summarizeQualityLog(): void {
  const entries = readQualityLog();
  if (entries.length === 0) {
    console.log('[NANO-F5] Henüz log yok');
    return;
  }
  const withV2 = entries.filter(e => e.v2Response);
  console.log(`[NANO-F5] Toplam log: ${entries.length}`);
  console.log(`[NANO-F5] V2 yanıtı olan: ${withV2.length}`);
  console.log(`[NANO-F5] Ortalama V2 yük süresi: ${
    withV2.reduce((s, e) => s + (e.v2LoadTime ?? 0), 0) / (withV2.length || 1)
  }ms`);
}
