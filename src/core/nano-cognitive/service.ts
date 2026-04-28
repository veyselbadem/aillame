
import {
  NanoTaskType,
  NanoToolTarget,
  NanoCognitivePlan,
  NanoReflection,
  NanoLearningSuggestion
} from './types';

/**
 * Nano Cognitive Layer Service
 * Nano'nun "Atom KarÄ±nca" gÃ¶rev zekasÄ±nÄ± yÃ¶neten merkez modÃ¼l.
 */

export function classifyTask(prompt: string): NanoCognitivePlan {
  const p = prompt.toLowerCase().trim();

  // 1. Social Chat & Dialogue Continuation
  if (
    matchesPhrase(p, [
      'selam', 'merhaba', 'nasÄ±lsÄ±n', 'adÄ±n ne', 'kimsin', 'teÅŸekkÃ¼r', 'bay bay', 'gÃ¶rÃ¼ÅŸÃ¼rÃ¼z',
      'iyiyim', 'bende iyiyim', 'ben de iyiyim', 'iyi', 'fena deÄŸil', 'idare eder',
      'tamam', 'peki', 'anladÄ±m', 'olur', 'evet', 'hayÄ±r', 'gÃ¼zel', 'harika',
      'devam et', 'baÅŸla', 'dur', 'tekrar dene',
      'detaylandÄ±r', 'biraz aÃ§', 'aÃ§Ä±kla', 'kÄ±saca'
    ]) || p.length < 5
  ) {
    return {
      taskType: 'social_chat',
      toolTarget: 'QuickResponse',
      confidenceScore: 0.95,
      reason: 'User is engaging in social conversation or providing a short dialogue continuation.'
    };
  }

  // 2. Image Generation
  if (p.includes('resim oluÅŸtur') || p.includes('Ã§iz') || p.includes('gÃ¶rsel Ã¼ret') || p.includes('logo tasarla')) {
    return {
      taskType: 'image_generation',
      toolTarget: 'SDXL',
      confidenceScore: 0.9,
      reason: 'User requested image generation.'
    };
  }

  // 1.5 Image Analysis
  if (p.includes('resmi analiz et') || p.includes('bu gÃ¶rseli incele') || p.includes('resme bak')) {
    return {
      taskType: 'image_analysis',
      toolTarget: 'Qwen',
      confidenceScore: 0.9,
      reason: 'User requested image analysis.'
    };
  }

  // 1.6 List Examples
  if (matchesPhrase(p, ['listele', 'Ã¶rnek ver', 'tane Ã¶rnek', 'sÄ±rala', 'maddeler halinde', 'Ã¶rnekler misin', 'tane yaz'])) {
    return {
      taskType: 'list_examples',
      toolTarget: 'GeneralKnowledge',
      confidenceScore: 0.85,
      reason: 'User wants a list or examples.'
    };
  }

  // 1.7 Compare
  if (p.includes('fark nedir') || p.includes('karÅŸÄ±laÅŸtÄ±r') || p.includes('kÄ±yasla') || p.includes('arasÄ±ndaki fark')) {
    return {
      taskType: 'compare',
      toolTarget: 'GeneralKnowledge',
      confidenceScore: 0.85,
      reason: 'User wants a comparison.'
    };
  }

  // 1.8 Explain More
  if (matchesPhrase(p, ['daha aÃ§Ä±kla', 'detaylandÄ±r', 'anlamadÄ±m', 'biraz daha aÃ§', 'ne demek istedin'])) {
    return {
      taskType: 'explain_more',
      toolTarget: 'safeFallback',
      confidenceScore: 0.9,
      reason: 'User needs elaboration.'
    };
  }

  // 1.9 Continue Context
  if (matchesPhrase(p, ['devam et', 'kaldÄ±ÄŸÄ±n yerden', 'sonra', 'baÅŸka'])) {
    return {
      taskType: 'continue_context',
      toolTarget: 'safeFallback',
      confidenceScore: 0.9,
      reason: 'User wants to continue the previous context.'
    };
  }

  // 3. General Knowledge (Prioritize over research/code for specific "nedir" terms)
  if (isGeneralKnowledge(p)) {
    return {
      taskType: 'general_knowledge',
      toolTarget: 'GeneralKnowledge',
      confidenceScore: 0.9,
      reason: 'Question matches known general knowledge base.'
    };
  }

  // 4. Current Research
  if (p.includes('gÃ¼ncel') || p.includes('haber') || p.includes('son dakika') || p.includes('araÅŸtÄ±r') || p.includes('bugÃ¼nkÃ¼')) {
    return {
      taskType: 'current_research',
      toolTarget: 'Web Search',
      confidenceScore: 0.85,
      reason: 'User requested real-time information.'
    };
  }

  // 5. Code Help
  if (p.includes('kod') || p.includes('yazÄ±lÄ±m') || p.includes('javascript') || p.includes('python') || p.includes('hata')) {
    return {
      taskType: 'code_help',
      toolTarget: 'Qwen',
      confidenceScore: 0.8,
      reason: 'User requested programming assistance.'
    };
  }

  // Default
  return {
    taskType: 'unknown',
    toolTarget: 'safeFallback',
    confidenceScore: 0.5,
    reason: 'Task type could not be confidently determined.'
  };
}

