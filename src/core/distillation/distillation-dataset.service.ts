import fs from 'fs';
import path from 'path';

export type AillameDistillationSample = {
  id: string;
  kind: "routing" | "tool_use" | "safety_block" | "project_context" | "memory_retrieval" | "chat_quality";
  source: "user_approved" | "manual" | "system_suggested";
  approved: boolean;
  redactedPrompt: string;
  rawPromptStored: false;
  expected: any;
  metadata: {
    intent?: string;
    target?: string;
    toolId?: string;
    projectId?: string;
    memoryTags?: string[];
    routeConfidence?: number;
    safetyFlags?: string[];
    modelId?: string;
  };
  createdAt: string;
  updatedAt: string;
};

export class AillameDistillationDatasetService {
  private static readonly STORE_DIR = path.join(process.cwd(), '.aillame-data', 'stores');
  private static readonly DATASET_PATH = path.join(AillameDistillationDatasetService.STORE_DIR, 'aillame-distillation-dataset.jsonl');

  /**
   * Sensitive redaction pattern checker.
   * Matches tokens, api keys, email patterns, password fields, T.C. numbers, and typical credentials.
   */
  public static redactSensitiveText(text: string): string {
    if (!text) return '';
    let result = text;

    // Redact typical API keys or tokens (e.g. sk-..., bearer ...)
    result = result.replace(/(sk-[a-zA-Z0-9]{20,})|(AIzaSy[a-zA-Z0-9-_]{33})/gi, '[REDACTED_API_KEY]');
    
    // Redact password values or secret keywords (both with colon/equal sign, and generic word forms like 'şifrem xyz' or 'şifre abc')
    result = result.replace(/(password|sifre|parola|token|secret)\s*([:=]\s*)?([a-zA-Z0-9_-]{4,})/gi, '$1 $2[REDACTED_SENSITIVE]');
    
    // Fallback cleanup for Turkish suffix matching 'şifrem abc'
    result = result.replace(/(sifrem|şifrem)\s+([a-zA-Z0-9_-]{4,})/gi, '$1 [REDACTED_SENSITIVE]');

    // Redact email addresses
    result = result.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');

    // Redact T.C. Identity Number (11-digit Turkish national ID)
    result = result.replace(/\b\d{11}\b/g, '[REDACTED_TC_NO]');

    // Redact credit cards (16 digit groupings)
    result = result.replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[REDACTED_CARD]');

    return result;
  }

  /**
   * Checks if the text contains extremely sensitive raw keywords that should be rejected outright.
   */
  public static containsSensitiveKeywords(text: string): boolean {
    if (!text) return false;
    const lower = text.toLowerCase();
    
    // Sensitive file names or environment properties
    const dangerousKeys = [
      '.env',
      'env dosya',
      'dotenv',
      'system32',
      'registry',
      'regedit',
      'api_key',
      'apikey',
      'private_key'
    ];

    return dangerousKeys.some(key => lower.includes(key));
  }

  /**
   * Helper to ensure store directory exists.
   */
  private static ensureDir() {
    if (!fs.existsSync(this.STORE_DIR)) {
      fs.mkdirSync(this.STORE_DIR, { recursive: true });
    }
  }

  /**
   * Validates a sample structure.
   */
  public static validateSample(sample: Partial<AillameDistillationSample>): { valid: boolean; error?: string } {
    if (!sample.kind || !['routing', 'tool_use', 'safety_block', 'project_context', 'memory_retrieval', 'chat_quality'].includes(sample.kind)) {
      return { valid: false, error: 'Geçersiz örnek türü (kind).' };
    }
    if (!sample.expected || typeof sample.expected !== 'object') {
      return { valid: false, error: 'Beklenen çıktı (expected) geçerli bir JSON objesi olmalıdır.' };
    }
    if (!sample.redactedPrompt || typeof sample.redactedPrompt !== 'string' || sample.redactedPrompt.trim().length === 0) {
      return { valid: false, error: 'Sorgu metni (prompt) boş olamaz.' };
    }
    return { valid: true };
  }

