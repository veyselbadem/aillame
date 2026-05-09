export type ConversationIntent =
  | 'coding_help'
  | 'project_planning'
  | 'seo_article'
  | 'music_prompt'
  | 'research_summary'
  | 'casual_chat'
  | 'troubleshooting'
  | 'ai_lab_analysis'
  | 'general_knowledge'
  | 'image_generation'
  | 'default';

export type IntentRouteTarget = 'text' | 'igm' | 'code' | 'agent' | 'clarification';

export interface IntentClassificationMeta {
  intent: ConversationIntent;
  confidence: number;
  normalizedText: string;
  matchedSignals: string[];
  fallbackReason?: string;
  routeTarget: IntentRouteTarget;
}

import { buildDynamicContext, injectMemories, ContextMessage } from './context-manager'; // [NANO-F3]

type ChatMessageLike = {
  role?: string;
  content?: string;
};

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

const MOJIBAKE_MAP: Record<string, string> = {
  'Ä±': 'ı',
  'Ä°': 'İ',
  'Ã§': 'ç',
  'Ã‡': 'Ç',
  'ÄŸ': 'ğ',
  'Äž': 'Ğ',
  'Ã¶': 'ö',
  'Ã–': 'Ö',
  'ÅŸ': 'ş',
  'Åž': 'Ş',
  'Ã¼': 'ü',
  'Ãœ': 'Ü',
  'â€™': "'",
  'â€œ': '"',
  'â€': '"',
  'â€“': '-',
  'â€”': '-',
  'Â·': '·',
  'Â': '',
};

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

function includesAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

const DEFINITION_TERMS = [
  'nedir', 'ne demek', 'kimdir', 'nelerdir', 'hakkinda bilgi', 'hakkında bilgi',
  'anlatir misin', 'anlatır mısın', 'aciklar misin', 'açıklar mısın',
] as const;

const AGENT_TASK_TERMS = [
  'agent', 'ajan', 'kod ajanı', 'code agent', 'dosya', 'patch', 'commit', 'repo', 'proje',
  'workspace', 'refactor', 'test et', 'task',
] as const;

const CODING_TOPIC_TERMS = [
  'javascript', 'typescript', 'python', 'react', 'next.js', 'node', 'api', 'fonksiyon', 'component', 'html', 'css',
] as const;

const CODING_ACTION_TERMS = [
  'yaz', 'olustur', 'oluştur', 'yap', 'duzelt', 'düzelt', 'fix', 'coz', 'çöz', 'ornek ver', 'örnek ver',
] as const;