function matchesPhrase(prompt: string, phrases: string[]): boolean {
  return phrases.some((phrase) => {
    if (phrase.includes(' ')) {
        return prompt.includes(phrase);
    }
    // Kelime bazlÄ± eÅŸleÅŸme iÃ§in boÅŸluk kontrolÃ¼ (opsiyonel ama daha gÃ¼venli)
    return prompt === phrase || prompt.includes(` ${phrase} `) || prompt.startsWith(`${phrase} `) || prompt.endsWith(` ${phrase}`);
  });
}

function isGeneralKnowledge(p: string): boolean {
  const base = [
    'ekonomi nedir', 'yapay zeka nedir', 'javascript nedir',
    'psikoloji nedir', 'hukuk nedir', 'enflasyon nedir',
    'arz ve talep nedir', 'api nedir', 'algoritma nedir', 'web sitesi nedir'
  ];
  return base.some(b => p.includes(b));
}

export function getQuickResponse(prompt: string, history: { role: string, content: string }[] = []): string | null {
  const p = prompt.trim().toLowerCase();
  if (!p) return null;

  const lastAssistantMsg = [...history].reverse().find(m => m.role === 'assistant')?.content.toLowerCase() || '';

  // Greet
  if (matchesPhrase(p, ['selam', 'selamlar', 'slm'])) {
    return 'Selam! Sana nasÄ±l yardÄ±mcÄ± olabilirim?';
  }
  if (matchesPhrase(p, ['merhaba', 'merhabalar', 'mrb'])) {
    return 'Merhaba! Ben Aillame Nano. Size nasÄ±l yardÄ±mcÄ± olabilirim?';
  }

  // Status Check (NasÄ±lsÄ±n?)
  if (matchesPhrase(p, ['nasÄ±lsÄ±n', 'nasilsin', 'ne haber'])) {
    return 'Ä°yiyim, teÅŸekkÃ¼r ederim. Siz nasÄ±lsÄ±nÄ±z?';
  }

  // Status Response (Bende iyiyim)
  if (matchesPhrase(p, ['iyiyim', 'bende iyiyim', 'ben de iyiyim', 'iyi', 'fena deÄŸil', 'idare eder'])) {
    if (lastAssistantMsg.includes('nasÄ±lsÄ±n')) {
        return 'Buna Ã§ok sevindim! ğŸ˜Š Size bugÃ¼n nasÄ±l yardÄ±mcÄ± olabilirim?';
    }
    return 'Buna sevindim. Size bugÃ¼n hangi konuda destek olabilirim?';
  }

  // Identity
  if (matchesPhrase(p, ['adÄ±n ne', 'senin adÄ±n ne'])) {
    return 'Benim adÄ±m Aillame Nano. Aillame sisteminin ana sohbet asistanÄ±yÄ±m.';
  }
  if (matchesPhrase(p, ['kimsin', 'sen kimsin', 'peki sen kimsin', 'kendini tanÄ±t'])) {
    return 'Ben Aillame Nano. SorularÄ±nÄ± yanÄ±tlamak ve gerektiÄŸinde Aillameâ€™nin diÄŸer modÃ¼llerine yÃ¶nlendirmek iÃ§in buradayÄ±m.';
  }

  // Gratitude
  if (matchesPhrase(p, ['teÅŸekkÃ¼rler', 'teÅŸekkÃ¼r ederim', 'saÄŸ ol', 'saÄŸol'])) {
    return 'Rica ederim. YardÄ±mcÄ± olabildiysem ne mutlu. BaÅŸka bir isteÄŸiniz var mÄ±?';
  }

  // Confirmation / Agreement
  if (matchesPhrase(p, ['tamam', 'peki', 'anladÄ±m', 'olur', 'evet', 'gÃ¼zel', 'harika'])) {
    return 'TamamdÄ±r, anladÄ±m. Devam edelim, yapmak istediÄŸiniz baÅŸka bir ÅŸey var mÄ±?';
  }
  if (matchesPhrase(p, ['hayÄ±r', 'istemiyorum', 'kalsÄ±n'])) {
    return 'Tamam, anlaÅŸÄ±ldÄ±. Yeni bir ÅŸey sormak isterseniz buradayÄ±m.';
  }

  // Flow Commands
  if (matchesPhrase(p, ['devam et', 'baÅŸla'])) {
    return 'Tamam, devam ediyorum. LÃ¼tfen kaldÄ±ÄŸÄ±nÄ±z noktadan ilerlemem iÃ§in bir detay verin.';
  }
  if (matchesPhrase(p, ['dur', 'bekle', 'durdur'])) {
    return 'Tamam, durdurdum. HazÄ±r olduÄŸunuzda devam edebiliriz.';
  }
  if (matchesPhrase(p, ['tekrar dene', 'yeniden dene'])) {
    return 'Tabii, hemen tekrar deniyorum. LÃ¼tfen bekleyin.';
  }

  // Elaboration Requests
  if (matchesPhrase(p, ['detaylandÄ±r', 'biraz aÃ§', 'aÃ§Ä±kla', 'daha fazla bilgi'])) {
    return 'Elbette, bu konuyu biraz daha detaylandÄ±rabilirim. Hangi kÄ±sÄ±mla ilgileniyorsunuz?';
  }
  if (matchesPhrase(p, ['kÄ±saca', 'Ã¶zetle', 'daha kÄ±sa anlat'])) {
    return 'Tabii, Ã¶zetleyeyim. Ä°ÅŸte en Ã¶nemli noktalar:';
  }

  // Goodbye
  if (matchesPhrase(p, ['gÃ¼le gÃ¼le', 'hoÅŸÃ§a kal', 'bay bay', 'gÃ¶rÃ¼ÅŸÃ¼rÃ¼z'])) {
    return 'GÃ¶rÃ¼ÅŸmek Ã¼zere! Kendinize iyi bakÄ±n.';
  }

  return null;
}

