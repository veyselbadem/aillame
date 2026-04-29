
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

/**
 * Nano Cognitive Layer Service
 * Nano'nun "Atom Karınca" görev zekasını yöneten merkez modül.
 */

export function classifyTask(prompt: string): NanoCognitivePlan {
  const p = prompt.toLowerCase().trim();

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
      reason: 'User is engaging in social conversation or providing a short dialogue continuation.'
    };
  }

  // 2. Image Generation
  if (p.includes('resim oluştur') || p.includes('çiz') || p.includes('görsel üret') || p.includes('logo tasarla')) {
    return {
      taskType: 'image_generation',
      toolTarget: 'SDXL',
      confidenceScore: 0.9,
      reason: 'User requested image generation.'
    };
  }

  // 1.5 Image Analysis
  if (p.includes('resmi analiz et') || p.includes('bu görseli incele') || p.includes('resme bak')) {
    return {
      taskType: 'image_analysis',
      toolTarget: 'Qwen',
      confidenceScore: 0.9,
      reason: 'User requested image analysis.'
    };
  }

  // 1.6 List Examples
  if (matchesPhrase(p, ['listele', 'örnek ver', 'tane örnek', 'sırala', 'maddeler halinde', 'örnekler misin', 'tane yaz'])) {
    return {
      taskType: 'list_examples',
      toolTarget: 'GeneralKnowledge',
      confidenceScore: 0.85,
      reason: 'User wants a list or examples.'
    };
  }

  // 1.7 Compare
  if (p.includes('fark nedir') || p.includes('karşılaştır') || p.includes('kıyasla') || p.includes('arasındaki fark')) {
    return {
      taskType: 'compare',
      toolTarget: 'GeneralKnowledge',
      confidenceScore: 0.85,
      reason: 'User wants a comparison.'
    };
  }

  // 1.8 Explain More
  if (matchesPhrase(p, ['daha açıkla', 'detaylandır', 'anlamadım', 'biraz daha aç', 'ne demek istedin'])) {
    return {
      taskType: 'explain_more',
      toolTarget: 'safeFallback',
      confidenceScore: 0.9,
      reason: 'User needs elaboration.'
    };
  }

  // 1.9 Continue Context
  if (matchesPhrase(p, ['devam et', 'kaldığın yerden', 'sonra', 'başka'])) {
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
  if (p.includes('güncel') || p.includes('haber') || p.includes('son dakika') || p.includes('araştır') || p.includes('bugünkü')) {
    return {
      taskType: 'current_research',
      toolTarget: 'Web Search',
      confidenceScore: 0.85,
      reason: 'User requested real-time information.'
    };
  }

  // 5. Code Help
  if (p.includes('kod') || p.includes('yazılım') || p.includes('javascript') || p.includes('python') || p.includes('hata')) {
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
    // Kelime bazlı eşleşme için boşluk kontrolü (opsiyonel ama daha güvenli)
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

export function getGeneralKnowledgeResponse(prompt: string): string | null {
  const p = prompt.trim().toLowerCase();

  if (p.includes('ekonomi nedir')) return 'Ekonomi, kaynakların sınırlı olduğu bir ortamda insanların ihtiyaçlarını karşılamak için üretilen mal ve hizmetlerin dağıtımı ile ilgilenen bir bilim dalıdır.';
  if (p.includes('yapay zeka nedir')) return 'Yapay zeka, bilgisayarların insan benzeri düşünme, öğrenme ve problem çözme yetenekleri göstermesini sağlayan bir teknoloji alanıdır.';
  if (p.includes('javascript nedir')) return 'JavaScript, web sayfalarına etkileşim ve dinamik davranış kazandırmak için kullanılan bir programlama dilidir.';
  if (p.includes('psikoloji nedir')) return 'Psikoloji, insan davranışlarını ve zihinsel süreçleri inceleyen bir bilim dalıdır.';
  if (p.includes('hukuk nedir')) return 'Hukuk, toplumda düzeni sağlamak için kurallar koyan ve bunları uygulayan sistemler bütünüdür.';
  if (p.includes('enflasyon nedir')) return 'Enflasyon, fiyatların genel olarak yükselmesi ve paranın satın alma gücünün azalmasıdır.';
  if (p.includes('arz ve talep nedir')) return 'Arz ve talep, bir pazarda satıcıların sunduğu miktar ile alıcıların talep ettiği miktar arasındaki ilişkiyi açıklar.';
  if (p.includes('api nedir')) return 'API, farklı yazılımların birbirleriyle güvenli ve standart bir şekilde iletişim kurmasını sağlayan arayüzdür.';
  if (p.includes('algoritma nedir')) return 'Algoritma, belirli bir problemi çözmek için izlenen adım adım talimatlar dizisidir.';
  if (p.includes('web sitesi nedir')) return 'Web sitesi, internet üzerinde yayınlanan ve ziyaretçilere bilgi ve içerik sunan dijital sayfalar bütünüdür.';

  return null;
}

function isErrorMessage(text: string, outputType?: string): boolean {
  if (outputType === 'error' || outputType === 'planning' || outputType === 'degraded' || outputType === 'skipped') return true;
  const lowerText = text.toLowerCase();
  const errorKeywords = [
    'analiz hatası', 'hata', 'fetch failed', 'sunucu açık mı',
    'henüz kurulu olmayabilir', 'gguf', 'degraded', 'skipped',
    'timeout', 'timed out', 'zaman aşımı', 'zaman aşımına',
    'yanıt veremedi', 'çalıştırılamadı', 'server kapalı',
    'connection refused', 'econnrefused',
    'gemma yanıtı tamamlayamadı', 'kısa cevap tekrar denenebilir',
    'kullanılabilir sentez üretemedi', 'context size has been exceeded'
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

    return { summary, nextStep };
  }

  const safeContent = normalizeAssistantAnswer(lastMsg.content || '');

  if (hasFallbackMetadata(lastMsg) || isErrorMessage(safeContent, lastMsg.type || lastMsg.outputType)) {
    if (lastMsg.model === 'gemma') {
      return {
        summary: 'Gemma bu turda güvenilir bir sentez üretemedi; bu çıktıyı başarılı analiz gibi kullanmıyorum.',
        suggestion: 'Final değerlendirmeyi Web Search kaynakları, önceki Nano yorumu ve varsa sağlam provider çıktılarıyla hazırlamak daha güvenli.',
        nextStep: 'Nano: Kısa final özet üret, degraded durumu açıkça belirt ve oturumu tamamla.',
      };
    }

    return {
      summary: `${lastMsg.model} çıktısı hata/degraded/planning olarak işaretlendi; bu yüzden içerik kanıtı olarak kullanılmayacak.`,
      suggestion: 'Bu çıktıdan eğitim adayı üretmemek ve mevcut güvenli bilgilerle final özet hazırlamak en doğru yol.',
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
      summary: `Web Search ${sourceCount || 0} kaynak getirdi. İlk okuma şu ortak çerçeveyi veriyor: ${preview}...`,
      suggestion: 'Aynı oturumda tekrar arama yapmak yerine bu kaynakları yorumlayıp senteze geçmek daha verimli.',
      nextStep,
    };
  }

  if (lastMsg.model === 'qwen') {
    const reflection: NanoReflection = {
      summary: 'Qwen derin analiz katkisi sundu.',
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
      summary: `${providerName} kullanılabilir bir hızlı sentez üretti: ${preview}...`,
      suggestion: 'Bu çıktı final cevaba eklenebilir; yine de Nano son turda açıklık, tekrar ve güvenlik kontrolü yapmalı.',
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
  if (lowerText.includes('yerel model') || lowerText.includes('hazır değil')) return true;
  if (lowerText.includes('[web search]') || lowerText.includes('json') || trimmed.startsWith('{') || trimmed.startsWith('[')) return true;

  const replacementCount = (trimmed.match(/\ufffd/g) || []).length;
  if (replacementCount > 0) return true;

  const visible = trimmed.replace(/\s/g, '').length || 1;
  const letters = (trimmed.match(/[a-zA-ZğüşöçıİĞÜŞÖÇ0-9]/g) || []).length;
  // Kısa ama geçerli cevaplara izin ver (örneğin "Tamam.")
  if (trimmed.length > 2 && letters / visible < 0.25) return true;

  const punctuationCount = (trimmed.match(/[\W_]/g) || []).length;
  if (trimmed.length > 10 && punctuationCount / visible > 0.4) return true;

  return false;
}

export function safeFallback(prompt: string, history: { role: string, content: string }[] = []): string {
  const qualityAnswer = buildConversationAnswer(prompt, history);
  if (qualityAnswer) return normalizeAssistantAnswer(qualityAnswer);

  const quick = getQuickResponse(prompt, history);
  if (quick) return quick;

  const p = prompt.toLowerCase().trim();
  if (p.length < 3) return 'Anladım. Size nasıl yardımcı olabilirim?';

  const intent = detectUserIntent(prompt);
  if (intent === 'default') {
    return 'Bunu daha iyi yanıtlayabilmem için bağlamı biraz daraltmam gerekiyor. İstersen hedefini tek cümleyle yaz; ben de sana uygulanabilir bir cevap hazırlayayım.';
  }

  return 'Bu isteği tam karşılayacak bir model çıktısı alamadım; yine de konuyu adım adım açabilirim. İstersen biraz daha detay ver.';
}
