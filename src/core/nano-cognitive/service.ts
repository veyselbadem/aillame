
import {
  NanoTaskType,
  NanoToolTarget,
  NanoCognitivePlan,
  NanoReflection,
  NanoLearningSuggestion
} from './types';
import {
  buildConversationAnswer,
  detectUserIntent,
  normalizeAssistantAnswer,
} from '../conversation/conversation-quality';
import {
  buildIntentAwareNanoAnswer,
  buildNanoInitialReflection,
  buildNanoProviderSuccessReflection,
  buildNanoWebSearchReflection,
  buildProviderFailureComment,
  enrichNanoAnswer,
  getGeneralKnowledgeResponse,
} from './nano-response-builder';

export { getGeneralKnowledgeResponse };

/**
 * Nano Cognitive Layer Service
 * Nano'nun "Atom Karınca" görev zekasını yöneten merkez modül.
 */

export function classifyTask(prompt: string): NanoCognitivePlan {
  const p = prompt.toLowerCase().trim();

  // [NANO-F2] Skor tabanlı görev ağırlık katmanı
  const taskScore = { // [NANO-F2]
    complexity: 0, // [NANO-F2]
    research: 0, // [NANO-F2]
    code: 0, // [NANO-F2]
    creative: 0, // [NANO-F2]
  }; // [NANO-F2]
  if (p.length > 200) taskScore.complexity += 1; // [NANO-F2]
  if (p.length > 500) taskScore.complexity += 1; // [NANO-F2]
  if ((p.match(/\?/g) || []).length > 2) taskScore.research += 1; // [NANO-F2]
  if (/```|function|const |import |class |def |örnek/i.test(p)) taskScore.code += 2; // [NANO-F2]
  if (/yaz|oluştur|üret|hikaye|şiir|makale/i.test(p)) taskScore.creative += 1; // [NANO-F2]
  if (/araştır|kaynak|neden|nasıl çalışır|açıkla|karşılaştır|fark|nedir/i.test(p)) taskScore.research += 2; // [NANO-F2]
  // Yüksek complexity → Pro katmanına devret
  const shouldEscalate = taskScore.complexity >= 2 || taskScore.code >= 2 || taskScore.research >= 2; // [NANO-F2]

  // 1. Social Chat & Dialogue Continuation
  if (
    matchesPhrase(p, [
      'selam', 'merhaba', 'nasılsın', 'adın ne', 'kimsin', 'teşekkür', 'bay bay', 'görüşürüz',
      'iyiyim', 'bende iyiyim', 'ben de iyiyim', 'iyi', 'fena değil', 'idare eder',
      'tamam', 'peki', 'anladım', 'olur', 'evet', 'hayır', 'güzel', 'harika',
      'devam et', 'başla', 'dur', 'tekrar dene',
      'detaylandır', 'biraz aç', 'açıkla', 'kısaca'
    ]) || p.length < 5
  ) {
    return {
      taskType: 'social_chat',
      toolTarget: 'QuickResponse',
      confidenceScore: 0.95,
      reason: 'User is engaging in social conversation or providing a short dialogue continuation.',
      taskScore
    };
  }

  // 2. Image Generation
  const imageKeywords = ['resim', 'görsel', 'fotoğraf', 'illüstrasyon', 'logo', 'ikon', 'papatya', 'kedi', 'manzara', 'doğa', 'gün batımı', 'ai logosu'];
  const actionKeywords = ['oluştur', 'yap', 'üret', 'çiz', 'tasarla', 'hazırla'];
  
  const hasImageTopic = imageKeywords.some(k => p.includes(k));
  const hasAction = actionKeywords.some(k => p.includes(k));

  if (hasImageTopic && hasAction) {
    return {
      taskType: 'image_generation',
      toolTarget: 'SDXL',
      confidenceScore: 0.95,
      reason: 'User requested image generation with clear topic and action.',
      taskScore
    };
  }

  // 1.5 Image Analysis
  if (p.includes('resmi analiz et') || p.includes('bu görseli incele') || p.includes('resme bak')) {
    return {
      taskType: 'image_analysis',
      toolTarget: 'Qwen',
      confidenceScore: 0.9,
      reason: 'User requested image analysis.',
      taskScore
    };
  }

  // 1.6 List Examples
  if (matchesPhrase(p, ['listele', 'örnek ver', 'tane örnek', 'sırala', 'maddeler halinde', 'örnekler misin', 'tane yaz'])) {
    return {
      taskType: 'list_examples',
      toolTarget: 'GeneralKnowledge',
      confidenceScore: 0.85,
      reason: 'User wants a list or examples.',
      taskScore
    };
  }

  // 1.7 Compare
  if (p.includes('fark nedir') || p.includes('karşılaştır') || p.includes('kıyasla') || p.includes('arasındaki fark')) {
    return {
      taskType: 'compare',
      toolTarget: 'GeneralKnowledge',
      confidenceScore: 0.85,
      reason: 'User wants a comparison.',
      taskScore
    };
  }

  // 1.8 Explain More
  if (matchesPhrase(p, ['daha açıkla', 'detaylandır', 'anlamadım', 'biraz daha aç', 'ne demek istedin'])) {
    return {
      taskType: 'explain_more',
      toolTarget: 'safeFallback',
      confidenceScore: 0.9,
      reason: 'User wants more elaboration.',
      taskScore
    };
  }

  // 1.9 Continue Context
  if (matchesPhrase(p, ['devam et', 'kaldığın yerden', 'sonra', 'başka'])) {
    return {
      taskType: 'continue_context',
      toolTarget: 'safeFallback',
      confidenceScore: 0.9,
      reason: 'User wants to continue or expand.',
      taskScore
    };
  }

  // 3. General Knowledge (Prioritize over research/code for specific "nedir" terms)
  if (isGeneralKnowledge(p)) {
    return {
      taskType: 'general_knowledge',
      toolTarget: 'GeneralKnowledge',
      confidenceScore: 0.9,
      reason: 'Question about current events or research.',
      taskScore
    };
  }

  // 4. Current Research
  if (p.includes('güncel') || p.includes('haber') || p.includes('son dakika') || p.includes('araştır') || p.includes('bugünkü')) {
    return {
      taskType: 'current_research',
      toolTarget: 'Web Search',
      confidenceScore: 0.85,
      reason: 'User requested real-time information.'
    };
  }

  // 5. Code Help
  if (
    shouldEscalate ||
    p.includes('kod') ||
    p.includes('yazılım') ||
    p.includes('hata') ||
    p.includes('error') ||
    p.includes('cannot read') ||
    p.includes('typeerror') ||
    ((p.includes('javascript') || p.includes('typescript') || p.includes('python') || p.includes('react') || p.includes('fonksiyon')) &&
      (p.includes('yaz') || p.includes('yap') || p.includes('oluştur') || p.includes('düzelt') || p.includes('örnek') || p.includes('cannot read')))
  ) { // [NANO-F2]
    return {
      taskType: 'code_help',
      toolTarget: 'Qwen',
      confidenceScore: 0.8,
      reason: shouldEscalate ? 'Task complexity or code patterns require Pro escalation.' : 'User requested programming assistance.',
      taskScore
    };
  }

  // Default
  return {
    taskType: 'unknown',
    toolTarget: 'safeFallback',
    confidenceScore: 0.5,
    reason: 'Task type could not be confidently determined.',
    taskScore
  };
}

function matchesPhrase(prompt: string, phrases: string[]): boolean {
  return phrases.some((phrase) => {
    if (phrase.includes(' ')) {
        return prompt.includes(phrase);
    }
    // Kelime bazlı eşleşme için boşluk kontrolü (opsiyonel ama daha güvenli)
    return prompt === phrase || prompt.includes(` ${phrase} `) || prompt.startsWith(`${phrase} `) || prompt.endsWith(` ${phrase}`);
  });
}

function isGeneralKnowledge(p: string): boolean {
  const genericPatterns = [
    'nedir', 'nelerdir', 'hakkında bilgi', 'anlatır mısın', 'açıklar mısın', 'kimdir', 'hangisidir', 
    'nasıl oluşur', 'ne zaman kuruldu', 'nerededir', 'ne demek', 'nedir bu rust'
  ];
  
  const isQuestion = p.endsWith('?') || genericPatterns.some(pattern => p.includes(pattern)) || p === 'rust';
  
  // Exclude explicit task/code creation
  const isExclusion = matchesPhrase(p, [
    'yaz', 'yap', 'oluştur', 'çiz', 'tasarla', 'kodla', 'düzelt', 'hata', 'error', 'cannot read', 'çalışmıyor'
  ]);

  const isImage = matchesPhrase(p, ['görsel', 'resim', 'fotoğraf']) || (matchesPhrase(p, ['üret', 'çiz']) && matchesPhrase(p, ['logo', 'papatya', 'kedi', 'manzara', 'doğa']));
  if (isExclusion && !(isImage && !p.includes('kod'))) return false;
  
  const specificGk = [
    'ekonomi', 'yapay zeka', 'javascript', 'html', 'css', 'react', 'psikoloji', 'hukuk', 'enflasyon',
    'arz ve talep', 'api', 'algoritma', 'web sitesi', 'evren', 'yıldız', 'güneş sistemi',
    'fotosentez', 'osmanlı', 'türkiye', 'bilim', 'tarih', 'rust'
  ];

  return isQuestion || specificGk.some(s => p.includes(s));
}

export function getQuickResponse(prompt: string, history: { role: string, content: string }[] = []): string | null {
  const p = prompt.trim().toLowerCase();
  if (!p) return null;

  const lastAssistantMsg = [...history].reverse().find(m => m.role === 'assistant')?.content.toLowerCase() || '';

  // Greet
  if (matchesPhrase(p, ['selam', 'selamlar', 'slm'])) {
    return 'Selam! Sana nasıl yardımcı olabilirim?';
  }
  if (matchesPhrase(p, ['merhaba', 'merhabalar', 'mrb'])) {
    return 'Merhaba! Ben Aillame Nano. Size nasıl yardımcı olabilirim?';
  }

  // Status Check (Nasılsın?)
  if (matchesPhrase(p, ['nasılsın', 'nasilsin', 'ne haber'])) {
    return 'İyiyim, teşekkür ederim. Siz nasılsınız?';
  }

  // Status Response (Bende iyiyim)
  if (matchesPhrase(p, ['iyiyim', 'bende iyiyim', 'ben de iyiyim', 'iyi', 'fena değil', 'idare eder'])) {
    if (lastAssistantMsg.includes('nasılsın')) {
        return 'Buna çok sevindim! Size bugün nasıl yardımcı olabilirim?';
    }
    return 'Buna sevindim. Size bugün hangi konuda destek olabilirim?';
  }

  // Identity
  if (matchesPhrase(p, ['adın ne', 'senin adın ne'])) {
    return 'Benim adım Aillame Nano. Aillame sisteminin ana sohbet asistanıyım.';
  }
  if (matchesPhrase(p, ['kimsin', 'sen kimsin', 'peki sen kimsin', 'kendini tanıt'])) {
    return 'Ben Aillame Nano. Sorularını yanıtlamak ve gerektiğinde Aillame’nin diğer modüllerine yönlendirmek için buradayım.';
  }

  // Gratitude
  if (matchesPhrase(p, ['teşekkürler', 'teşekkür ederim', 'sağ ol', 'sağol'])) {
    return 'Rica ederim. Yardımcı olabildiysem ne mutlu. Başka bir isteğiniz var mı?';
  }

  // Confirmation / Agreement
  if (matchesPhrase(p, ['tamam', 'peki', 'anladım', 'olur', 'evet', 'güzel', 'harika'])) {
    return 'Tamamdır, anladım. Devam edelim, yapmak istediğiniz başka bir şey var mı?';
  }
  if (matchesPhrase(p, ['hayır', 'istemiyorum', 'kalsın'])) {
    return 'Tamam, anlaşıldı. Yeni bir şey sormak isterseniz buradayım.';
  }

  // Flow Commands
  if (matchesPhrase(p, ['devam et', 'başla'])) {
    return 'Tamam, devam ediyorum. Lütfen kaldığınız noktadan ilerlemem için bir detay verin.';
  }
  if (matchesPhrase(p, ['dur', 'bekle', 'durdur'])) {
    return 'Tamam, durdurdum. Hazır olduğunuzda devam edebiliriz.';
  }
  if (matchesPhrase(p, ['tekrar dene', 'yeniden dene'])) {
    return 'Tabii, hemen tekrar deniyorum. Lütfen bekleyin.';
  }

  // Elaboration Requests
  if (matchesPhrase(p, ['detaylandır', 'biraz aç', 'açıkla', 'daha fazla bilgi'])) {
    return 'Elbette, bu konuyu biraz daha detaylandırabilirim. Hangi kısımla ilgileniyorsunuz?';
  }
  if (matchesPhrase(p, ['kısaca', 'özetle', 'daha kısa anlat'])) {
    return 'Tabii, özetleyeyim. İşte en önemli noktalar:';
  }

  // Goodbye
  if (matchesPhrase(p, ['güle güle', 'hoşça kal', 'bay bay', 'görüşürüz'])) {
    return 'Görüşmek üzere! Kendinize iyi bakın.';
  }

  return null;
}

const INSTRUCTIONAL_PLACEHOLDER_PATTERNS = [
  /lütfen\s+özetlenecek/i,
  /özetlenecek\s+(metin|içerik).*(yok|bulunamadı)?/i,
  /lütfen\s+(metni|içeriği|konuyu).*(gönder|paylaş|sağla|ver)/i,
  /(metni|içeriği|konuyu).*(gönderin|paylaşın|sağlayın|verin)/i,
  /yeterli\s+bilgi\s+yok/i,
  /bu\s+konuda\s+bilgi\s+veremem/i,
  /bilgi\s+veremem/i,
  /ek\s+(metin|içerik|bilgi)\s+(gerekli|lazım|gerekiyor)/i,
];

function isInstructionalPlaceholder(text: string): boolean {
  const trimmed = normalizeAssistantAnswer(text || '');
  if (!trimmed) return true;
  return INSTRUCTIONAL_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function countWords(text: string): number {
  return (text.match(/[a-zA-Z0-9çğıöşüÇĞİÖŞÜ]+/g) || []).length;
}

function hasTopicSignal(text: string, topic: string): boolean {
  const normalized = text.toLocaleLowerCase('tr-TR');
  const tokens = (topic || '').toLocaleLowerCase('tr-TR').match(/[a-z0-9çğıöşü]{4,}/g) || [];
  return tokens.some((token) => normalized.includes(token));
}

function isInvalidShortProviderOutput(text: string, topic: string): boolean {
  const trimmed = normalizeAssistantAnswer(text || '');
  if (!trimmed) return true;
  if (isInstructionalPlaceholder(trimmed)) return true;

  const words = countWords(trimmed);
  if (words < 5) return true;
  return words <= 10 && !hasTopicSignal(trimmed, topic);
}

function isErrorMessage(text: string, outputType?: string): boolean {
  if (outputType === 'error' || outputType === 'planning' || outputType === 'degraded' || outputType === 'skipped') return true;
  if (isInstructionalPlaceholder(text)) return true;
  const lowerText = text.toLowerCase();
  const errorKeywords = [
    'analiz hatası', 'hata', 'fetch failed', 'sunucu açık mı',
    'henüz kurulu olmayabilir', 'gguf', 'degraded', 'skipped',
    'timeout', 'timed out', 'zaman aşımı', 'zaman aşımına',
    'yanıt veremedi', 'çalıştırılamadı', 'server kapalı',
    'connection refused', 'econnrefused',
    'gemma yanıtı tamamlayamadı', 'kısa cevap tekrar denenebilir',
    'kullanılabilir sentez üretemedi', 'context size has been exceeded',
    'lütfen özetlenecek', 'özetlenecek metin yok', 'lütfen metni',
    'metni gönder', 'metni paylaş', 'yeterli bilgi yok', 'bilgi veremem'
  ];
  return errorKeywords.some(keyword => lowerText.includes(keyword));
}

function hasFallbackMetadata(message?: { generationMetadata?: any }): boolean {
  const metadata = message?.generationMetadata;
  return Boolean(metadata?.isFallback || metadata?.status === 'degraded' || metadata?.status === 'failed');
}

/**
 * Nano'nun AI Lab'deki turn'ünü yönetir.
 * Gelen mesajları analiz eder ve yorum yapar.
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

function buildEvidenceFallbackSummary(
  topic: string,
  lastMessages: { model: string, content: string, type?: string, outputType?: string }[]
): string {
  const researchMessage = [...lastMessages]
    .reverse()
    .find((message) => message.model === 'web_search' || message.outputType === 'research' || message.type === 'research');

  if (!researchMessage?.content) {
    return `Güvenli kısa sonuç: "${topic}" için provider çıktısı kullanılamadığı için final yorum Nano'nun mevcut bağlam değerlendirmesiyle sınırlı tutulmalı.`;
  }

  const safeResearch = normalizeAssistantAnswer(researchMessage.content);
  const sourceCount = countWebSources(safeResearch);
  const snippets = safeResearch
    .split('\n')
    .filter((line) => /\[\d+\]/.test(line))
    .map((line) => line.replace(/\[\d+\]/g, '').trim())
    .filter(Boolean)
    .slice(0, 3);
  const preview = snippets.join(' ').slice(0, 320).trim() || safeResearch.slice(0, 320).trim();

  return [
    `Güvenli kısa sonuç: Web Search ${sourceCount || 'birkaç'} kaynakla konu için kullanılabilir bir zemin verdi.`,
    preview ? `Kaynakların ortak çerçevesi: ${preview}` : '',
    'Bu nedenle final değerlendirme provider placeholder/fallback metnine değil, bu kaynak zemini ve Nano yorumuna dayanmalı.',
  ].filter(Boolean).join(' ');
}