function normalizeForIntentMatch(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşü]/g, (char) => ({ ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' }[char] || char))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function intentTokens(value: string): string[] {
  return normalizeForIntentMatch(value).split(' ').filter(Boolean);
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return previous[b.length];
}

function isCloseIntentToken(token: string, target: string): boolean {
  if (token === target || token.includes(target)) return true;
  if (target.length < 4 || token.length < 4) return false;
  const maxDistance = target.length >= 7 ? 2 : 1;
  return Math.abs(token.length - target.length) <= maxDistance && levenshteinDistance(token, target) <= maxDistance;
}

const IMAGE_TOPIC_TERMS = [
  'gorsel', 'resim', 'resmi', 'fotograf', 'foto', 'logo', 'ikon', 'illustrasyon',
  'papatya', 'manzara', 'kedi', 'kopek', 'araba', 'ev', 'doga', 'uzay', 'gemi',
] as const;

const IMAGE_ACTION_TERMS = [
  'olustur', 'olusturur', 'olusturabilir', 'uret', 'yap', 'yapar', 'ciz', 'cizer', 'tasarla', 'hazirla',
] as const;

export function isImageGenerationIntentText(prompt: string): boolean {
  const signals = findImageIntentSignals(prompt);
  return signals.isImage;
}

function findImageIntentSignals(prompt: string): {
  isImage: boolean;
  matchedSignals: string[];
} {
  const normalized = normalizeForIntentMatch(prompt);
  if (!normalized) return { isImage: false, matchedSignals: [] };

  const matchedSignals: string[] = [];
  const hasDefinitionCue = DEFINITION_TERMS.some((term) => normalized.includes(term));

  if (normalized.includes('image generate') || normalized.includes('generate image') || normalized.includes('image:')) {
    matchedSignals.push('explicit image command');
    return { isImage: true, matchedSignals };
  }

  const tokens = intentTokens(prompt);
  let hasImageTopic = false;
  for (const term of IMAGE_TOPIC_TERMS) {
    const tokenMatch = tokens.find((token) => token === term || token.startsWith(term));
    if (tokenMatch) {
      hasImageTopic = true;
      matchedSignals.push(`image topic:${term}`);
      break;
    }
  }

  let hasGenerationAction = false;
  for (const term of IMAGE_ACTION_TERMS) {
    const tokenMatch = tokens.find((token) => isCloseIntentToken(token, term));
    if (tokenMatch) {
      hasGenerationAction = true;
      matchedSignals.push(tokenMatch === term ? `action:${term}` : `action typo:${tokenMatch}->${term}`);
      break;
    }
  }

  if (hasDefinitionCue) {
    matchedSignals.push('definition cue');
  }

  const isImage = hasImageTopic && hasGenerationAction && !hasDefinitionCue;
  return { isImage, matchedSignals };
}

function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

export function classifyIntentWithConfidence(prompt: string): IntentClassificationMeta {
  const text = normalizeText(prompt);
  const normalizedText = normalizeForIntentMatch(prompt);
  const matchedSignals: string[] = [];

  if (!text) {
    return {
      intent: 'default',
      confidence: 0.2,
      normalizedText,
      matchedSignals,
      fallbackReason: 'empty_prompt',
      routeTarget: 'clarification',
    };
  }

  const imageSignals = findImageIntentSignals(prompt);
  if (imageSignals.isImage) {
    return {
      intent: 'image_generation',
      confidence: 0.95,
      normalizedText,
      matchedSignals: imageSignals.matchedSignals,
      routeTarget: 'igm',
    };
  }

  const isCoding =
    includesAny(text, CODING_ACTION_TERMS) && includesAny(text, CODING_TOPIC_TERMS) ||
    includesAny(text, ['typeerror', 'referenceerror', 'syntaxerror', 'cannot read', 'hata', 'error', 'bug']);
  if (isCoding) {
    matchedSignals.push('explicit coding request');
    return {
      intent: 'coding_help',
      confidence: clampConfidence(includesAny(text, ['cannot read', 'typeerror', 'hata', 'error']) ? 0.95 : 0.9),
      normalizedText,
      matchedSignals,
      routeTarget: 'code',
    };
  }

  const isDefinition = DEFINITION_TERMS.some((term) => normalizedText.includes(term));
  const hasKnowledgeTopic = includesAny(text, [
    'evren', 'yıldız', 'rust', 'javascript', 'html', 'css', 'hukuk', 'psikoloji', 'fotoğrafçılık', 'görsel',
  ]);
  if (isDefinition || hasKnowledgeTopic) {
    matchedSignals.push(isDefinition ? 'definition cue' : 'knowledge topic');
    return {
      intent: 'general_knowledge',
      confidence: clampConfidence(isDefinition ? 0.95 : 0.86),
      normalizedText,
      matchedSignals,
      routeTarget: 'text',
    };
  }

  const isAgentTask = includesAny(text, AGENT_TASK_TERMS);
  if (isAgentTask) {
    matchedSignals.push('agent/project operation');
    return {
      intent: 'project_planning',
      confidence: 0.82,
      normalizedText,
      matchedSignals,
      routeTarget: 'agent',
    };
  }

  if (
    includesAny(text, ['açılmıyor', 'çalışmıyor', 'hata', 'error', 'timeout', 'zaman aşımı', 'port', 'log', 'debug']) &&
    includesAny(text, ['gemma', 'ollama', 'sunucu', 'server', 'model', 'runtime', 'ne yapmalıyım'])
  ) {
    matchedSignals.push('runtime troubleshooting');
    return {
      intent: 'troubleshooting',
      confidence: 0.88,
      normalizedText,
      matchedSignals,
      routeTarget: 'text',
    };
  }

  if (includesAny(text, ['araştır', 'özetle', 'kaynak', 'güncel', 'haber', 'rapor', 'kolonizasyon'])) {
    matchedSignals.push('research request');
    return {
      intent: 'research_summary',
      confidence: 0.8,
      normalizedText,
      matchedSignals,
      routeTarget: 'text',
    };
  }

  if (includesAny(text, ['merhaba', 'selam', 'nasılsın', 'kimsin', 'ne yapabiliyorsun', 'kendini tanıt', 'teşekkür'])) {
    matchedSignals.push('casual chat');
    return {
      intent: 'casual_chat',
      confidence: 0.92,
      normalizedText,
      matchedSignals,
      routeTarget: 'text',
    };
  }

  return {
    intent: 'default',
    confidence: 0.45,
    normalizedText,
    matchedSignals,
    fallbackReason: 'insufficient_signals',
    routeTarget: 'clarification',
  };
}

export function detectUserIntent(prompt: string): ConversationIntent {
  const base = classifyIntentWithConfidence(prompt);
  if (base.intent !== 'default') return base.intent;

  const text = normalizeText(prompt);
  if (includesAny(text, ['seo', 'anahtar kelime', 'başlık', 'alt başlık', 'blog', 'içerik akışı', 'site için yazı'])) {
    return 'seo_article';
  }
  if (includesAny(text, ['suno', 'style', 'lyric', 'şarkı', 'rap', 'boom bap', 'müzik', 'beat', 'verse', 'chorus'])) {
    return 'music_prompt';
  }
  if (includesAny(text, ['ai lab', 'nano', 'gemma', 'ollama']) && includesAny(text, ['analiz', 'degraded', 'fallback', 'sentez', 'kontrol'])) {
    return 'ai_lab_analysis';
  }

  return 'default';
}

export function shouldUseDetailedExplanation(intent: ConversationIntent): boolean {
  return ['coding_help', 'project_planning', 'seo_article', 'troubleshooting', 'research_summary', 'ai_lab_analysis'].includes(intent);
}

export function shouldAskFollowUp(prompt: string, intent: ConversationIntent): boolean {
  // Takip sorusu sorma mantığını esnetiyoruz; AI modelinin kendisi karar vermeli.
  // Sadece çok belirsiz 'default' durumlarda ve çok kısa girdilerde sorulabilir.
  const text = prompt.trim();
  if (intent !== 'default') return false;
  return text.length < 10 && text.split(/\s+/).length < 2;
}

export function getRecommendedMaxTokens(intent: ConversationIntent): number {
  switch (intent) {
    case 'seo_article':
    case 'project_planning':
      return 520;
    case 'coding_help':
    case 'troubleshooting':
    case 'research_summary':
    case 'ai_lab_analysis':
      return 420;
    case 'music_prompt':
      return 360;
    case 'casual_chat':
      return 220;
    default:
      return 300;
  }
}

export function buildAnswerStyleGuide(intent: ConversationIntent): string {
  const common = [
    'Türkçe doğal, açık ve kullanıcıya yakın olsun.',
    'Kullanıcı açıkça kısa istemediyse tek cümlelik cevap verme.',
    'Gerektiğinde örnek, madde veya kısa kod bloğu kullan.',
    'Belirsizlik varsa en fazla bir net takip sorusu sor; makul varsayımla ilerleyebiliyorsan ilerle.',
    'Raw reasoning, <think> veya reasoning_content gösterme.',
    'Boş ya da fallback çıktısını başarılı cevap gibi sunma.',
  ];

  const intentRules: Record<ConversationIntent, string[]> = {
    coding_help: [
      'Yeni başlayan biri okuyormuş gibi açıkla.',
      'Kavram farkını belirt, kısa örnek kod ver, ne zaman hangisinin kullanılacağını söyle.',
    ],
    project_planning: [
      'Önce hedefi netleştir, sonra uygulanabilir aşamalar ver.',
      'API endpoint, env, güvenlik ve test adımlarını ayrı düşün.',
    ],
    seo_article: [
      'Başlık, alt başlıklar, anahtar kelimeler ve içerik akışı öner.',
      'Tıbbi/psikolojik konularda kesin teşhis dili kullanma.',
    ],
    music_prompt: [
      'Suno isteklerinde Style Prompt ile Lyric Direction ayrımını koru.',
      'Tür/tempo/duygu/enstrüman/vokal atmosferini net yaz.',
    ],
    research_summary: [
      'Kaynak varsa kanıtları ayır, yoksa varsayım yaptığını belirt.',
      'Özet, yorum ve sonraki adım ayrımı yap.',
    ],
    casual_chat: [
      'Sıcak ama gereksiz uzamayan bir ton kullan.',
      'Kapasiteleri somut örneklerle kısaca anlat.',
    ],
    troubleshooting: [
      'Önce hızlı teşhis, sonra PowerShell komutları, sonra olası çözümler ver.',
      'Uygulama çökmemeli; fallback ve log kontrolünü hatırlat.',
    ],
    ai_lab_analysis: [
      'Özet, karar ve sonraki adım şeklinde konuş.',
      'Degraded/fallback çıktıları başarı gibi yorumlama.',
    ],
    default: [
      'Kullanıcının niyetini makul biçimde yorumla ve yardımcı bir cevap ver.',
      'Eğer bu bir genel bilgi sorusuysa doğrudan ve kısa bir açıklama ile başla.',
    ],
    general_knowledge: [
      'Konu hakkında doğrudan, doğru ve kısa bir açıklama ver.',
      'Gereksiz netleştirme sorularından kaçın.',
      'Eğer konu çok genişse en önemli 2-3 noktayı vurgula.',
    ],
    image_generation: [
      'Bunun bir görsel üretim isteği olduğunu belirt.',
      'Kullanıcıyı Görsel Üretim paneline veya ilgili endpoint’e yönlendir.',
      'İstersen betimleme (prompt) hazırlayabileceğini söyle.',
    ],
  };

  return [...common, ...intentRules[intent]].map((rule) => `- ${rule}`).join('\n');
}

// [NANO-F3] Context Manager entegrasyonu
export function enrichPromptForConversation(
  prompt: string, 
  messages: ChatMessageLike[] = [],
  relevantMemories: string[] = [] // [NANO-F3]
): string {
  const intent = detectUserIntent(prompt);
  
  // [NANO-F3] Dinamik bağlam oluşturma
  const history = messages.map(m => ({
    role: (m.role || 'user') as 'user' | 'assistant' | 'system',
    content: m.content || ''
  })) as ContextMessage[];

  const contextResult = buildDynamicContext(history, relevantMemories, {
    maxChars: 4000,
    memoryReserveChars: 800,
  });

  const finalContext = injectMemories(contextResult, relevantMemories);

  const recentContext = finalContext.messages
    .map((message) => `${message.role}: ${message.content.trim().slice(0, 600)}`)
    .join('\n');

  return [
    'Aillame konuşma kalite yönergesi:',
    buildAnswerStyleGuide(intent),
    recentContext ? '\nSon bağlam:' : '',
    recentContext,
    '\nKullanıcı isteği:',
    prompt.trim(),
  ].filter(Boolean).join('\n');
}

function decodeBasicHtmlEntities(value: string): string {
  return value.replace(/&quot;|&#34;|&#x22;|&#x27;|&#39;|&amp;|&lt;|&gt;/gi, (entity) => {
    return HTML_ENTITY_MAP[entity.toLowerCase()] || entity;
  });
}

