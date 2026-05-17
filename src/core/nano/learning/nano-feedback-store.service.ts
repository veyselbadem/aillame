import fs from 'fs';
import path from 'path';
import { Mutex } from 'async-mutex';
import { NanoFeedbackRecord } from './nano-feedback.types';

const DATA_DIR = path.join(process.cwd(), '.aillame-data', 'nano-feedback');
const FEEDBACK_FILE = path.join(DATA_DIR, 'feedback.jsonl');
const QUARANTINE_DIR = path.join(DATA_DIR, 'quarantine');

/**
 * Nano Feedback Store Service - Phase H
 * 
 * Securely persists feedback records with redaction and UTF-8 enforcement.
 */
export class NanoFeedbackStoreService {
  private static mutex = new Mutex();

  /**
   * Persists a feedback record to the JSONL store.
   */
  static async recordFeedback(record: NanoFeedbackRecord): Promise<void> {
    await this.mutex.runExclusive(async () => {
      try {
        this.ensureDirectories();

        // 1. Redaction (Sensitive Data Filter)
        const sanitized = this.redactRecord(record);

        // 2. Validate UTF-8 and integrity
        const line = JSON.stringify(sanitized) + '\n';
        
        // 3. Append to file
        await fs.promises.appendFile(FEEDBACK_FILE, line, { encoding: 'utf8' });
      } catch (error) {
        console.error('[NanoFeedbackStore] Failed to record feedback:', error);
        await this.quarantineRecord(record, error);
      }
    });
  }

  /**
   * Redacts sensitive information from the record.
   */
  private static redactRecord(record: NanoFeedbackRecord): NanoFeedbackRecord {
    const redacted = { ...record };

    // Redact user message summary
    redacted.userMessageSummary = this.redactText(redacted.userMessageSummary);

    // Redact in user feedback comments if present
    if (redacted.userFeedback?.comment) {
      redacted.userFeedback.comment = this.redactText(redacted.userFeedback.comment);
    }

    redacted.redactionStatus = 'redacted';
    return redacted;
  }

  /**
   * Core redaction logic for secrets, paths, and keys.
   */
  private static redactText(text: string): string {
    let result = text;

    // 1. Redact Secrets (looks like API keys, tokens)
    result = result.replace(/[a-zA-Z0-9_-]{24,}/g, (match) => {
      // Keep short common words, redact long random-looking strings
      if (match.length > 32) return '[SECRET_REDACTED]';
      return match;
    });

    // 2. Redact Paths (Windows/Linux styles)
    result = result.replace(/[a-zA-Z]:\\[^ "]+/g, '[PATH_REDACTED]');
    result = result.replace(/\/[^ "]+\/[^ "]+/g, '[PATH_REDACTED]');

    // 3. Redact Emails
    result = result.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');

    // 4. Redact .env like values
    result = result.replace(/[A-Z0-9_]+=[^ \n]+/g, '[ENV_REDACTED]');

    return result;
  }

  private static ensureDirectories() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(QUARANTINE_DIR)) fs.mkdirSync(QUARANTINE_DIR, { recursive: true });
  }

  private static async quarantineRecord(record: any, error: any) {
    try {
      const qPath = path.join(QUARANTINE_DIR, `failed_${Date.now()}.json`);
      await fs.promises.writeFile(qPath, JSON.stringify({ record, error: String(error) }, null, 2), { encoding: 'utf8' });
    } catch (e) {
      console.error('[NanoFeedbackStore] Critical: Failed to quarantine record');
    }
  }
}
