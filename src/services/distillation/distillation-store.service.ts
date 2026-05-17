import fs from 'fs';
import path from 'path';
import { Mutex } from 'async-mutex';

export interface DistillationCandidate {
  instruction: string;
  output: string;
  project: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

const DISTILLATION_DIR = path.join(process.cwd(), '.aillame-data', 'distillation');
const CANDIDATES_FILE = path.join(DISTILLATION_DIR, 'candidates.jsonl');
const QUARANTINE_FILE = path.join(DISTILLATION_DIR, 'candidates.corrupted.jsonl');

/**
 * DistillationStoreService
 * Collects high-quality AI responses for later model distillation/fine-tuning.
 */
export class DistillationStoreService {
  private static mutex = new Mutex();

  /**
   * Records a successful interaction to the JSONL candidates file.
   * This operation is thread-safe and non-blocking for the caller.
   */
  static async record(candidate: DistillationCandidate): Promise<void> {
    // Run in background, don't block the AI response
    this.mutex.runExclusive(async () => {
      try {
        if (!fs.existsSync(DISTILLATION_DIR)) {
          fs.mkdirSync(DISTILLATION_DIR, { recursive: true });
        }

        // Integrity Check: If existing file has encoding issues, quarantine it
        if (fs.existsSync(CANDIDATES_FILE)) {
          const stats = fs.statSync(CANDIDATES_FILE);
          if (stats.size > 0) {
            const sample = await fs.promises.readFile(CANDIDATES_FILE, { encoding: 'utf8', flag: 'r' }).catch(() => "");
            // Heuristic check for common mangled Turkish characters in the file
            if (sample.includes('') || sample.includes('Ǭ') || sample.includes('Y')) {
              console.warn(`[DistillationStore] Corruption detected in ${CANDIDATES_FILE}. Quarantining...`);
              await fs.promises.rename(CANDIDATES_FILE, QUARANTINE_FILE);
            }
          }
        }

        // Explicitly use UTF-8 and ensure no character mangling
        // JSON.stringify handles unicode, but we ensure the file write is strictly utf8
        const line = JSON.stringify(candidate) + '\n';
        await fs.promises.appendFile(CANDIDATES_FILE, line, { encoding: 'utf8' });
      } catch (error) {
        console.error('[DistillationStore] Failed to record candidate:', error);
      }
    }).catch(err => {
      console.error('[DistillationStore] Mutex error:', err);
    });
  }

  /**
   * Diagnostic check for distillation health.
   */
  static getHealthStatus() {
    const exists = fs.existsSync(CANDIDATES_FILE);
    const hasQuarantine = fs.existsSync(QUARANTINE_FILE);
    return {
      active: exists,
      hasQuarantine,
      unsafe: hasQuarantine,
      filePath: CANDIDATES_FILE
    };
  }
}
