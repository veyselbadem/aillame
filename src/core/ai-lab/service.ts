import { LabSession, CreateSessionInput, LabMessage, LabParticipant } from './types';
import { loadSessions, saveSessions } from './store-json';
import { webSearch } from '../research/search';
import { generateProMultimodalResponse } from '../inference/pro-multimodal';
import { generateImageWithSdxl } from '../image-generation/sdxl';
import { reflectOnLabStep } from '../nano-cognitive/service';
import { createTrainingCandidateFromAiLabMessage } from './training-candidate';
import type { NanoLearningSuggestion } from '../nano-cognitive/types';
import { buildAnswerStyleGuide, normalizeAssistantAnswer } from '../conversation/conversation-quality';


export async function createSession(input: CreateSessionInput & { goal?: string }): Promise<LabSession> {
  const sessions = await loadSessions();
  const newSession: LabSession = {
    id: `lab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    topic: input.topic,
    goal: input.goal || 'research',
    topicMode: input.topicMode,
    mode: input.mode,
    participants: input.participants,
    status: 'draft',
    maxTurns: input.maxTurns || 10,
    currentTurn: 0,
    safetyLevel: input.safetyLevel || 5,
    loopMode: 'manual',
    errorCount: 0,
    maxErrors: 3,
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Initial system message
  const sysMsg: LabMessage = {
    id: `msg_sys_${Date.now()}`,
    sessionId: newSession.id,
    model: 'system',
    content: `AI Lab session started. Topic: "${newSession.topic}". Goal: "${newSession.goal || 'research'}". Participants: ${newSession.participants.join(', ')}.`,
    outputType: 'planning',
    createdAt: Date.now(),
  };
  newSession.messages.push(sysMsg);

  sessions.push(newSession);
  await saveSessions(sessions);
  return newSession;
}

export async function getSession(id: string): Promise<LabSession | undefined> {
  const sessions = await loadSessions();
  return sessions.find(s => s.id === id);
}

export async function updateSessionStatus(id: string, status: LabSession['status']): Promise<void> {
  const sessions = await loadSessions();
  const session = sessions.find(s => s.id === id);
  if (session) {
    session.status = status;
    if (status === 'stopped') {
      session.stopRequested = true;
    } else if (status === 'running') {
      session.stopRequested = false;
    }
    session.updatedAt = Date.now();
    await saveSessions(sessions);
  }
}

export async function deleteSession(id: string): Promise<boolean> {
  const sessions = await loadSessions();
  const initialLength = sessions.length;
  const filtered = sessions.filter(s => s.id !== id);

  if (filtered.length !== initialLength) {
    await saveSessions(filtered);
    return true;
  }
  return false;
}

export async function addMessageToSession(id: string, model: LabParticipant, content: string): Promise<LabMessage> {
  const sessions = await loadSessions();
  const session = sessions.find(s => s.id === id);
  if (!session) throw new Error('Session not found');

  const msg: LabMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    sessionId: id,
    model,
    content,
    outputType: 'text',
    createdAt: Date.now(),
  };

  session.messages.push(msg);
  session.currentTurn += 1;
  session.updatedAt = Date.now();

  if (session.currentTurn >= session.maxTurns) {
    session.status = 'completed';
  }

  await saveSessions(sessions);
  return msg;
}

const FAILURE_OUTPUT_TYPES = new Set<LabMessage['outputType']>(['error', 'planning', 'degraded', 'skipped']);
const FAILURE_KEYWORDS = [
  'timeout',
  'timed out',
  'zaman aşımı',
  'context size has been exceeded',
  'context_exceeded',
  'fetch failed',
  'econnrefused',
  'server offline',
  'model_missing',
  'model yüklü değil',
  'sunucu açık mı',
  'çalıştırılamadı',
  'analiz hatası',
  'gemma yanıtı tamamlayamadı',
  'kısa cevap tekrar denenebilir',
  'kullanılabilir sentez üretemedi',
  'qwen çalıştırma hatası',
  'gguf server returned',
  'python runner timed out',
  'lütfen özetlenecek',
  'özetlenecek metin yok',
  'lütfen metni',
  'metni gönder',
  'metni paylaş',
  'yeterli bilgi yok',
  'bilgi veremem',
];

const HTML_ENTITY_MAP: Record<string, string> = {
  '&quot;': '"',
  '&#34;': '"',
  '&#x22;': '"',
  '&#x27;': "'",
  '&#39;': "'",
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
};

function normalizeForGuard(value: string): string {
  return value.toLocaleLowerCase('tr-TR');
}

function decodeBasicHtmlEntities(value: string): string {
  return value.replace(/&quot;|&#34;|&#x22;|&#x27;|&#39;|&amp;|&lt;|&gt;/gi, (entity) => {
    return HTML_ENTITY_MAP[entity.toLowerCase()] || entity;
  });
}

function sanitizeLabText(value?: string): string {
  return decodeBasicHtmlEntities(value || '').replace(/\s+/g, ' ').trim();
}

export type GemmaOutputIssueReason =
  | 'reasoning_only'
  | 'instructional_placeholder'
  | 'invalid_short_output';

export type GemmaOutputQualityIssue = {
  reason: GemmaOutputIssueReason;
};

const GEMMA_INSTRUCTIONAL_PLACEHOLDER_PATTERNS = [
  /lütfen\s+özetlenecek/i,
  /özetlenecek\s+(metin|içerik).*(yok|bulunamadı)?/i,
  /lütfen\s+(metni|içeriği|konuyu).*(gönder|paylaş|sağla|ver)/i,
  /(metni|içeriği|konuyu).*(gönderin|paylaşın|sağlayın|verin)/i,
  /yeterli\s+bilgi\s+yok/i,
  /bu\s+konuda\s+bilgi\s+veremem/i,
  /bilgi\s+veremem/i,
  /ek\s+(metin|içerik|bilgi)\s+(gerekli|lazım|gerekiyor)/i,
];

function countWords(value: string): number {
  return (value.match(/[a-zA-Z0-9çğıöşüÇĞİÖŞÜ]+/g) || []).length;
}

function hasTopicSignal(value: string, topic?: string): boolean {
  const normalized = normalizeForGuard(value);
  const tokens = (topic || '')
    .toLocaleLowerCase('tr-TR')
    .match(/[a-z0-9çğıöşü]{4,}/g) || [];

  return tokens.some((token) => normalized.includes(token));
}

export function getGemmaOutputQualityIssue(value?: string, topic?: string): GemmaOutputQualityIssue | null {
  const trimmed = sanitizeLabText(value);
  if (!trimmed) return { reason: 'reasoning_only' };

  const normalized = normalizeForGuard(trimmed);
  if (normalized.includes('gemma yanıtı tamamlayamadı')) return { reason: 'reasoning_only' };
  if (normalized.includes('kısa cevap tekrar denenebilir')) return { reason: 'reasoning_only' };
  if (normalized.includes('kullanılabilir sentez üretemedi')) return { reason: 'reasoning_only' };

  if (GEMMA_INSTRUCTIONAL_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return { reason: 'instructional_placeholder' };
  }

  const wordCount = countWords(trimmed);
  if (wordCount < 5) return { reason: 'invalid_short_output' };
  if (wordCount <= 10 && !hasTopicSignal(trimmed, topic)) {
    return { reason: 'invalid_short_output' };
  }

  if (trimmed.length < 32 && /yanıt|cevap|tekrar|denenebilir/i.test(normalized)) {
    return { reason: 'invalid_short_output' };
  }

  return null;
}

function buildCompactGemmaRetryPrompt(session: LabSession): string {
  const latestResearch = [...session.messages].reverse().find((message) => message.model === 'web_search' || message.outputType === 'research');
  const sourceLines = (latestResearch?.content || '')
    .split('\n')
    .map((line) => sanitizeLabText(line))
    .filter((line) => /^\[\d+\]/.test(line))
    .slice(0, 5);

  const sources = sourceLines.length > 0
    ? sourceLines.join('\n')
    : sanitizeLabText(latestResearch?.content || session.topic).slice(0, 1200);

  return [
    `Konu: ${sanitizeLabText(session.topic)}.`,
    '5 maddelik kısa Türkçe sentez üret.',
    'Kullanıcıdan ek metin isteme.',
    'Sadece sonuç yaz.',
    '',
    'Varsa kullanabileceğin kaynak notları:',
    sources,
  ].join('\n');
}

function isFailureMessage(message?: LabMessage): boolean {
  if (!message) return false;
  const metadata = message.generationMetadata as any;
  if (metadata?.isFallback || metadata?.status === 'degraded' || metadata?.status === 'failed') return true;
  if (FAILURE_OUTPUT_TYPES.has(message.outputType)) return true;
  const content = normalizeForGuard(message.content || '');
  return FAILURE_KEYWORDS.some((keyword) => content.includes(normalizeForGuard(keyword)));
}

function hasFailedMessage(messages: LabMessage[], model: LabParticipant): boolean {
  return messages.some((message) => message.model === model && isFailureMessage(message));
}

function hasRuntimeFailure(messages: LabMessage[]): boolean {
  return messages.some((message) => message.model !== 'system' && isFailureMessage(message));
}

function chooseFastProvider(
  active: LabParticipant[],
  gemmaCount: number,
  ollamaCount: number,
  gemmaFailed: boolean,
  ollamaFailed: boolean
): LabParticipant | null {
  if (active.includes('gemma') && gemmaCount === 0 && !gemmaFailed) return 'gemma';
  if (active.includes('ollama') && ollamaCount === 0 && !ollamaFailed) return 'ollama';
  return null;
}

function decideNextLabAction(session: LabSession): { nextParticipant: LabParticipant | 'stop', reason: string } {
  const msgs = session.messages.filter(m => m.model !== 'system');
  const active = session.participants.filter((p): p is LabParticipant => p !== 'system');
  const lastMsg = msgs[msgs.length - 1];
  const previousMsg = msgs[msgs.length - 2];

  const wsCount = msgs.filter(m => m.model === 'web_search').length;
  const gemmaCount = msgs.filter(m => m.model === 'gemma').length;
  const ollamaCount = msgs.filter(m => m.model === 'ollama').length;
  const qwenCount = msgs.filter(m => m.model === 'qwen').length;
  const sdxlCount = msgs.filter(m => m.model === 'sdxl').length;
  const nanoCount = msgs.filter(m => m.model === 'nano').length;

  const webSearchDone = wsCount > 0;
  const gemmaFailed = hasFailedMessage(msgs, 'gemma');
  const qwenFailed = hasFailedMessage(msgs, 'qwen');
  const sdxlFailed = hasFailedMessage(msgs, 'sdxl');
  const ollamaFailed = hasFailedMessage(msgs, 'ollama');
  const hasCandidate = msgs.some(m => m.candidateForTraining);

  if (session.currentTurn >= session.maxTurns) {
    return { nextParticipant: 'stop', reason: 'Maksimum tur sayisina ulasildi.' };
  }

  if (lastMsg && previousMsg && lastMsg.model === previousMsg.model && lastMsg.outputType === previousMsg.outputType) {
    return { nextParticipant: 'stop', reason: 'Loop detected: aynı model aynı outputType ile üst üste döndü.' };
  }

  if (lastMsg?.model === 'nano' && (nanoCount > 1 || isFailureMessage(previousMsg) || lastMsg.content.includes('Oturum tamamlandı'))) {
    return { nextParticipant: 'stop', reason: isFailureMessage(previousMsg) ? 'Degraded sonrası Nano final summary tamamlandı.' : 'Nano final summary tamamlandı.' };
  }

  if (isFailureMessage(lastMsg)) {
    if (lastMsg?.model !== 'nano' && active.includes('nano')) {
      return { nextParticipant: 'nano', reason: 'Provider degraded/planning/error döndü; Nano güvenli final summary üretecek.' };
    }
    return { nextParticipant: 'stop', reason: 'Degraded akış güvenli şekilde durduruldu.' };
  }

  const fastProvider = chooseFastProvider(active, gemmaCount, ollamaCount, gemmaFailed, ollamaFailed);
  const goal = session.goal || 'research';

  if (goal === 'research') {
    if (active.includes('web_search') && !webSearchDone) return { nextParticipant: 'web_search', reason: 'Research: Web Search kaynak toplar.' };
    if (active.includes('nano') && nanoCount === 0) return { nextParticipant: 'nano', reason: 'Research: Nano kaynakları ve hedefi yorumlar.' };
    if (fastProvider) return { nextParticipant: fastProvider, reason: 'Research: hızlı yerel metin sentezi.' };
    if (active.includes('qwen') && qwenCount === 0 && !qwenFailed) return { nextParticipant: 'qwen', reason: 'Research: Qwen yalnızca seçildiği için derin analiz yapar.' };
    if (active.includes('nano') && nanoCount < 2) return { nextParticipant: 'nano', reason: 'Research: Nano final summary ve kalite kontrol.' };
    return { nextParticipant: 'stop', reason: 'Research akışı tamamlandı.' };
  }

  if (goal === 'explain') {
    if (active.includes('nano') && nanoCount === 0) return { nextParticipant: 'nano', reason: 'Explain: Nano intent ve açıklama çerçevesini kurar.' };
    if (fastProvider) return { nextParticipant: fastProvider, reason: 'Explain: seçili hızlı provider kısa açıklama üretir.' };
    if (active.includes('qwen') && qwenCount === 0 && !qwenFailed) return { nextParticipant: 'qwen', reason: 'Explain: Qwen seçiliyse detaylı analiz yapar.' };
    if (active.includes('nano') && nanoCount < 2) return { nextParticipant: 'nano', reason: 'Explain: Nano final summary.' };
    return { nextParticipant: 'stop', reason: 'Explain akışı tamamlandı.' };
  }

  if (goal === 'create_learning_candidate') {
    if (active.includes('web_search') && !webSearchDone) return { nextParticipant: 'web_search', reason: 'Learning Candidate: önce kaynak topla.' };
    if (active.includes('nano') && nanoCount === 0) return { nextParticipant: 'nano', reason: 'Learning Candidate: Nano kaynakları değerlendirir.' };
    if (fastProvider) return { nextParticipant: fastProvider, reason: 'Learning Candidate: hızlı sentez üretir.' };
    if (active.includes('nano') && nanoCount < 2 && !hasCandidate) return { nextParticipant: 'nano', reason: 'Learning Candidate: Nano final ve candidate guard.' };
    return { nextParticipant: 'stop', reason: 'Learning candidate akışı tamamlandı.' };
  }

  if (goal === 'debug_error') {
    if (active.includes('nano') && nanoCount === 0) return { nextParticipant: 'nano', reason: 'Debug: Nano hatayi siniflandirir.' };
    if (fastProvider) return { nextParticipant: fastProvider, reason: 'Debug: seçili hızlı provider tanı koyar.' };
    if (active.includes('qwen') && qwenCount === 0 && !qwenFailed) return { nextParticipant: 'qwen', reason: 'Debug: Qwen seçiliyse derin hata analizi yapar.' };
    if (active.includes('nano') && nanoCount < 2) return { nextParticipant: 'nano', reason: 'Debug: Nano final summary.' };
    return { nextParticipant: 'stop', reason: 'Debug akışı tamamlandı.' };
  }

  if (goal === 'image_generation_plan') {
    if (active.includes('nano') && nanoCount === 0) return { nextParticipant: 'nano', reason: 'Image Plan: Nano intent ve görsel hedefi netleştirir.' };
    if (active.includes('qwen') && qwenCount === 0 && !qwenFailed) return { nextParticipant: 'qwen', reason: 'Image Plan: Qwen seçiliyse konsept/prompt analizi yapar.' };
    if (active.includes('sdxl') && sdxlCount === 0 && !sdxlFailed) return { nextParticipant: 'sdxl', reason: 'Image Plan: SDXL sadece görsel hedefte çalışır.' };
    if (active.includes('nano') && nanoCount < 2) return { nextParticipant: 'nano', reason: 'Image Plan: Nano final summary.' };
    return { nextParticipant: 'stop', reason: 'Image generation plan akışı tamamlandı.' };
  }

  if (active.includes('nano') && nanoCount === 0) return { nextParticipant: 'nano', reason: 'Default: Nano güvenli başlangıç.' };
  if (fastProvider) return { nextParticipant: fastProvider, reason: 'Default: hızlı provider.' };
  if (active.includes('nano') && nanoCount < 2) return { nextParticipant: 'nano', reason: 'Default: Nano final summary.' };
  return { nextParticipant: 'stop', reason: 'Hedeflenen akış tamamlandı.' };
}
/**
 * Oturumun sıradaki adımını (turn) çalıştırır.
 */
export async function executeNextStep(id: string): Promise<LabMessage> {
  const sessions = await loadSessions();
  const session = sessions.find(s => s.id === id);
  if (!session) throw new Error('Session not found');
  if (session.status !== 'running') throw new Error('Session is not running');
  if (session.currentTurn >= session.maxTurns) throw new Error('Session completed');

  const action = decideNextLabAction(session);

  if (action.nextParticipant === 'stop') {
    const hasDegradedOutput = hasRuntimeFailure(session.messages);
    session.status = hasDegradedOutput || session.errorCount > 0 ? 'degraded' : 'completed';
    session.updatedAt = Date.now();
    await saveSessions(sessions);
    return session.messages[session.messages.length - 1];
  }

  const currentParticipant = action.nextParticipant;

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
  let isCandidateCreated = false;
  let content = '';
  let sourceUrls: string[] = [];
  let citations: string[] = [];
  let outputType: LabMessage['outputType'] = 'text';
  let imageUrl: string | undefined;
  let imagePath: string | undefined;
  let imagePrompt: string | undefined;
  let success = true;
  let pendingLearningCandidate: NanoLearningSuggestion | undefined;
  let generationMetadata: any;

  try {
    if (currentParticipant === 'web_search') {
      outputType = 'research';
      const results = await webSearch(session.topic);
      if (results && results.length > 0) {
        content = `Konu hakkında araştırma yapıldı: "${session.topic}".\n\nBulunan Özet Bilgi:\n`;
        results.forEach((s, i) => {
          const title = sanitizeLabText(s.title);
          const snippet = sanitizeLabText(s.snippet);
          content += `\n[${i + 1}] ${title}: ${snippet}`;
          sourceUrls.push(s.url);
          citations.push(`[${i + 1}] ${title} (${s.url})`);
        });
        content += `\n\nAraştırma tamamlandı. ${results.length} kaynak incelendi.`;
      } else {
        content = `"${session.topic}" için web araması yapıldı fakat sonuç bulunamadı.`;
      }
    } else if (currentParticipant === 'qwen') {
      outputType = 'text';
      const isQwenConfigured = process.env.AILLAME_QWEN_ENABLED === 'true' && !!process.env.AILLAME_PYTHON;
      if (isQwenConfigured && process.env.AILLAME_PRO_PROVIDER?.trim().toLowerCase() !== 'gemini') {
        const lastMsgs = session.messages.slice(-5).map(m => `${m.model}: ${m.content}`).join('\n');
        const qwenPrompt = `Sen AI Lab katılımcısısın. Konu: "${session.topic}".\n\nKonuşma kalite kuralları:\n${buildAnswerStyleGuide('ai_lab_analysis')}\n\nÖnceki tartışma:\n${lastMsgs}\n\nKonuyu teknik ve analitik açıdan değerlendir. 2-4 net maddeyle cevap ver.`;

        try {
          // AI Lab için timeout süresini kısaltıyoruz (varsayılan 30 saniye)
          const labTimeout = process.env.AILLAME_AI_LAB_QWEN_TIMEOUT_MS || process.env.AILLAME_QWEN_TIMEOUT_MS
            ? parseInt(process.env.AILLAME_AI_LAB_QWEN_TIMEOUT_MS || process.env.AILLAME_QWEN_TIMEOUT_MS || '90000')
            : 90000;

          content = await generateProMultimodalResponse({
            prompt: qwenPrompt,
            maxTokens: 400,
            temperature: 0.7,
            timeout: labTimeout
          });
        } catch (err: any) {
          const isTimeout = err?.message?.includes('timed out');
          if (isTimeout) {
            content = `Qwen bu turda zaman aşımına uğradı (Timeout). AI Lab akışı kesilmeden devam ediyor.\n\nNot: Bu durum modelin karmaşık bir analiz üzerinde çalıştığını veya sistem kaynaklarının yoğun olduğunu gösterebilir.`;
            outputType = 'degraded';
            success = true; // Timeout akışı bozmamalı
          } else {
            const detail = err?.message || 'Bilinmeyen hata';
            content = `Qwen Çalıştırma Hatası: ${detail}\n\nNot: Qwen şu an gerçek zamanlı yanıt veremediği için planlama moduna geçiliyor.`;
            success = true;
            outputType = 'degraded';
          }
        }
      } else {
        const { checkGeminiConfig, generateGeminiResponse } = await import('../inference/gemini');
        const geminiConfig = checkGeminiConfig();

        if (geminiConfig.enabled && geminiConfig.apiKeyConfigured) {
          const lastMsgs = session.messages.slice(-5).map(m => `${m.model}: ${m.content}`).join('\n');
          const geminiPrompt = `Sen AI Lab Pro/Gemini katılımcısısın. Konu: "${session.topic}".

Konuşma kalite kuralları:
${buildAnswerStyleGuide('ai_lab_analysis')}

Önceki tartışma:
${lastMsgs}

Konuyu teknik ve analitik açıdan değerlendir. 2-4 net maddeyle cevap ver.`;
          const result = await generateGeminiResponse({
            prompt: geminiPrompt,
            maxOutputTokens: 420,
            temperature: 0.7,
            timeoutMs: geminiConfig.timeoutMs,
          });

          if (result.success) {
            content = result.answer;
            generationMetadata = {
              status: 'completed',
              provider: 'gemini',
              source: 'pro_chat',
              fallbackFrom: isQwenConfigured ? undefined : 'qwen',
            };
          } else {
            content = `Gemini Pro Hatası: ${result.error}\n\nAI Lab akışı kesilmeden Nano/Web Search değerlendirmesiyle devam ediyor.`;
            outputType = 'degraded';
            generationMetadata = {
              status: 'degraded',
              provider: 'gemini',
              source: 'pro_chat',
              reason: result.code,
            };
          }
        } else {
          content = `Pro Chat: Qwen çalışma zamanı yapılandırılmadı ve Gemini API key tanımlı değil. Konu: ${session.topic}`;
          outputType = 'planning';
          generationMetadata = {
            status: 'degraded',
            source: 'pro_chat',
            reason: geminiConfig.enabled ? 'api_key_missing' : 'provider_disabled',
          };
        }
      }
    } else if (currentParticipant === 'ollama') {
      outputType = 'text';
      const isEnabled = process.env.AILLAME_OLLAMA_ENABLED !== 'false';
      if (isEnabled) {
        const lastMsgs = session.messages.slice(-5).map(m => `${m.model}: ${m.content}`).join('\n');
        const prompt = `Sen AI Lab katılımcısısın (Ollama). Konu: "${session.topic}".\n\nKonuşma kalite kuralları:\n${buildAnswerStyleGuide('ai_lab_analysis')}\n\nÖnceki tartışma:\n${lastMsgs}\n\nKonuyu hızlı ve öz değerlendir. 2-4 net maddeyle cevap ver.`;
        try {
          const { generateOllamaResponse } = await import('@/core/inference/ollama');
          const ollamaTimeout = process.env.AILLAME_OLLAMA_TIMEOUT_MS
            ? parseInt(process.env.AILLAME_OLLAMA_TIMEOUT_MS)
            : 60000;
          content = await generateOllamaResponse({ prompt, maxTokens: 256, temperature: 0.7, timeout: ollamaTimeout }) || 'Ollama yanıt üretemedi.';
        } catch (err: any) {
          const isTimeout = err?.message?.includes('zaman aşımı') || err?.message?.includes('timeout');
          if (isTimeout) {
            content = `Ollama zaman aşımına uğradı. Hızlı analiz turu atlanıyor.`;
            outputType = 'degraded';
          } else {
            content = `Ollama Analiz Hatası: ${err.message || 'Model hazır değil.'}\n\nNot: Ollama kapalıysa server_offline, model eksikse model_missing olarak işaretlenir.`;
            outputType = 'degraded';
          }
        }
      } else {
        content = `Ollama (Fast Model) devre dışı. Lütfen .env üzerinden aktif edin.`;
        outputType = 'planning';
      }
    } else if (currentParticipant === 'gemma') {
      outputType = 'text';
      const isEnabled = process.env.AILLAME_GEMMA_ENABLED === 'true';
      if (isEnabled) {
        const lastMsgs = session.messages.slice(-5).map(m => `${m.model}: ${m.content}`).join('\n');
        const gemmaPrompt = `Sen AI Lab katılımcısısın (Gemma). Konu: "${session.topic}".\n\nKonuşma kalite kuralları:\n${buildAnswerStyleGuide('ai_lab_analysis')}\n\nÖnceki tartışma:\n${lastMsgs}\n\nKonuyu hızlı ve öz değerlendir. 2-4 net maddeyle cevap ver.`;

        try {
          const gemmaTimeout = process.env.AILLAME_GEMMA_TIMEOUT_MS
            ? parseInt(process.env.AILLAME_GEMMA_TIMEOUT_MS)
            : 60000;

          const { generateGemmaResponse } = await import('@/core/inference/gemma');
          const result = await generateGemmaResponse({
            prompt: gemmaPrompt,
            maxTokens: 256,
            temperature: 0.7,
            timeout: gemmaTimeout
          });
          content = result || 'Gemma yanıt üretemedi.';

          const initialGemmaIssue = getGemmaOutputQualityIssue(content, session.topic);
          if (initialGemmaIssue) {
            generationMetadata = {
              status: 'degraded',
              isFallback: true,
              source: 'gemma',
              reason: initialGemmaIssue.reason,
              retryAttempted: true,
            };

            const retryResult = await generateGemmaResponse({
              prompt: buildCompactGemmaRetryPrompt(session),
              maxTokens: 220,
              temperature: 0.3,
              timeout: gemmaTimeout
            });

            const retryGemmaIssue = getGemmaOutputQualityIssue(retryResult, session.topic);
            if (retryGemmaIssue) {
              content = 'Gemma bu turda kullanılabilir sentez üretemedi; final özet Web Search ve Nano değerlendirmesiyle hazırlanacak.';
              outputType = 'degraded';
              generationMetadata = {
                status: 'degraded',
                isFallback: true,
                source: 'gemma',
                reason: retryGemmaIssue.reason,
                initialReason: initialGemmaIssue.reason,
                retryAttempted: true,
              };
            } else {
              content = retryResult;
              generationMetadata = {
                status: 'completed',
                isFallback: false,
                source: 'gemma',
                retryAttempted: true,
              };
            }
          } else {
            generationMetadata = {
              status: 'completed',
              isFallback: false,
              source: 'gemma',
            };
          }
        } catch (err: any) {
          const errorMessage = err?.message || '';
          const errorCode = typeof err?.code === 'string' ? err.code.toLowerCase() : '';
          const isTimeout =
            errorCode === 'timeout' ||
            errorMessage.includes('timed out') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('yanıt süresi doldu') ||
            errorMessage.includes('zaman aşımı') ||
            err?.name === 'TimeoutError' ||
            errorMessage.includes('AbortError');
          if (isTimeout) {
            const timeoutSeconds = Math.round((process.env.AILLAME_GEMMA_TIMEOUT_MS ? parseInt(process.env.AILLAME_GEMMA_TIMEOUT_MS) : 60000) / 1000);
            content = `Gemma 4 E4B zaman aşımına uğradı (${timeoutSeconds}s). Hızlı analiz turu atlanıyor; AI Lab Nano + Web Search ile devam ediyor.`;
            outputType = 'degraded';
            generationMetadata = {
              status: 'degraded',
              isFallback: true,
              source: 'gemma',
              reason: 'timeout',
            };
          } else {
            const autoStartNote = process.env.AILLAME_GEMMA_AUTO_START === 'true'
              ? 'Not: Gemma local server otomatik başlatılamadı. Model yolu veya llama-server.exe yolu kontrol edilmeli.'
              : 'Not: Gemma local server kapalı. Manuel başlatma veya AILLAME_GEMMA_AUTO_START=true kullanılabilir.';
            content = `Gemma 4 E4B Analiz Hatası: ${err.message || 'Model hazır değil.'}\n\n${autoStartNote} AI Lab Nano + Web Search ile devam ediyor.`;
            outputType = 'degraded';
            generationMetadata = {
              status: 'failed',
              isFallback: true,
              source: 'gemma',
              reason: err?.code || 'unknown_error',
            };
          }
        }
      } else {
        content = `Gemma 4 E4B (Fast Model) devre dışı veya yapılandırılmadı. AI Lab Nano/Web Search ile güvenli devam ediyor.`;
        outputType = 'planning';
        generationMetadata = {
          status: 'degraded',
          isFallback: true,
          source: 'gemma',
          reason: 'disabled',
        };
      }
    } else if (currentParticipant === 'sdxl') {
      outputType = 'image';
      const isConfigured = process.env.AILLAME_SDXL_ENABLED === 'true' && !!process.env.AILLAME_PYTHON;
      if (session.goal !== 'image_generation_plan') {
        content = `SDXL bu hedef için atlandı. Görsel üretim yalnızca image_generation_plan akışında çalışır.`;
        outputType = 'skipped';
      } else if (isConfigured) {
        imagePrompt = `A stunning professional artistic representation of ${session.topic}, high detail, 4k, digital art style.`;
        try {
          const result = await generateImageWithSdxl({
            prompt: imagePrompt,
            preset: 'square',
            steps: 25
          });
          imageUrl = `data:${result.mimeType};base64,${result.image}`;
          content = `SDXL Görsel Üretimi Tamamlandı.\nPrompt: ${imagePrompt}`;
        } catch (err) {
          content = `SDXL Execution Hatası: Model veya çalışma zamanı hazır değil. Fallback planına geçiliyor.`;
          outputType = 'planning';
        }
      } else {
        content = `SDXL (Image Model): SDXL çalışma zamanı yapılandırılmadığı için şu an planlama modunda yanıt veriyor. Konu: ${session.topic}`;
        outputType = 'planning';
      }
    } else if (currentParticipant === 'nano') {
      const activeParticipants = session.participants.filter(p => p !== 'system');
      const lastMessages = session.messages.slice(-5);
      const reflection = await reflectOnLabStep(session.topic, lastMessages, session.goal, activeParticipants);

      content = `Aillame Nano (Cognitive Layer):\n\n${reflection.summary}\n\n`;
      if (reflection.suggestion) content += `Yorum: ${reflection.suggestion}\n`;
      if (reflection.nextStep) content += `Öneri: ${reflection.nextStep}\n`;

      const hasCandidate = session.messages.some(m => m.candidateForTraining);
      const providerHasFailed = session.messages.some(m => m.model !== 'nano' && m.model !== 'system' && isFailureMessage(m));
      const hasSynthesis = session.messages.some(m => (m.model === 'gemma' || m.model === 'ollama') && !isFailureMessage(m));

      if (reflection.learningCandidate && !hasCandidate && !providerHasFailed && hasSynthesis && session.goal === 'create_learning_candidate') {
        pendingLearningCandidate = reflection.learningCandidate;
        content += `\n[Egitim Adayi Tespit Edildi]: "${reflection.learningCandidate.instruction}" - Admin onayi bekleniyor.`;
      }
    } else {
      content = `${currentParticipant.toUpperCase()} (Planned Model): Bu model henüz tam entegre edilmediği için planning modunda yanıt veriyor. Konu: ${session.topic}`;
      outputType = 'planning';
    }
  } catch (error) {
    content = `Hata: ${currentParticipant} çalıştırılırken bir sorun oluştu.`;
    console.error(error);
    success = false;
    outputType = 'error';
  }

  content = normalizeAssistantAnswer(content);

  const msg: LabMessage = {
    id: messageId,
    sessionId: id,
    model: currentParticipant,
    content,
    outputType,
    imageUrl,
    imagePath,
    prompt: imagePrompt,
    generationMetadata,
    sourceUrls: sourceUrls.length > 0 ? sourceUrls : undefined,
    citations: citations.length > 0 ? citations : undefined,
    candidateForTraining: isCandidateCreated,
    createdAt: Date.now(),
  };

  if (
    pendingLearningCandidate &&
    currentParticipant === 'nano' &&
    outputType === 'text' &&
    !isFailureMessage(msg) &&
    !session.messages.some(m => m.candidateForTraining)
  ) {
    const candidateResult = await createTrainingCandidateFromAiLabMessage(msg, session.topic, pendingLearningCandidate);
    isCandidateCreated = candidateResult.success;
    msg.candidateForTraining = isCandidateCreated;
  }

  session.messages.push(msg);
  session.currentTurn += 1;
  session.lastRunAt = Date.now();
  session.updatedAt = Date.now();

  if (!success) {
    session.errorCount += 1;
    if (session.errorCount >= session.maxErrors) {
      session.status = 'degraded';
    }
  }

  if (session.currentTurn >= session.maxTurns) {
    session.status = hasRuntimeFailure(session.messages) ? 'degraded' : 'completed';
  }

  await saveSessions(sessions);
  return msg;
}

/**
 * Oturumu kontrollü bir döngüde çalıştırır.
 * Next.js API limitleri dahilinde bir seferde birkaç adım ilerler.
 */
export async function runControlledLoop(id: string, stepsToRun: number = 3): Promise<LabMessage[]> {
  const messages: LabMessage[] = [];

  for (let i = 0; i < stepsToRun; i++) {
    const sessions = await loadSessions();
    const session = sessions.find(s => s.id === id);

    if (!session || session.status !== 'running' || session.stopRequested || session.currentTurn >= session.maxTurns) {
      break;
    }

    const msg = await executeNextStep(id);
    if (!messages.some((existing) => existing.id === msg.id)) {
      messages.push(msg);
    }

    // Küçük bir bekleme (opsiyonel)
    await new Promise(r => setTimeout(r, 1000));
  }

  return messages;
}