export function getGeneralKnowledgeResponse(prompt: string): string | null {
  const p = prompt.trim().toLowerCase();

  if (p.includes('ekonomi nedir')) return 'Ekonomi, kaynaklarÄ±n sÄ±nÄ±rlÄ± olduÄŸu bir ortamda insanlarÄ±n ihtiyaÃ§larÄ±nÄ± karÅŸÄ±lamak iÃ§in Ã¼retilen mal ve hizmetlerin daÄŸÄ±tÄ±mÄ± ile ilgilenen bir bilim dalÄ±dÄ±r.';
  if (p.includes('yapay zeka nedir')) return 'Yapay zeka, bilgisayarlarÄ±n insan benzeri dÃ¼ÅŸÃ¼nme, Ã¶ÄŸrenme ve problem Ã§Ã¶zme yetenekleri gÃ¶stermesini saÄŸlayan bir teknoloji alanÄ±dÄ±r.';
  if (p.includes('javascript nedir')) return 'JavaScript, web sayfalarÄ±na etkileÅŸim ve dinamik davranÄ±ÅŸ kazandÄ±rmak iÃ§in kullanÄ±lan bir programlama dilidir.';
  if (p.includes('psikoloji nedir')) return 'Psikoloji, insan davranÄ±ÅŸlarÄ±nÄ± ve zihinsel sÃ¼reÃ§leri inceleyen bir bilim dalÄ±dÄ±r.';
  if (p.includes('hukuk nedir')) return 'Hukuk, toplumda dÃ¼zeni saÄŸlamak iÃ§in kurallar koyan ve bunlarÄ± uygulayan sistemler bÃ¼tÃ¼nÃ¼dÃ¼r.';
  if (p.includes('enflasyon nedir')) return 'Enflasyon, fiyatlarÄ±n genel olarak yÃ¼kselmesi ve paranÄ±n satÄ±n alma gÃ¼cÃ¼nÃ¼n azalmasÄ±dÄ±r.';
  if (p.includes('arz ve talep nedir')) return 'Arz ve talep, bir pazarda satÄ±cÄ±larÄ±n sunduÄŸu miktar ile alÄ±cÄ±larÄ±n talep ettiÄŸi miktar arasÄ±ndaki iliÅŸkiyi aÃ§Ä±klar.';
  if (p.includes('api nedir')) return 'API, farklÄ± yazÄ±lÄ±mlarÄ±n birbirleriyle gÃ¼venli ve standart bir ÅŸekilde iletiÅŸim kurmasÄ±nÄ± saÄŸlayan arayÃ¼zdÃ¼r.';
  if (p.includes('algoritma nedir')) return 'Algoritma, belirli bir problemi Ã§Ã¶zmek iÃ§in izlenen adÄ±m adÄ±m talimatlar dizisidir.';
  if (p.includes('web sitesi nedir')) return 'Web sitesi, internet Ã¼zerinde yayÄ±nlanan ve ziyaretÃ§ilere bilgi ve iÃ§erik sunan dijital sayfalar bÃ¼tÃ¼nÃ¼dÃ¼r.';

  return null;
}