  /**
   * Lists all distillation samples by reading the JSONL file.
   * Tolerates corrupt lines by skipping them gracefully.
   */
  public static listSamples(): AillameDistillationSample[] {
    try {
      if (!fs.existsSync(this.DATASET_PATH)) {
        return [];
      }

      const raw = fs.readFileSync(this.DATASET_PATH, 'utf8');
      const lines = raw.split('\n');
      const samples: AillameDistillationSample[] = [];

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && parsed.id) {
            samples.push(parsed as AillameDistillationSample);
          }
        } catch (jsonErr) {
          console.warn('[DistillationDatasetService] Skipping corrupted line in JSONL:', jsonErr);
        }
      }

      return samples;
    } catch (error) {
      console.error('[DistillationDatasetService] Failed to read samples:', error);
      return [];
    }
  }

  /**
   * Creates/appends a secure user-approved sample to the JSONL dataset.
   */
  public static createSample(
    sampleInput: Omit<AillameDistillationSample, 'id' | 'createdAt' | 'updatedAt' | 'rawPromptStored' | 'approved'>,
    options: { userApproved: boolean }
  ): { success: boolean; sample?: AillameDistillationSample; error?: string } {
    try {
      // 1. Mandatory user approval check
      if (!options.userApproved) {
        return { success: false, error: 'Öğrenme verisi kaydedebilmek için kullanıcı onayı (userApproved: true) zorunludur.' };
      }

      // 2. Reject sensitive environment requests immediately
      if (this.containsSensitiveKeywords(sampleInput.redactedPrompt)) {
        return { success: false, error: 'Hassas sistem dosyaları veya anahtarları içeren girdiler eğitim verisi olarak kaydedilemez.' };
      }

      // 3. Security Redaction
      const safePrompt = this.redactSensitiveText(sampleInput.redactedPrompt);

      // 4. Build sample
      const newSample: AillameDistillationSample = {
        id: `sample_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        kind: sampleInput.kind,
        source: sampleInput.source || 'user_approved',
        approved: true,
        redactedPrompt: safePrompt,
        rawPromptStored: false,
        expected: sampleInput.expected,
        metadata: sampleInput.metadata || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 5. Structure Validation
      const validation = this.validateSample(newSample);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // 6. Secure Atomic Append using Temp File swap to avoid file corruption
      this.ensureDir();
      
      const currentSamples = this.listSamples();
      currentSamples.push(newSample);

      const tempPath = `${this.DATASET_PATH}.tmp`;
      const jsonlContent = currentSamples.map(s => JSON.stringify(s)).join('\n') + '\n';
      
      fs.writeFileSync(tempPath, jsonlContent, 'utf8');
      fs.renameSync(tempPath, this.DATASET_PATH);

      return { success: true, sample: newSample };
    } catch (err: any) {
      console.error('[DistillationDatasetService] Create sample failed:', err);
      return { success: false, error: `Kayıt sırasında beklenmeyen hata: ${err.message}` };
    }
  }

  /**
   * Suggests a non-persisted distillation sample based on chat route details.
   */
  public static suggestSampleFromInteraction(interaction: {
    prompt: string;
    intent: string;
    target: string;
    toolId?: string;
    projectId?: string;
    memoryTags?: string[];
    routeConfidence?: number;
    safetyBlocked?: boolean;
    projectContextUsed?: boolean;
    modelId?: string;
  }): AillameDistillationSample | null {
    try {
      if (!interaction.prompt) return null;

      // Reject sensitive keywords
      if (this.containsSensitiveKeywords(interaction.prompt)) {
        return null;
      }

      const safePrompt = this.redactSensitiveText(interaction.prompt);

      let kind: AillameDistillationSample['kind'] = 'routing';
      let expected: any = {};

      if (interaction.safetyBlocked) {
        kind = 'safety_block';
        expected = {
          intent: 'blocked',
          reason: 'İstek güvenlik duvarı veya hassas süzgeçler tarafından engellendi.'
        };
      } else if (interaction.intent === 'tool_use' && interaction.toolId) {
        kind = 'tool_use';
        expected = {
          intent: 'tool_use',
          toolId: interaction.toolId,
          safe: true
        };
      } else if (interaction.projectContextUsed && interaction.projectId) {
        kind = 'project_context';
        expected = {
          intent: 'text_chat',
          target: 'aillame_nano',
          projectContextUsed: true,
          projectId: interaction.projectId
        };
      } else if (interaction.memoryTags && interaction.memoryTags.length > 0) {
        kind = 'memory_retrieval';
        expected = {
          memoryUsed: true,
          memoryTags: interaction.memoryTags
        };
      } else {
        kind = 'routing';
        expected = {
          intent: interaction.intent,
          target: interaction.target,
          reason: `Nano asistan istek yönlendirmesi: ${interaction.intent}`
        };
      }

      return {
        id: `suggested_${Date.now()}`,
        kind,
        source: 'system_suggested',
        approved: false,
        redactedPrompt: safePrompt,
        rawPromptStored: false,
        expected,
        metadata: {
          intent: interaction.intent,
          target: interaction.target,
          toolId: interaction.toolId,
          projectId: interaction.projectId,
          memoryTags: interaction.memoryTags,
          routeConfidence: interaction.routeConfidence,
          modelId: interaction.modelId
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    } catch {
      return null;
    }
  }

  /**
   * Deletes a sample by its ID using secure atomic rewrite.
   */
  public static deleteSample(id: string): boolean {
    try {
      const list = this.listSamples();
      const filtered = list.filter(s => s.id !== id);
      if (filtered.length === list.length) {
        return false;
      }

      this.ensureDir();
      const tempPath = `${this.DATASET_PATH}.tmp`;
      const jsonlContent = filtered.map(s => JSON.stringify(s)).join('\n') + '\n';
      
      fs.writeFileSync(tempPath, jsonlContent, 'utf8');
      fs.renameSync(tempPath, this.DATASET_PATH);
      return true;
    } catch (err) {
      console.error('[DistillationDatasetService] Delete sample failed:', err);
      return false;
    }
  }

  /**
   * Searches sample redacted prompts or expected objects.
   */
  public static searchSamples(query: string): AillameDistillationSample[] {
    const list = this.listSamples();
    if (!query) return list;
    const lower = query.toLowerCase();

    return list.filter(s => 
      s.redactedPrompt.toLowerCase().includes(lower) ||
      s.kind.toLowerCase().includes(lower) ||
      JSON.stringify(s.expected).toLowerCase().includes(lower)
    );
  }

  /**
   * Returns a raw JSONL format export string. Re-verifies sensitive contents just in case.
   */
  public static exportJsonl(): string {
    const list = this.listSamples();
    return list
      .map(s => {
        // Redaction sanity check again on export
        s.redactedPrompt = this.redactSensitiveText(s.redactedPrompt);
        return JSON.stringify(s);
      })
      .join('\n') + '\n';
  }

  /**
   * Compiles count stats by category kind.
   */
  public static getStats(): Record<string, number> {
    const list = this.listSamples();
    const stats: Record<string, number> = {
      total: list.length,
      routing: 0,
      tool_use: 0,
      safety_block: 0,
      project_context: 0,
      memory_retrieval: 0,
      chat_quality: 0
    };

    for (const s of list) {
      if (s.kind in stats) {
        stats[s.kind]++;
      }
    }

    return stats;
  }
}
