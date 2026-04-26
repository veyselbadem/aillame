import { LabSession, CreateSessionInput, LabMessage, LabParticipant } from './types';
import { loadSessions, saveSessions } from './store-json';
import { webSearch } from '../research/search';
import { generateProMultimodalResponse } from '../inference/pro-multimodal';
import { generateImageWithSdxl } from '../image-generation/sdxl';

export async function createSession(input: CreateSessionInput): Promise<LabSession> {
  const sessions = await loadSessions();
  const newSession: LabSession = {
    id: `lab_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    topic: input.topic,
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
    content: `AI Lab session started on topic: "${newSession.topic}". Participants: ${newSession.participants.join(', ')}.`,
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

/**
 * Oturumun sıradaki adımını (turn) çalıştırır.
 */
export async function executeNextStep(id: string): Promise<LabMessage> {
  const sessions = await loadSessions();
  const session = sessions.find(s => s.id === id);
  if (!session) throw new Error('Session not found');
  if (session.status !== 'running') throw new Error('Session is not running');
  if (session.currentTurn >= session.maxTurns) throw new Error('Session completed');

  // Sıradaki katılımcıyı bul (Round-robin)
  const activeParticipants = session.participants.filter(p => p !== 'system');
  const participantIdx = session.currentTurn % activeParticipants.length;
  const currentParticipant = activeParticipants[participantIdx];

  let content = '';
  let sourceUrls: string[] = [];
  let citations: string[] = [];
  let outputType: LabMessage['outputType'] = 'text';
  let imageUrl: string | undefined;
  let imagePath: string | undefined;
  let imagePrompt: string | undefined;
  let success = true;

  try {
    if (currentParticipant === 'web_search') {
      outputType = 'research';
      const results = await webSearch(session.topic);
      if (results && results.length > 0) {
        content = `Konu hakkında araştırma yapıldı: "${session.topic}".\n\nBulunan Özet Bilgi:\n`;
        results.forEach((s, i) => {
          content += `\n[${i + 1}] ${s.title}: ${s.snippet}`;
          sourceUrls.push(s.url);
          citations.push(`[${i + 1}] ${s.title} (${s.url})`);
        });
        content += `\n\nAraştırma tamamlandı. ${results.length} kaynak incelendi.`;
      } else {
        content = `"${session.topic}" için web araması yapıldı fakat sonuç bulunamadı.`;
      }
    } else if (currentParticipant === 'qwen') {
      outputType = 'text';
      const isConfigured = !!process.env.AILLAME_PYTHON;
      if (isConfigured) {
        const lastMsgs = session.messages.slice(-3).map(m => `${m.model}: ${m.content}`).join('\n');
        const qwenPrompt = `Sen AI Lab katılımcısısın. Konu: "${session.topic}". Önceki tartışma:\n${lastMsgs}\n\nLütfen konuyu teknik ve analitik açıdan değerlendir. Kısa ve öz cevap ver.`;
        
        try {
          content = await generateProMultimodalResponse({
            prompt: qwenPrompt,
            maxTokens: 300,
            temperature: 0.7
          });
        } catch (err) {
          content = `Qwen Execution Hatası: Model veya çalışma zamanı hazır değil. Fallback planına geçiliyor.`;
          success = false;
        }
      } else {
        content = `Qwen (Pro Model): Qwen çalışma zamanı (AILLAME_PYTHON) yapılandırılmadığı için şu an planlama modunda yanıt veriyor. Konu: ${session.topic}`;
        outputType = 'planning';
      }
    } else if (currentParticipant === 'sdxl') {
      outputType = 'image';
      const isConfigured = !!process.env.AILLAME_PYTHON;
      if (isConfigured) {
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
          success = false;
          outputType = 'planning';
        }
      } else {
        content = `SDXL (Image Model): SDXL çalışma zamanı yapılandırılmadığı için şu an planlama modunda yanıt veriyor. Konu: ${session.topic}`;
        outputType = 'planning';
      }
    } else if (currentParticipant === 'nano') {
      content = `Aillame Nano: "${session.topic}" konusunu analiz ediyorum. Mevcut bilgilerimle konunun stratejik önemini değerlendiriyorum. (Local Inference Mode)`;
    } else {
      content = `${currentParticipant.toUpperCase()} (Planned Model): Bu model henüz tam entegre edilmediği için planning modunda yanıt veriyor. Konu: ${session.topic}`;
      outputType = 'planning';
    }
  } catch (error) {
    content = `Hata: ${currentParticipant} çalıştırılırken bir sorun oluştu.`;
    console.error(error);
    success = false;
  }

  const msg: LabMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
    sessionId: id,
    model: currentParticipant,
    content,
    outputType,
    imageUrl,
    imagePath,
    prompt: imagePrompt,
    sourceUrls: sourceUrls.length > 0 ? sourceUrls : undefined,
    citations: citations.length > 0 ? citations : undefined,
    createdAt: Date.now(),
  };

  session.messages.push(msg);
  session.currentTurn += 1;
  session.lastRunAt = Date.now();
  session.updatedAt = Date.now();

  if (!success) {
    session.errorCount += 1;
    if (session.errorCount >= session.maxErrors) {
      session.status = 'failed';
    }
  }

  if (session.currentTurn >= session.maxTurns) {
    session.status = 'completed';
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
    messages.push(msg);
    
    // Küçük bir bekleme (opsiyonel)
    await new Promise(r => setTimeout(r, 1000));
  }

  return messages;
}