function chooseAvailableNextStep(activeParticipants: Set<string>, goal?: string, webSearchDone = false): string {
  if (activeParticipants.has('gemma')) return 'Gemma: Hızlı sentez üret.';
  if (activeParticipants.has('ollama')) return 'Ollama: Hızlı sentez üret.';
  if (activeParticipants.has('qwen')) return 'Qwen: Derin analiz yap; ağır model olduğu için tek deneme yeterli.';
  if (goal === 'image_generation_plan' && activeParticipants.has('sdxl')) return 'SDXL: Görsel üretim planını uygula.';
  if (activeParticipants.has('web_search') && !webSearchDone) return 'Web Search: Kaynaklari bir kez topla.';
  return 'Nano: Final summary üret ve oturumu tamamla.';
}

function isValidCandidateText(text: string): boolean {
  if (!text) return false;
  const trimmed = text.trim();
  if (trimmed.length < 40) return false;
  if (isErrorMessage(trimmed)) return false;
  if (looksMalformedNanoText(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  if (lower.includes('tartisma saglikli ilerliyor') || lower.includes('son katilimci')) return false;
  return true;
}

/**
 * Nano'nun AI Lab'deki turn'ünü yönetir.
 * Gelen mesajları analiz eder ve yalnızca seçili katılımcılara göre öneri üretir.
 */
export async function reflectOnLabStep(
  topic: string,
  lastMessages: { model: string, content: string, type?: string, outputType?: string, generationMetadata?: any }[],
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
    } else if (t.includes('karsilastir') || t.includes('fark')) {
      summary += 'Kullanici karsilastirma istiyor; benzerlikler ve farklar ayrilmali.';
    } else if (t.includes('araştır') || t.includes('haber') || t.includes('güncel')) {
      summary += webSearchDone ? 'Web Search zaten çalışmış; tekrar arama önermiyorum.' : 'Güncel araştırma isteği var; Web Search seçiliyse bir kez kaynak toplanmalı.';
    } else if (t.includes('resim') || t.includes('çiz') || t.includes('görsel')) {
      summary += 'Görsel üretim isteği algılandı.';
      nextStep = hasSdxl ? 'SDXL: Görsel üretim planını uygula.' : 'Nano: SDXL seçili değil; metin tabanlı görsel planla.';
    } else {
      summary += 'Önce kısa bir tanım ve kalite kontrol çerçevesi kurulmalı.';
    }

    return {
      summary: buildNanoInitialReflection({
        topic,
        nextStep,
        webSearchDone,
      }),
      suggestion: summary,
      nextStep,
    };
  }

  const safeContent = normalizeAssistantAnswer(lastMsg.content || '');

  const gemmaInvalidShortOutput = lastMsg.model === 'gemma' && isInvalidShortProviderOutput(safeContent, topic);

  if (hasFallbackMetadata(lastMsg) || isErrorMessage(safeContent, lastMsg.type || lastMsg.outputType) || gemmaInvalidShortOutput) {
    const failureReason = gemmaInvalidShortOutput
      ? 'invalid_short_output'
      : lastMsg.generationMetadata?.reason || lastMsg.generationMetadata?.code || lastMsg.outputType || lastMsg.type || 'degraded';
    const evidenceFallbackSummary = buildEvidenceFallbackSummary(topic, lastMessages);

    if (lastMsg.model === 'gemma') {
      return {
        summary: [
          buildProviderFailureComment({
            provider: 'Gemma',
            topic,
            reason: failureReason,
            fallbackAvailable: webSearchDone || lastMessages.length > 1,
          }),
          evidenceFallbackSummary,
        ].join('\n\n'),
        suggestion: 'Gemma metni final cevaba kanıt gibi eklenmemeli; Nano finali Web Search, önceki güvenilir yorumlar ve sağlam provider çıktılarıyla toparlamalı.',
        nextStep: 'Nano: Final özeti üret, degraded durumu sade dille belirt ve oturumu tamamla.',
      };
    }

    return {
      summary: [
        buildProviderFailureComment({
          provider: lastMsg.model,
          topic,
          reason: failureReason,
          fallbackAvailable: webSearchDone || lastMessages.length > 1,
        }),
        evidenceFallbackSummary,
      ].join('\n\n'),
      suggestion: 'Bu çıktıdan eğitim adayı üretmemek ve mevcut güvenli bilgilerle final özet hazırlamak en doğru yol.',
      nextStep: 'Nano: Final özeti üret ve oturumu tamamla.',
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
      summary: buildNanoWebSearchReflection({
        topic,
        sourceCount,
        preview,
        nextStep,
      }),
      suggestion: 'Aynı oturumda tekrar arama yapmak yerine bu kaynakları yorumlayıp senteze geçmek daha verimli; finalde başlık/snippet içeriği sade Türkçe ile birleştirilmeli.',
      nextStep,
    };
  }

  if (lastMsg.model === 'qwen') {
    const reflection: NanoReflection = {
      summary: buildNanoProviderSuccessReflection({
        topic,
        provider: 'Qwen',
        providerOutput: safeContent,
        nextStep: hasSdxl ? 'SDXL: Görsel üretim planını uygula.' : 'Nano: Final özeti üret.',
      }),
      suggestion: 'Qwen ağır model olduğu için bu oturumda tekrar denenmemeli; Nano finalde açıklık, tekrar ve güvenlik kontrolü yapmalı.',
      nextStep: hasSdxl ? 'SDXL: Görsel üretim planını uygula.' : 'Nano: Final özeti üret.',
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
    const nextStep = hasQwen ? 'Qwen: Seçiliyse tek tur derin analiz yap.' : 'Nano: Final özeti üret.';
    const reflection: NanoReflection = {
      summary: buildNanoProviderSuccessReflection({
        topic,
        provider: providerName,
        providerOutput: safeContent,
        nextStep,
      }),
      suggestion: 'Bu çıktı final cevaba eklenebilir; yine de Nano son turda açıklık, tekrar, Türkçe karakter ve raw reasoning kontrolü yapmalı.',
      nextStep,
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
    summary: `${lastMsg.model} bir katkı sundu; Nano bunu kullanıcıya anlaşılır bir final özetine dönüştürmeli.`,
    suggestion: 'Kısa, doğal Türkçe ve kanıta dayalı bir kapanış bu oturum için yeterli.',
    nextStep: chooseAvailableNextStep(participants, goal, webSearchDone),
  };
}
export function looksMalformedNanoText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 1) return true;

  const lowerText = trimmed.toLowerCase();
  if (lowerText.includes('işlem durduruldu') || lowerText.includes('islem durduruldu')) return true;
  if (lowerText.includes('pro modunu deneyin') || lowerText.includes('pro modu')) return true;
  if (lowerText.includes('yanıtı tamamlayamadı') || lowerText.includes('tekrar deneyin') || lowerText.includes('anlayamadı')) return true;
  if (lowerText.includes('yerel model') || lowerText.includes('hazır değil')) return true;
  if (lowerText.includes('[web search]') || lowerText.includes('json') || trimmed.startsWith('{') || trimmed.startsWith('[')) return true;

  const replacementCount = (trimmed.match(/\ufffd/g) || []).length;
  if (replacementCount > 0) return true;

  const visible = trimmed.replace(/\s/g, '').length || 1;
  const letters = (trimmed.match(/[a-zA-ZğüşöçıİĞÜŞÖÇ0-9]/g) || []).length;
  // BPE tokenizasyonunda boşluklar çok olduğu için oranı düşürelim (0.25 -> 0.15)
  if (trimmed.length > 2 && letters / visible < 0.15) return true;

  const punctuationCount = (trimmed.match(/[\W_]/g) || []).length;
  if (trimmed.length > 10 && punctuationCount / visible > 0.4) return true;

  return false;
}