function isErrorMessage(text: string, outputType?: string): boolean {
  if (outputType === 'error' || outputType === 'planning' || outputType === 'degraded' || outputType === 'skipped') return true;
  const lowerText = text.toLowerCase();
  const errorKeywords = [
    'analiz hatasÄ±', 'hata', 'fetch failed', 'sunucu aÃ§Ä±k mÄ±',
    'henÃ¼z kurulu olmayabilir', 'gguf', 'degraded', 'skipped',
    'timeout', 'timed out', 'zaman aÅŸÄ±mÄ±', 'zaman aÅŸÄ±mÄ±na',
    'yanÄ±t veremedi', 'Ã§alÄ±ÅŸtÄ±rÄ±lamadÄ±', 'server kapalÄ±',
    'connection refused', 'econnrefused'
  ];
  return errorKeywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Nano'nun AI Lab'deki turn'Ã¼nÃ¼ yÃ¶netir.
 * Gelen mesajlarÄ± analiz eder ve yorum yapar.
 */
function countWebSources(text: string): number {
  const verifiedSection = text.match(/Verified Sources:\s*([\s\S]+)/i);
  if (verifiedSection) {
    const verifiedRefs = verifiedSection[1].match(/\[?\d+\]?\.?/g) || [];
    return new Set(verifiedRefs.map((ref) => ref.replace(/\D/g, '')).filter(Boolean)).size;
  }
  const sourceMatches = text.match(/\[\d+\]/g) || [];
  return new Set(sourceMatches).size;
}

function chooseAvailableNextStep(activeParticipants: Set<string>, goal?: string, webSearchDone = false): string {
  if (activeParticipants.has('gemma')) return 'Gemma: Hızlı sentez üret.';
  if (activeParticipants.has('ollama')) return 'Ollama: Hızlı sentez üret.';
  if (activeParticipants.has('qwen')) return 'Qwen: Derin analiz yap; ağır model olduğu için tek deneme yeterli.';
  if (goal === 'image_generation_plan' && activeParticipants.has('sdxl')) return 'SDXL: Görsel üretim planını uygula.';
  if (activeParticipants.has('web_search') && !webSearchDone) return 'Web Search: Kaynakları bir kez topla.';
  return 'Nano: Final summary üret ve oturumu tamamla.';
}

function isValidCandidateText(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length < 40) return false;
  if (isErrorMessage(trimmed)) return false;
  if (looksMalformedNanoText(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  if (lower.includes('tartışma sağlıklı ilerliyor') || lower.includes('son katılımcı')) return false;
  return true;
}

/**
 * Nano'nun AI Lab'deki turn'ünü yönetir.
 * Gelen mesajları analiz eder ve yalnızca seçili katılımcılara göre öneri üretir.
 */
export async function reflectOnLabStep(
  topic: string,
  lastMessages: { model: string, content: string, type?: string, outputType?: string }[],
  goal?: string,
  activeParticipants: string[] = []
): Promise<NanoReflection> {
  const lastMsg = lastMessages[lastMessages.length - 1];
  const participants = new Set(activeParticipants);
  const webSearchDone = lastMessages.some((message) => message.model === 'web_search' || message.outputType === 'research' || message.type === 'research');
  const hasGemma = participants.has('gemma');
  const hasOllama = participants.has('ollama');
  const hasQwen = participants.has('qwen');
  const hasSdxl = participants.has('sdxl') && goal === 'image_generation_plan';

  if (!lastMsg || lastMsg.model === 'system') {
    const t = topic.toLowerCase();
    let summary = `Konu '${topic}'. `;
    let nextStep = chooseAvailableNextStep(participants, goal, webSearchDone);

    if (t.includes('listele') || t.includes('örnek') || t.includes('tane') || t.includes('madde') || t.includes('sırala')) {
      summary += 'Kullanıcı listeleme veya örnek istiyor; kısa, doğrudan ve maddeli cevap hedeflenmeli.';
    } else if (t.includes('karşılaştır') || t.includes('fark')) {
      summary += 'Kullanıcı karşılaştırma istiyor; benzerlikler ve farklar ayrılmalı.';
    } else if (t.includes('araştır') || t.includes('haber') || t.includes('güncel')) {
      summary += webSearchDone ? 'Web Search zaten çalışmış; tekrar arama önermiyorum.' : 'Güncel araştırma isteği var; Web Search seçiliyse bir kez kaynak toplanmalı.';
    } else if (t.includes('resim') || t.includes('çiz') || t.includes('görsel')) {
      summary += 'Görsel üretim isteği algılandı.';
      nextStep = hasSdxl ? 'SDXL: Görsel üretim planını uygula.' : 'Nano: SDXL seçili değil; metin tabanlı görsel planla.';
    } else {
      summary += 'Önce kısa bir tanım ve kalite kontrol çerçevesi kurulmalı.';
    }

    return { summary, nextStep };
  }

  const safeContent = lastMsg.content || '';

  if (isErrorMessage(safeContent, lastMsg.type || lastMsg.outputType)) {
    return {
      summary: `${lastMsg.model} çıktısı hata/degraded/planning olarak işaretlendi; bu başarılı analiz sayılmayacak.`,
      suggestion: 'Bu çıktıdan eğitim adayı üretilmeyecek. Nano mevcut güvenli bilgilerle final summary üretmeli.',
      nextStep: 'Nano: Final summary üret ve oturumu tamamla.',
    };
  }

  if (lastMsg.model === 'web_search' || lastMsg.type === 'research' || lastMsg.outputType === 'research') {
    if (safeContent.includes('sonuç bulunamadı')) {
      return {
        summary: 'Web araması sonuç getirmedi.',
        suggestion: 'Aynı oturumda otomatik tekrar arama yapmadan yerel bilgiyle tamamlamak daha güvenli.',
        nextStep: chooseAvailableNextStep(participants, goal, true),
      };
    }

    const sourceCount = countWebSources(safeContent);
    const snippets = safeContent.split('\n').filter(line => /\[\d+\]/.test(line)).join(' ');
    const preview = snippets.substring(0, 220).replace(/\[\d+\]/g, '').trim() || safeContent.substring(0, 220).trim();
    const nextStep = hasGemma
      ? 'Gemma: Kaynakları hızlı sentezle.'
      : hasOllama
        ? 'Ollama: Kaynakları hızlı sentezle.'
        : hasQwen
          ? 'Qwen: Kaynakları derin analiz et; ağır model olduğu için tek deneme yeterli.'
          : 'Nano: Kaynaklardan final özet çıkar.';

    return {
      summary: `Web Search ${sourceCount || 0} kaynak getirdi. Ortak içerik özeti: ${preview}...`,
      suggestion: 'Web Search bu oturumda tamamlandı; tekrar arama önerilmiyor.',
      nextStep,
    };
  }

  if (lastMsg.model === 'qwen') {
    const reflection: NanoReflection = {
      summary: 'Qwen derin analiz katkısı sundu.',
      suggestion: 'Qwen ağır model olduğu için bu oturumda tekrar denenmemeli; final kalite kontrol yeterli.',
      nextStep: hasSdxl ? 'SDXL: Görsel üretim planını uygula.' : 'Nano: Final summary üret.',
    };

    if (isValidCandidateText(safeContent) && goal === 'create_learning_candidate') {
      reflection.learningCandidate = {
        instruction: `${topic} konusunu açıkla.`,
        output: safeContent.substring(0, 800),
        topic,
        mode: 'educational',
        confidenceScore: 0.85,
        riskLevel: 'low',
        reason: 'Qwen analizi temiz ve düşük riskli görünüyor.',
        source: 'qwen',
      };
    }
    return reflection;
  }

  if (lastMsg.model === 'gemma' || lastMsg.model === 'ollama') {
    const providerName = lastMsg.model === 'gemma' ? 'Gemma' : 'Ollama';
    const preview = safeContent.substring(0, 220).trim();
    const reflection: NanoReflection = {
      summary: `${providerName} hızlı sentez üretti: ${preview}...`,
      suggestion: 'Çıktı başarılıysa Nano final kalite kontrolüne geçebilir.',
      nextStep: hasQwen ? 'Qwen: Seçiliyse tek tur derin analiz yap.' : 'Nano: Final summary üret.',
    };

    if (isValidCandidateText(safeContent) && goal === 'create_learning_candidate') {
      reflection.learningCandidate = {
        instruction: `${topic} nedir?`,
        output: safeContent.substring(0, 800),
        topic,
        mode: 'educational',
        confidenceScore: 0.88,
        riskLevel: 'low',
        reason: `${providerName} sentezi kısa, temiz ve düşük riskli.`,
        source: webSearchDone && lastMsg.model === 'gemma' ? 'web_search+gemma' : webSearchDone ? 'web_search+ollama' : lastMsg.model,
      };
    }
    return reflection;
  }

  if (lastMsg.model === 'sdxl' || lastMsg.type === 'image') {
    return {
      summary: 'SDXL görsel üretim/planning adımını tamamladı.',
      suggestion: 'Görsel çıktılar metin eğitim adayına dönüştürülmeyecek; Nano final summary yeterli.',
      nextStep: 'Nano: Final summary üret.',
    };
  }

  return {
    summary: `${lastMsg.model} bir katkı sundu; Nano bunu final kalite kontrolle toparlamalı.`,
    suggestion: 'Boş kalıp cevap yerine oturumu mevcut kanıtlarla kapatıyorum.',
    nextStep: chooseAvailableNextStep(participants, goal, webSearchDone),
  };
}
export function looksMalformedNanoText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 1) return true;

  const lowerText = trimmed.toLowerCase();
  if (lowerText.includes('iÅŸlem durduruldu') || lowerText.includes('islem durduruldu')) return true;
  if (lowerText.includes('pro modunu deneyin') || lowerText.includes('pro modu')) return true;
  if (lowerText.includes('yerel model') || lowerText.includes('hazÄ±r deÄŸil')) return true;
  if (lowerText.includes('[web search]') || lowerText.includes('json') || trimmed.startsWith('{') || trimmed.startsWith('[')) return true;

  const replacementCount = (trimmed.match(/\ufffd/g) || []).length;
  if (replacementCount > 0) return true;

  const visible = trimmed.replace(/\s/g, '').length || 1;
  const letters = (trimmed.match(/[a-zA-ZÄŸÃ¼ÅŸÃ¶Ã§Ä±Ä°ÄÃœÅÃ–Ã‡0-9]/g) || []).length;
  // KÄ±sa ama geÃ§erli cevaplara izin ver (Ã¶rneÄŸin "Tamam.")
  if (trimmed.length > 2 && letters / visible < 0.25) return true;

  const punctuationCount = (trimmed.match(/[\W_]/g) || []).length;
  if (trimmed.length > 10 && punctuationCount / visible > 0.4) return true;

  return false;
}

export function safeFallback(prompt: string, history: { role: string, content: string }[] = []): string {
  const quick = getQuickResponse(prompt, history);
  if (quick) return quick;

  const p = prompt.toLowerCase().trim();
  if (p.length < 3) return 'AnladÄ±m. Size nasÄ±l yardÄ±mcÄ± olabilirim?';

  return 'Aillame Nano bu konuda tam olarak ne demek istediÄŸinizi anlayamadÄ±. LÃ¼tfen biraz daha detay verir misiniz veya farklÄ± bir soru sorun?';
}