function repairMojibake(value: string): string {
  let repaired = value;
  for (const [bad, good] of Object.entries(MOJIBAKE_MAP)) {
    repaired = repaired.split(bad).join(good);
  }
  return repaired;
}

function stripRawThinking(value: string): string {
  return value
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/reasoning_content\s*[:=]\s*["']?[\s\S]*?(?=\n\n|$)/gi, '')
    .replace(/\b(thinking|reasoning)\s*[:=]\s*["']?[\s\S]*?(?=\n\n|$)/gi, '')
    .trim();
}

function removeRepeatedSentences(value: string): string {
  const lines = value.split('\n');
  const seen = new Set<string>();
  const result: string[] = [];

  for (const line of lines) {
    const key = normalizeText(line).replace(/\s+/g, ' ');
    if (!key) {
      result.push(line);
      continue;
    }
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(line);
  }

  return result.join('\n');
}

export function normalizeAssistantAnswer(answer?: string): string {
  if (!answer) return '';

  const withoutThinking = stripRawThinking(answer);
  const decoded = decodeBasicHtmlEntities(withoutThinking);
  const repaired = repairMojibake(decoded);
  const compact = repaired
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return removeRepeatedSentences(compact).trim();
}

export function hasAnswerQualityIssue(answer: string, intent: ConversationIntent): boolean {
  const normalized = normalizeAssistantAnswer(answer);
  if (!normalized) return true;
  if (/reasoning_content|<think>|<\/think>/i.test(answer)) return true;
  if (/Ä±|Ã§|Ã¶|Ã¼|ÅŸ|ÄŸ|Â/.test(answer)) return true;
  if (/&#x27;|&quot;|&amp;|&lt;|&gt;/i.test(answer)) return true;
  if (/yanıtı tamamlayamadı|kısa cevap tekrar denenebilir|anlayamadı|planlama aşamasında|kod mantığıyla düşünelim|somut bir kod parçası|ne yapmak istediğini belirle/i.test(normalized)) return true;

  const minLength = shouldUseDetailedExplanation(intent) ? 180 : 70;
  
  if (intent === 'general_knowledge') {
    const genericForbidden = [
        'konuyu önce sadeleştireyim', 
        'amacımız neyi anlamak', 
        'hedefini tek cümleyle',
        'Makul varsayımla devam',
        'açıklama hazırlıyorum',
        'bilgileri sağlayabilirim',
        'modüllerini kullanmanı önerebilirim',
        'konuyu biraz daha daraltabilirsin',
        'analiz gerekiyorsa',
        'güncel veri gerekiyorsa'
    ];
    if (genericForbidden.some(p => normalized.includes(p))) return true;
  }

  return normalized.length < minLength && intent !== 'casual_chat';
}

export function buildConversationAnswer(prompt: string, messages: ChatMessageLike[] = []): string | null {
  const intent = detectUserIntent(prompt);
  const text = normalizeText(prompt);

  switch (intent) {
    case 'casual_chat':
      if (text.includes('teşekkür') || text.includes('sağ ol') || text.includes('sağol')) {
        return 'Rica ederim. Takıldığın başka bir nokta olursa devam edebiliriz.';
      }
      if (text.includes('nasılsın') || text.includes('ne haber')) {
        return 'İyiyim, teşekkür ederim. Bugün ister kod, ister proje planı, ister içerik fikri tarafında birlikte net bir şey çıkarabiliriz.';
      }
      if (text === 'tamam' || text === 'peki' || text === 'olur') {
        return 'Tamamdır. Devam etmek istediğin noktayı yaz, ben oradan sürdüreyim.';
      }
      return null;

    case 'coding_help':
      if (text.includes('foreach') && text.includes('map')) {
        return [
          '`forEach` ve `map` ikisi de JavaScript dizilerinde elemanların üzerinden geçmek için kullanılır; temel fark amaçlarıdır.',
          '',
          '- `forEach`: Her eleman için bir işlem yapar ama yeni bir dizi döndürmez.',
          '- `map`: Her elemanı dönüştürür ve sonuçlardan yeni bir dizi üretir.',
          '',
          '```js',
          'const sayilar = [1, 2, 3];',
          '',
          'sayilar.forEach((sayi) => {',
          '  console.log(sayi * 2);',
          '});',
          '',
          'const ikiyleCarpilmis = sayilar.map((sayi) => sayi * 2);',
          'console.log(ikiyleCarpilmis); // [2, 4, 6]',
          '```',
          '',
          'Kısaca: Ekrana yazdırma, sayaç artırma veya dışarıdaki bir yapıyı güncelleme gibi yan etkiler için `forEach`; veri dönüştürüp yeni bir liste elde etmek için `map` kullan.',
        ].join('\n');
      }

      if (text.includes('topla') || text.includes('toplama') || text.includes('iki say')) {
        return [
          'JavaScript ile iki sayıyı toplayan basit bir fonksiyon şöyle yazılabilir:',
          '',
          '```js',
          'function topla(a, b) {',
          '  return a + b;',
          '}',
          '',
          'console.log(topla(3, 5)); // 8',
          '```',
          '',
          'Bu fonksiyon iki parametre alır ve `+` operatörüyle sonucu döndürür. Kullanıcıdan gelen değerler metin olabilir; böyle bir durumda toplamadan önce `Number(a)` ve `Number(b)` ile sayıya çevirmek daha güvenlidir.',
        ].join('\n');
      }

      if (text.includes('sayaç') || text.includes('sayac') || text.includes('counter')) {
        return [
          'HTML, CSS ve JavaScript ile basit bir sayaç yapmak için değeri bir değişkende tutup butonlarla güncelleyebilirsin.',
          '',
          '```html',
          '<button id="azalt">-</button>',
          '<span id="deger">0</span>',
          '<button id="artir">+</button>',
          '',
          '<script>',
          'let sayac = 0;',
          'const deger = document.getElementById("deger");',
          'document.getElementById("artir").onclick = () => { sayac += 1; deger.textContent = sayac; };',
          'document.getElementById("azalt").onclick = () => { sayac -= 1; deger.textContent = sayac; };',
          '</script>',
          '```',
          '',
          'CSS tarafında butonlara boşluk, renk ve hizalama vererek küçük bir sayaç arayüzü oluşturabilirsin.',
        ].join('\n');
      }

      if (text.includes('cannot read') || text.includes('typeerror') || text.includes('map')) {
        return [
          '`TypeError: cannot read property map` hatası çoğunlukla `.map()` çağırdığın değerin dizi olmamasından kaynaklanır.',
          '',
          'Veri henüz yüklenmeden `items.map(...)` çalışırsa `items` değeri `undefined` olabilir. Güvenli kullanım için başlangıç değerini boş dizi yapabilir veya çağrıdan önce kontrol edebilirsin:',
          '',
          '```js',
          'const safeItems = Array.isArray(items) ? items : [];',
          'return safeItems.map((item) => item.name);',
          '```',
          '',
          'React içinde genellikle `useState([])` ile başlamak ve API cevabının gerçekten dizi döndürdüğünü kontrol etmek bu hatayı çözer.',
        ].join('\n');
      }

      return [
        'Kod yazarken veya bir algoritma kurgularken mantığı şu adımlarla kurmak genelde en iyi sonucu verir:',
        '',
        '1. Önce girdilerin ve beklenen çıktının tipini belirle.',
        '2. İşlemi küçük parçalara bölerek her adımda değişkenler veya fonksiyonlar üzerindeki durumu kontrol et.',
        '3. Hata alıyorsan hata mesajını, almıyorsan elindeki kod örneğini paylaş; birlikte üzerinden geçelim.',
      ].join('\n');

    case 'project_planning':
      return [
        'Aillame’yi BOSS AI içinde provider olarak kullanmak için küçük ama düzenli bir entegrasyon planı izlemek iyi olur.',
        '',
        '1. **Provider sözleşmesini belirle**',
        '   BOSS AI tarafında tek bir arayüz tanımla: `generate(input)`, `health()`, `capabilities()` gibi. Aillame bu sözleşmeye uyan bir adapter olsun.',
        '',
        '2. **Endpoint seçimi yap**',
        '   Genel üretim için `/api/v1/generate` veya daha doğrudan iç kullanım için `/api/core/chat` tercih edilebilir. Dış proje entegrasyonunda public contract daha stabil olduğu için `/api/v1/*` hattı daha güvenli olur.',
        '',
        '3. **Env ve güvenlik ayarla**',
        '   BOSS AI içinde `AILLAME_BASE_URL`, `AILLAME_API_KEY` veya admin olmayan ayrı bir client key kullan. Admin token’ı provider entegrasyonuna koyma.',
        '',
        '4. **Fallback planı kur**',
        '   Aillame cevap vermezse BOSS AI bunu raw 500 gibi göstermesin; `provider_unavailable`, `timeout` veya `degraded` gibi anlaşılır durumlara çevirsin.',
        '',
        '5. **Kısa smoke test yaz**',
        '   Health, kısa Türkçe prompt, kod promptu ve timeout senaryosunu ayrı ayrı test et.',
        '',
        'Başlangıç için en pratik yol: BOSS AI tarafında `AillameProvider` adapter’ı yazıp önce sadece text generation akışını bağlamak, sonra memory/web/görsel yetenekleri capability bazlı genişletmek.',
      ].join('\n');

    case 'seo_article':
      return [
        'Kaygı bozukluğu için SEO uyumlu ama güvenli bir içerik fikri şöyle kurulabilir:',
        '',
        '**Önerilen başlık:**',
        'Kaygı Bozukluğu Nedir? Belirtileri, Günlük Yaşama Etkileri ve Destek Yolları',
        '',
        '**Alt başlık yapısı:**',
        '1. Kaygı bozukluğu nedir?',
        '2. Kaygı ile normal stres arasındaki fark',
        '3. Yaygın belirtiler: zihinsel, bedensel ve davranışsal işaretler',
        '4. Kaygı bozukluğu günlük yaşamı nasıl etkiler?',
        '5. Ne zaman profesyonel destek alınmalı?',
        '6. Günlük hayatta destekleyici alışkanlıklar',
        '7. Sık sorulan sorular',
        '',
        '**Anahtar kelime önerileri:**',
        '- kaygı bozukluğu',
        '- anksiyete belirtileri',
        '- kaygı bozukluğu nedir',
        '- anksiyete ile başa çıkma',
        '- psikolojik destek',
        '',
        '**İçerik tonu:**',
        'Yargılamayan, sakin ve bilgilendirici bir dil kullan. Kesin teşhis koyma; okuyucuyu gerektiğinde uzman desteğine yönlendir. Girişte kısa bir empati cümlesi, gelişmede açıklayıcı örnekler, sonuçta ise profesyonel destek çağrısı iyi çalışır.',
      ].join('\n');

    case 'music_prompt':
      return [
        '**Suno Style Prompt:**',
        'Dark boom bap rap, gritty 90s underground hip-hop, dusty vinyl drums, heavy kick and snare, deep analog bassline, minor-key piano loop, smoky street atmosphere, slow head-nod groove, raw male rap vocal, tense cinematic mood, no pop chorus, no glossy trap drums.',
        '',
        '**Lyric Direction:**',
        'Türkçe rap sözleri yazacaksan karanlık şehir imgeleri, iç hesaplaşma, gece yürüyüşü ve sert ama kontrollü flow kullan. Nakarat kısa ve akılda kalıcı olsun; verse tarafında daha yoğun kafiye tercih edilebilir.',
        '',
        '**Kısa Türkçe ek not:**',
        'Style alanına beat/atmosfer/vokal tarifini; lyric alanına sözleri koy. İkisini karıştırmazsan Suno genelde daha temiz sonuç verir.',
      ].join('\n');

    case 'troubleshooting':
      return [
        'Gemma açılmıyorsa önce üç şeyi ayırmak lazım: server çalışıyor mu, port doğru mu, model/exe path doğru mu?',
        '',
        '**1. Port ve status kontrolü**',
        '```powershell',
        'curl.exe http://127.0.0.1:8080/health',
        'curl.exe http://localhost:3000/api/core/gemma-runtime/status',
        '```',
        '',
        '**2. Warm-up endpointini dene**',
        '```powershell',
        'curl.exe -X POST http://localhost:3000/api/core/gemma-runtime/warmup',
        '```',
        '',
        '**3. .env değerlerini kontrol et**',
        'Özellikle şunlar dolu olmalı:',
        '- `AILLAME_GEMMA_AUTO_START=true`',
        '- `AILLAME_GEMMA_START_ON_APP_BOOT=true`',
        '- `AILLAME_GEMMA_LLAMA_SERVER_EXE=C:\\aillame-llama\\llama-server.exe`',
        '- `AILLAME_GEMMA_MODEL_PATH=C:\\aillame-models\\gguf\\gemma-4-E4B-it-Q4_K_M.gguf`',
        '',
        '**4. En sık nedenler**',
        '- 8080 portu başka süreç tarafından kullanılıyordur.',
        '- Model dosya yolu yanlıştır.',
        '- `llama-server.exe` yoktur veya erişilemiyordur.',
        '- Timeout kısa kalıyordur; büyük GGUF model ilk açılışta yavaş olabilir.',
        '',
        'Status endpointinde `modelPathConfigured:false` veya `llamaServerPathConfigured:false` görürsen sorun koddan çok yerel runtime path ayarıdır.',
      ].join('\n');

    case 'research_summary':
      return [
        'Bu konu için iyi bir araştırma cevabı üç parçalı olmalı: kısa özet, ana teknik zorluklar ve sonraki araştırma adımı.',
        '',
        '- **Özet:** Konunun temel iddiasını 2-3 cümlede anlat.',
        '- **Kanıt/başlıklar:** Kaynaklardan gelen ortak noktaları maddelere ayır.',
        '- **Yorum:** Hangi noktanın belirsiz veya riskli olduğunu açıkça söyle.',
        '',
        'Güncel veri gerekiyorsa web aramasıyla kaynak toplayıp ardından Nano/Gemma sentezi yapmak daha doğru olur.',
      ].join('\n');

    case 'ai_lab_analysis':
      return [
        'AI Lab çıktısını değerlendirirken başarılı sentez ile fallback/degraded çıktıyı ayrı tutmak gerekir.',
        '',
        '- Web Search kaynak sağladıysa final özetin kanıt tabanı odur.',
        '- Gemma veya Ollama kullanılabilir sentez verdiyse kısa sentez olarak eklenebilir.',
        '- Provider fallback, timeout veya reasoning-only döndüyse başarı sayılmamalı; Nano final özeti güvenli kaynaklarla kapatmalı.',
        '',
        'En iyi akış: kaynakları bir kez topla, Nano ile yorumla, hızlı provider başarılıysa sentezle, son turda Nano kalite kontrolüyle tamamla.',
      ].join('\n');

    default:
      if (shouldAskFollowUp(prompt, intent) || includesAny(text, ['bunu yap', 'şunu düzelt', 'yardım eder misin', 'devam et'])) {
        return 'Bunu doğru ilerletebilmem için bir detay gerekiyor: hangi metin, kod, dosya veya adım üzerinde çalışmamı istiyorsun? Kısa bir bağlam verirsen hemen uygulanabilir şekilde devam ederim.';
      }
      return null;
  }
}

export function improveAssistantAnswer(prompt: string, answer: string, messages: ChatMessageLike[] = []): string {
  const intent = detectUserIntent(prompt);
  const normalized = normalizeAssistantAnswer(answer);
  if (!hasAnswerQualityIssue(normalized, intent)) return normalized;
  return buildConversationAnswer(prompt, messages) || normalized || 'Bu konuda net bir cevap üretemedim. İstersen isteğini biraz daralt; ben de adım adım ilerleyeyim.';
}
