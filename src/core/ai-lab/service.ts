import { LabSession, CreateSessionInput, LabMessage, LabParticipant } from './types';
import { loadSessions, saveSessions } from './store-json';
import { webSearch } from '../research/search';
import { generateProMultimodalResponse } from '../inference/pro-multimodal';
import { generateImageWithSdxl } from '../image-generation/sdxl';
import { reflectOnLabStep } from '../nano-cognitive/service';
import { createTrainingCandidateFromAiLabMessage } from './training-candidate';
import type { NanoLearningSuggestion } from '../nano-cognitive/types';


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
  'fetch failed',
  'econnrefused',
  'server offline',
  'sunucu açık mı',
  'çalıştırılamadı',
  'analiz hatası',
  'qwen çalıştırma hatası',
  'gguf server returned',
  'python runner timed out',
];

function normalizeForGuard(value: string): string {
  return value.toLocaleLowerCase('tr-TR');
}

function isFailureMessage(message?: LabMessage): boolean {
  if (!message) return false;
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
    return { nextParticipant: 'stop', reason: 'Maksimum tur sayısına ulaşıldı.' };
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
    if (active.includes('nano') && nanoCount === 0) return { nextParticipant: 'nano', reason: 'Debug: Nano hatayı sınıflandırır.' };
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
 * Oturumun sÄ±radaki adÄ±mÄ±nÄ± (turn) Ã§alÄ±ÅŸtÄ±rÄ±r.
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

  try {
    if (currentParticipant === 'web_search') {
      outputType = 'research';
      const results = await webSearch(session.topic);
      if (results && results.length > 0) {
        content = `Konu hakkÄ±nda araÅŸtÄ±rma yapÄ±ldÄ±: "${session.topic}".\n\nBulunan Ã–zet Bilgi:\n`;
        results.forEach((s, i) => {
          content += `\n[${i + 1}] ${s.title}: ${s.snippet}`;
          sourceUrls.push(s.url);
          citations.push(`[${i + 1}] ${s.title} (${s.url})`);
        });
        content += `\n\nAraÅŸtÄ±rma tamamlandÄ±. ${results.length} kaynak incelendi.`;
      } else {
        content = `"${session.topic}" iÃ§in web aramasÄ± yapÄ±ldÄ± fakat sonuÃ§ bulunamadÄ±.`;
      }
    } else if (currentParticipant === 'qwen') {
      outputType = 'text';
      const isConfigured = process.env.AILLAME_QWEN_ENABLED === 'true' && !!process.env.AILLAME_PYTHON;
      if (isConfigured) {
        const lastMsgs = session.messages.slice(-5).map(m => `${m.model}: ${m.content}`).join('\n');
        const qwenPrompt = `Sen AI Lab katÄ±lÄ±mcÄ±sÄ±sÄ±n. Konu: "${session.topic}". Ã–nceki tartÄ±ÅŸma:\n${lastMsgs}\n\nLÃ¼tfen konuyu teknik ve analitik aÃ§Ä±dan deÄŸerlendir. KÄ±sa ve Ã¶z cevap ver.`;

        try {
          // AI Lab iÃ§in timeout sÃ¼resini kÄ±saltÄ±yoruz (varsayÄ±lan 30 saniye)
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
            content = `Qwen bu turda zaman aÅŸÄ±mÄ±na uÄŸradÄ± (Timeout). AI Lab akÄ±ÅŸÄ± kesilmeden devam ediyor.\n\nNot: Bu durum modelin karmaÅŸÄ±k bir analiz Ã¼zerinde Ã§alÄ±ÅŸtÄ±ÄŸÄ±nÄ± veya sistem kaynaklarÄ±nÄ±n yoÄŸun olduÄŸunu gÃ¶sterebilir.`;
            outputType = 'degraded';
            success = true; // Timeout akÄ±ÅŸÄ± bozmamalÄ±
          } else {
            const detail = err?.message || 'Bilinmeyen hata';
            content = `Qwen Ã‡alÄ±ÅŸtÄ±rma HatasÄ±: ${detail}\n\nNot: Qwen ÅŸu an gerÃ§ek zamanlÄ± yanÄ±t veremediÄŸi iÃ§in planlama moduna geÃ§iliyor.`;
            success = true;
            outputType = 'degraded';
          }
        }
      } else {
        content = `Qwen (Pro Model): Qwen Ã§alÄ±ÅŸma zamanÄ± yapÄ±landÄ±rÄ±lmadÄ±ÄŸÄ± iÃ§in ÅŸu an planlama modunda yanÄ±t veriyor. Konu: ${session.topic}`;
        outputType = 'planning';
      }
    } else if (currentParticipant === 'ollama') {
      outputType = 'text';
      const isEnabled = process.env.AILLAME_OLLAMA_ENABLED !== 'false';
      if (isEnabled) {
        const lastMsgs = session.messages.slice(-5).map(m => `${m.model}: ${m.content}`).join('\n');
        const prompt = `Sen AI Lab katÄ±lÄ±mcÄ±sÄ±sÄ±n (Ollama). Konu: "${session.topic}". Ã–nceki tartÄ±ÅŸma:\n${lastMsgs}\n\nLÃ¼tfen konuyu hÄ±zlÄ± ve Ã¶z bir ÅŸekilde deÄŸerlendir. 2-3 cÃ¼mleyle cevap ver.`;
        try {
          const { generateOllamaResponse } = await import('@/core/inference/ollama');
          const ollamaTimeout = process.env.AILLAME_OLLAMA_TIMEOUT_MS
            ? parseInt(process.env.AILLAME_OLLAMA_TIMEOUT_MS)
            : 60000;
          content = await generateOllamaResponse({ prompt, maxTokens: 256, temperature: 0.7, timeout: ollamaTimeout }) || 'Ollama yanÄ±t Ã¼retemedi.';
        } catch (err: any) {
          const isTimeout = err?.message?.includes('zaman aÅŸÄ±mÄ±') || err?.message?.includes('timeout');
          if (isTimeout) {
            content = `Ollama zaman aÅŸÄ±mÄ±na uÄŸradÄ±. HÄ±zlÄ± analiz turu atlanÄ±yor.`;
            outputType = 'degraded';
          } else {
            content = `Ollama Analiz HatasÄ±: ${err.message || 'Model hazÄ±r deÄŸil.'}\n\nNot: Ollama kapalÄ± veya model eksik olabilir.`;
            outputType = 'degraded';
          }
        }
      } else {
        content = `Ollama (Fast Model) devre dÄ±ÅŸÄ±. LÃ¼tfen .env Ã¼zerinden aktif edin.`;
        outputType = 'planning';
      }
    } else if (currentParticipant === 'gemma') {
      outputType = 'text';
      const isEnabled = process.env.AILLAME_GEMMA_ENABLED === 'true';
      if (isEnabled) {
        const lastMsgs = session.messages.slice(-5).map(m => `${m.model}: ${m.content}`).join('\n');
        const gemmaPrompt = `Sen AI Lab katÄ±lÄ±mcÄ±sÄ±sÄ±n (Gemma). Konu: "${session.topic}". Ã–nceki tartÄ±ÅŸma:\n${lastMsgs}\n\nLÃ¼tfen konuyu hÄ±zlÄ± ve Ã¶z bir ÅŸekilde deÄŸerlendir. 2-3 cÃ¼mleyle cevap ver.`;

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
          content = result || 'Gemma yanÄ±t Ã¼retemedi.';
        } catch (err: any) {
          const isTimeout = err?.message?.includes('timed out') || err?.message?.includes('timeout') || err?.name === 'TimeoutError' || err?.message?.includes('AbortError');
          if (isTimeout) {
            content = `Gemma 4 E4B zaman aÅŸÄ±mÄ±na uÄŸradÄ± (60s). HÄ±zlÄ± analiz turu atlanÄ±yor.`;
            outputType = 'degraded';
          } else {
            content = `Gemma 4 E4B Analiz HatasÄ±: ${err.message || 'Model hazÄ±r deÄŸil.'}\n\nNot: Gemma henÃ¼z kurulu olmayabilir veya GGUF sunucusu kapalÄ±dÄ±r. AI Lab Nano + Web Search ile devam ediyor.`;
            outputType = 'degraded';
          }
        }
      } else {
        content = `Gemma 4 E4B (Fast Model) devre dışı veya yapılandırılmadı. AI Lab Nano/Web Search ile güvenli devam ediyor.`;
        outputType = 'planning';
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
          content = `SDXL GÃ¶rsel Ãœretimi TamamlandÄ±.\nPrompt: ${imagePrompt}`;
        } catch (err) {
          content = `SDXL Execution HatasÄ±: Model veya Ã§alÄ±ÅŸma zamanÄ± hazÄ±r deÄŸil. Fallback planÄ±na geÃ§iliyor.`;
          outputType = 'planning';
        }
      } else {
        content = `SDXL (Image Model): SDXL Ã§alÄ±ÅŸma zamanÄ± yapÄ±landÄ±rÄ±lmadÄ±ÄŸÄ± iÃ§in ÅŸu an planlama modunda yanÄ±t veriyor. Konu: ${session.topic}`;
        outputType = 'planning';
      }
    } else if (currentParticipant === 'nano') {
      const activeParticipants = session.participants.filter(p => p !== 'system');
      const lastMessages = session.messages.slice(-5);
      const reflection = await reflectOnLabStep(session.topic, lastMessages, session.goal, activeParticipants);

      content = `Aillame Nano (Cognitive Layer):\n\n${reflection.summary}\n\n`;
      if (reflection.suggestion) content += `Yorum: ${reflection.suggestion}\n`;
      if (reflection.nextStep) content += `Ã–neri: ${reflection.nextStep}\n`;

      const hasCandidate = session.messages.some(m => m.candidateForTraining);
      const providerHasFailed = session.messages.some(m => m.model !== 'nano' && m.model !== 'system' && isFailureMessage(m));
      const hasSynthesis = session.messages.some(m => (m.model === 'gemma' || m.model === 'ollama') && !isFailureMessage(m));

      if (reflection.learningCandidate && !hasCandidate && !providerHasFailed && hasSynthesis && session.goal === 'create_learning_candidate') {
        pendingLearningCandidate = reflection.learningCandidate;
        content += `\n[Eğitim Adayı Tespit Edildi]: "${reflection.learningCandidate.instruction}" - Admin onayı bekleniyor.`;
      }
    } else {
      content = `${currentParticipant.toUpperCase()} (Planned Model): Bu model henÃ¼z tam entegre edilmediÄŸi iÃ§in planning modunda yanÄ±t veriyor. Konu: ${session.topic}`;
      outputType = 'planning';
    }
  } catch (error) {
    content = `Hata: ${currentParticipant} Ã§alÄ±ÅŸtÄ±rÄ±lÄ±rken bir sorun oluÅŸtu.`;
    console.error(error);
    success = false;
    outputType = 'error';
  }

  const msg: LabMessage = {
    id: messageId,
    sessionId: id,
    model: currentParticipant,
    content,
    outputType,
    imageUrl,
    imagePath,
    prompt: imagePrompt,
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
 * Oturumu kontrollÃ¼ bir dÃ¶ngÃ¼de Ã§alÄ±ÅŸtÄ±rÄ±r.
 * Next.js API limitleri dahilinde bir seferde birkaÃ§ adÄ±m ilerler.
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
    messages.push(msg);

    // KÃ¼Ã§Ã¼k bir bekleme (opsiyonel)
    await new Promise(r => setTimeout(r, 1000));
  }

  return messages;
}