import { routeToVersion, resolveActiveVersion, PARALLEL_MODE } from '../engine/version-router';
import { modelLoader } from '../engine/model-loader';
import { logQualityEntry } from '../engine/quality-logger';
import { getSharedCore } from '../../lib/aillame-engine';

export async function inferWithVersionControl(
  input: string,
  taskScore: { complexity: number; research: number; code: number; creative: number },
  maxTokens: number,
  temperature: number
): Promise<{ response: string; modelId: string }> {

  const decision = routeToVersion(taskScore);
  const activeVersion = resolveActiveVersion(decision);

  console.log(`[NANO-F5] Yönlendirme: ${decision.version} (aktif: ${activeVersion}) — ${decision.reason}`);

  // V1 yanıtı — her zaman üretilir (hızlıdır)
  const coreV1 = await getSharedCore('v1');
  if (!coreV1) throw new Error('V1 core not initialized');
  
  const { engine: engineV1, tokenizer } = coreV1;
  await modelLoader.setEngine(engineV1, 'v1');
  await modelLoader.ensureLoaded('v1');
  
  const inputIdsV1 = tokenizer.encode(input);
  // [NANO-F7] V1 için stabilite amaçlı topK=1 (greedy) ve stopToken olarak \n (yaklaşık 10) deniyoruz
  const outputIdsV1 = engineV1.generate(new Uint32Array(inputIdsV1), maxTokens, temperature, 1, 10); 
  const generatedIdsV1 = Array.from(outputIdsV1).slice(inputIdsV1.length);
  const v1Response = tokenizer.decode(generatedIdsV1.length > 0 ? generatedIdsV1 : outputIdsV1);

  // V2 yanıtı — paralel modda veya v2 seçildiğinde üretilir
  let v2Response: string | undefined;
  let v2LoadTime: number | undefined;

  if (decision.version === 'v2' || PARALLEL_MODE) {
    try {
      const t = Date.now();
      const coreV2 = await getSharedCore('v2');
      if (coreV2) {
        const { engine: engineV2 } = coreV2;
        
        await modelLoader.setEngine(engineV2, 'v2');
        await modelLoader.ensureLoaded('v2');
        
        const inputIdsV2 = engineV2.bpeEncode(input); 
        // [NANO-F7] V2 için Top-K=40 ve EOS=3 (BPE <EOS>) kullanıyoruz
        const outputIdsV2 = engineV2.generate(new Uint32Array(inputIdsV2), maxTokens, temperature, 40, 3);
        const generatedIdsV2 = Array.from(outputIdsV2).slice(inputIdsV2.length);
        
        // V2 BPE decode kullanmalı
        v2Response = engineV2.bpeDecode(generatedIdsV2.length > 0 ? generatedIdsV2 : outputIdsV2);
        
        v2LoadTime = Date.now() - t;
      }
    } catch (err) {
      console.warn('[NANO-F5] V2 inference hatası — V1 kullanılıyor:', err);
    }
  }

  // Kalite logu
  logQualityEntry({
    timestamp: Date.now(),
    input: input.slice(0, 200),
    v1Response: v1Response.slice(0, 300),
    v2Response: v2Response?.slice(0, 300),
    routingDecision: decision.reason,
    taskScore,
    v2LoadTime,
  });

  // Paralel modda veya v2 hatasında kullanıcıya V1 gider
  const finalResponse = (activeVersion === 'v2' && v2Response)
    ? v2Response
    : v1Response;

  return {
    response: finalResponse,
    modelId: (activeVersion === 'v2' && v2Response) ? 'aillame-nano-v2' : 'aillame-nano-v1'
  };
}

export function safeFallback(prompt: string, history: { role: string, content: string }[] = []): string {
  const qualityAnswer = buildConversationAnswer(prompt, history);
  if (qualityAnswer) return enrichNanoAnswer(prompt, qualityAnswer, history);

  const quick = getQuickResponse(prompt, history);
  if (quick) return enrichNanoAnswer(prompt, quick, history);

  const p = prompt.toLowerCase().trim();
  if (p.length < 3) return 'Anladım. Size nasıl yardımcı olabilirim?';

  const intentAware = buildIntentAwareNanoAnswer(prompt, history);
  if (intentAware) return enrichNanoAnswer(prompt, intentAware, history);

  const intent = detectUserIntent(prompt);
  if (intent === 'default') {
    return enrichNanoAnswer(prompt, 'Bunu daha iyi yanıtlayabilmem için bağlamı biraz daraltmam gerekiyor. İstersen hedefini tek cümleyle yaz; ben de sana uygulanabilir bir cevap hazırlayayım.', history);
  }

  return enrichNanoAnswer(prompt, 'Bu isteği tam karşılayacak bir model çıktısı alamadım; yine de konuyu adım adım açabilirim. İstersen biraz daha detay ver.', history);
}
