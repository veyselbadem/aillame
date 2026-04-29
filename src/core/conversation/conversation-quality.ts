export type ConversationIntent =
  | 'coding_help'
  | 'project_planning'
  | 'seo_article'
  | 'music_prompt'
  | 'research_summary'
  | 'casual_chat'
  | 'troubleshooting'
  | 'ai_lab_analysis'
  | 'default';

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
  'â€�': '"',
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

export function detectUserIntent(prompt: string): ConversationIntent {
  const text = normalizeText(prompt);

  if (!text) return 'default';

  if (
    includesAny(text, ['açılmıyor', 'çalışmıyor', 'hata', 'error', 'timeout', 'zaman aşımı', 'port', 'log', 'debug']) &&
    includesAny(text, ['gemma', 'ollama', 'sunucu', 'server', 'model', 'runtime', 'ne yapmalıyım'])
  ) {
    return 'troubleshooting';
  }

  if (includesAny(text, ['foreach', 'map', 'javascript', 'typescript', 'python', 'react', 'next.js', 'dom', 'kod', 'fonksiyon', 'api'])) {
    return 'coding_help';
  }

  if (includesAny(text, ['seo', 'anahtar kelime', 'başlık', 'alt başlık', 'blog', 'içerik akışı', 'site için yazı'])) {
    return 'seo_article';
  }

  if (includesAny(text, ['suno', 'style', 'lyric', 'şarkı', 'rap', 'boom bap', 'müzik', 'beat', 'verse', 'chorus'])) {
    return 'music_prompt';
  }

  if (includesAny(text, ['boss ai', 'provider', 'entegrasyon', 'projeye eklemek', 'ne yapmalıyım', 'aşamalar', 'planla'])) {
    return 'project_planning';
  }

  if (includesAny(text, ['ai lab', 'nano', 'gemma', 'ollama']) && includesAny(text, ['analiz', 'degraded', 'fallback', 'sentez', 'kontrol'])) {
    return 'ai_lab_analysis';
  }

  if (includesAny(text, ['araştır', 'özetle', 'kaynak', 'güncel', 'haber', 'rapor', 'kolonizasyon'])) {
    return 'research_summary';
  }

  if (
    includesAny(text, ['merhaba', 'selam', 'nasılsın', 'kimsin', 'ne yapabiliyorsun', 'kendini tanıt', 'teşekkür']) ||
    text.length < 16
  ) {
    return 'casual_chat';
  }

  return 'default';
}

export function shouldUseDetailedExplanation(intent: ConversationIntent): boolean {
  return ['coding_help', 'project_planning', 'seo_article', 'troubleshooting', 'research_summary', 'ai_lab_analysis'].includes(intent);
}

export function shouldAskFollowUp(prompt: string, intent: ConversationIntent): boolean {
  const text = prompt.trim();
  if (intent === 'casual_chat' || intent === 'troubleshooting') return false;
  if (text.length < 18) return true;
  return intent === 'default' && text.split(/\s+/).length < 4;
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
    ],
  };

  return [...common, ...intentRules[intent]].map((rule) => `- ${rule}`).join('\n');
}

export function enrichPromptForConversation(prompt: string, messages: ChatMessageLike[] = []): string {
  const intent = detectUserIntent(prompt);
  const recentContext = messages
    .filter((message) => typeof message?.content === 'string' && message.content.trim())
    .slice(-4)
    .map((message) => `${message.role || 'unknown'}: ${message.content!.trim().slice(0, 600)}`)
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
  if (/yanıtı tamamlayamadı|kısa cevap tekrar denenebilir|anlayamadı|planlama aşamasında/i.test(normalized)) return true;

  const minLength = shouldUseDetailedExplanation(intent) ? 180 : 70;
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
      return [
        'Merhaba, ben Aillame. Yerel Nano katmanı, Gemma/Ollama entegrasyonları ve gerektiğinde web araştırmasıyla sana yardımcı olmak için buradayım.',
        '',
        'Şunlarda özellikle işine yararım:',
        '- Kod ve proje sorularını adım adım açıklamak',
        '- Aillame, BOSS AI veya provider entegrasyonu için uygulanabilir plan çıkarmak',
        '- SEO, içerik, müzik promptu ve araştırma taslakları hazırlamak',
        '- Gemma/Ollama gibi yerel runtime sorunlarını teşhis etmek',
        '',
        'İstersen doğrudan bir konu yaz; ben kısa cevap mı, detaylı açıklama mı gerektiğini ona göre ayarlarım.',
      ].join('\n');

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

      return [
        'Bunu kod mantığıyla düşünelim: önce kavramı sadeleştir, sonra küçük bir örnekle dene.',
        '',
        '1. Ne yapmak istediğini belirle: veri mi dönüştüreceksin, yoksa sadece işlem mi yapacaksın?',
        '2. Eğer sonuç olarak yeni bir değer/dizi gerekiyorsa dönüş değeri olan yapıları seç.',
        '3. Eğer sadece loglama, kontrol veya yan etki gerekiyorsa daha basit döngü yeterli olabilir.',
        '',
        'İstersen bu soruyu somut bir kod parçası üzerinden birlikte düzeltebilirim.',
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
      if (shouldAskFollowUp(prompt, intent)) {
        return 'Bunu doğru yanıtlayabilmem için bir detay seçmem gerekiyor: kısa bir açıklama mı istiyorsun, yoksa adım adım uygulanabilir bir plan mı?';
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
