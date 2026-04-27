
import { 
  NanoTaskType, 
  NanoToolTarget, 
  NanoCognitivePlan, 
  NanoReflection, 
  NanoLearningSuggestion 
} from './types';

/**
 * Nano Cognitive Layer Service
 * Nano'nun "Atom Karınca" görev zekasını yöneten merkez modül.
 */

export function classifyTask(prompt: string): NanoCognitivePlan {
  const p = prompt.toLowerCase().trim();
  
  // 1. Social Chat
  if (matchesPhrase(p, ['selam', 'merhaba', 'nasılsın', 'adın ne', 'kimsin', 'teşekkür', 'bay bay', 'görüşürüz'])) {
    return {
      taskType: 'social_chat',
      toolTarget: 'QuickResponse',
      confidenceScore: 0.95,
      reason: 'User is engaging in social conversation.'
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

  // 3. Current Research
  if (p.includes('güncel') || p.includes('haber') || p.includes('son dakika') || p.includes('araştır') || p.includes('bugünkü')) {
    return {
      taskType: 'current_research',
      toolTarget: 'Web Search',
      confidenceScore: 0.85,
      reason: 'User requested real-time information.'
    };
  }

  // 4. Code Help
  if (p.includes('kod') || p.includes('yazılım') || p.includes('javascript') || p.includes('python') || p.includes('hata')) {
    return {
      taskType: 'code_help',
      toolTarget: 'Qwen',
      confidenceScore: 0.8,
      reason: 'User requested programming assistance.'
    };
  }

  // 5. General Knowledge (Kısıtlı liste üzerinden)
  if (isGeneralKnowledge(p)) {
    return {
      taskType: 'general_knowledge',
      toolTarget: 'GeneralKnowledge',
      confidenceScore: 0.9,
      reason: 'Question matches known general knowledge base.'
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
  return phrases.some((phrase) => prompt.includes(phrase));
}

function isGeneralKnowledge(p: string): boolean {
  const base = [
    'ekonomi nedir', 'yapay zeka nedir', 'javascript nedir', 
    'psikoloji nedir', 'hukuk nedir', 'enflasyon nedir',
    'arz ve talep nedir', 'api nedir', 'algoritma nedir', 'web sitesi nedir'
  ];
  return base.some(b => p.includes(b));
}

export function getQuickResponse(prompt: string): string | null {
  const p = prompt.trim().toLowerCase();
  if (!p) return null;

  if (matchesPhrase(p, ['selam', 'selamlar', 'slm'])) {
    return 'Selam! Sana nasıl yardımcı olabilirim?';
  }
  if (matchesPhrase(p, ['merhaba', 'merhabalar', 'mrb'])) {
    return 'Merhaba! Ben Aillame Nano. Size nasıl yardımcı olabilirim?';
  }
  if (matchesPhrase(p, ['nasılsın', 'nasilsin', 'ne haber'])) {
    return 'İyiyim, teşekkür ederim. Siz nasılsınız?';
  }
  if (matchesPhrase(p, ['adın ne', 'senin adın ne'])) {
    return 'Benim adım Aillame Nano. Aillame sisteminin ana sohbet asistanıyım.';
  }
  if (matchesPhrase(p, ['kimsin', 'sen kimsin', 'peki sen kimsin', 'kendini tanıt'])) {
    return 'Ben Aillame Nano. Sorularını yanıtlamak ve gerektiğinde Aillame’nin diğer modüllerine yönlendirmek için buradayım.';
  }
  if (matchesPhrase(p, ['teşekkürler', 'teşekkür ederim', 'sağ ol', 'sağol'])) {
    return 'Rica ederim. Yardımcı olabildiysem ne mutlu.';
  }
  if (matchesPhrase(p, ['güle güle', 'hoşça kal', 'bay bay'])) {
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

/**
 * Nano'nun AI Lab'deki turn'ünü yönetir.
 * Gelen mesajları analiz eder ve yorum yapar.
 */
export async function reflectOnLabStep(
  topic: string, 
  lastMessages: { model: string, content: string, type?: string }[]
): Promise<NanoReflection> {
  const lastMsg = lastMessages[lastMessages.length - 1];
  
  let summary = '';
  let suggestion = '';
  let learningCandidate: NanoLearningSuggestion | undefined;
  let nextStep = '';

  if (!lastMsg) {
    return { summary: 'Tartışma henüz başlamadı.', nextStep: 'Web Search veya Qwen ile başlayabiliriz.' };
  }

  if (lastMsg.type === 'research' || lastMsg.model === 'web_search') {
    summary = `Web Search üzerinden konuyla ilgili güncel kaynaklar getirildi. Bu kaynaklar konunun güncel durumunu anlamak için kritik.`;
    suggestion = `Bu kaynakları Qwen ile analiz ederek derinlemesine bilgi edinebiliriz.`;
    nextStep = `Qwen: Lütfen bu kaynakları ${topic} bağlamında yorumla.`;
  } else if (lastMsg.model === 'qwen') {
    summary = `Qwen konuyu analitik bir perspektifle değerlendirdi. Ortaya çıkan analiz oldukça doyurucu görünüyor.`;
    suggestion = `Bu analizi Nano için bir öğrenme adayı olarak değerlendirebiliriz.`;
    
    learningCandidate = {
      instruction: `${topic} hakkında bilgi ver.`,
      output: lastMsg.content.substring(0, 500), // Özet çıktı
      topic: topic,
      mode: 'educational',
      confidenceScore: 0.85,
      riskLevel: 'low',
      reason: 'Qwen analizi yüksek kaliteli bilgi içeriyor.',
      source: 'qwen'
    };
    nextStep = `Tartışmayı bir sonraki boyuta (örneğin pratik uygulama alanları) taşıyabiliriz.`;
  } else if (lastMsg.type === 'image' || lastMsg.model === 'sdxl') {
    summary = `SDXL tarafından konuyla ilgili görselleştirme yapıldı.`;
    suggestion = `Prompt başarımı iyi görünüyor, görsel konuyu destekliyor.`;
    nextStep = `Görseldeki kavramları teknik olarak detaylandırabiliriz.`;
  } else {
    summary = `Tartışma devam ediyor. Katılımcılar fikir alışverişinde bulunuyor.`;
    nextStep = `Web Search ile yeni veriler ekleyebiliriz.`;
  }

  return { summary, suggestion, learningCandidate, nextStep };
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
  if (letters / visible < 0.35) return true;

  const punctuationCount = (trimmed.match(/[\W_]/g) || []).length;
  if (punctuationCount / visible > 0.25) return true;

  return false;
}

export function safeFallback(prompt: string): string {
  const quick = getQuickResponse(prompt);
  if (quick) return quick;

  const safePrompt = prompt.trim();
  return safePrompt
    ? 'Aillame Nano şu an bu talebi güvenilir şekilde yanıtlayamıyor. Lütfen daha sonra tekrar deneyin.'
    : 'Aillame Nano hazır. Size nasıl yardımcı olabilirim?';
}
