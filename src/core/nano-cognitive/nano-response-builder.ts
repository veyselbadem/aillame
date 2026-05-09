import {
  buildConversationAnswer,
  detectUserIntent,
  normalizeAssistantAnswer,
  type ConversationIntent,
} from '../conversation/conversation-quality';

type ChatMessageLike = {
  role?: string;
  content?: string;
};

export type NanoResponseIntent =
  | ConversationIntent
  | 'debugging'
  | 'seo_content'
  | 'ai_lab_reflection'
  | 'provider_failure'
  | 'final_summary';

type ProviderFailureInput = {
  provider: string;
  topic?: string;
  reason?: string;
  status?: string;
  fallbackAvailable?: boolean;
};

type LabReflectionInput = {
  topic: string;
  sourceCount?: number;
  preview?: string;
  nextStep?: string;
  provider?: string;
  providerOutput?: string;
  degradedReason?: string;
  webSearchDone?: boolean;
};

const WEAK_FALLBACK_PATTERNS = [
  /anlayamad[ıi]m/i,
  /emin de[ğg]ilim/i,
  /detay ver/i,
  /model .*haz[ıi]r de[ğg]il/i,
  /pro modunu deneyin/i,
  /tam kar[şs][ıi]layacak/i,
  /yanıtı tamamlayamadı/i,
  /kısa bir mesajla tekrar deneyin/i,
  /kod mantığıyla düşünelim/i,
];

function normalizeForMatch(value: string): string {
  return value.trim().toLocaleLowerCase('tr-TR');
}

function includesAny(text: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

function compactPreview(value = '', maxLength = 260): string {
  const normalized = normalizeAssistantAnswer(value).replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength).trim()}...` : normalized;
}

export function detectNanoResponseIntent(prompt: string): NanoResponseIntent {
  const text = normalizeForMatch(prompt);
  const baseIntent = detectUserIntent(prompt);

  if (baseIntent === 'image_generation') return baseIntent;

  if (
    includesAny(text, ['timeout', 'hata', 'açılmıyor', 'çalışmıyor', 'debug', 'log', 'port', 'stack']) ||
    (includesAny(text, ['gemma', 'ollama', 'runtime', 'server']) && includesAny(text, ['ne yapmalıyım', 'sorun', 'neden']))
  ) {
    return 'debugging';
  }

  if (baseIntent === 'seo_article') return 'seo_content';
  return baseIntent;
}

export function validateNanoAnswerQuality(answer?: string): { ok: boolean; normalized: string; reason?: string } {
  const normalized = normalizeAssistantAnswer(answer || '');
  if (!normalized) return { ok: false, normalized, reason: 'empty' };
  if (/<think>|<\/think>|reasoning_content|\bthinking\b/i.test(answer || '')) {
    return { ok: false, normalized, reason: 'raw_reasoning' };
  }
  if (/&#x27;|&quot;|&amp;|&lt;|&gt;/i.test(answer || '')) {
    return { ok: false, normalized, reason: 'html_entity' };
  }
  if (/Ã|Ä|Å/.test(normalized) && !/[çğıöşüÇĞİÖŞÜ]/.test(normalized)) {
    return { ok: false, normalized, reason: 'possible_mojibake' };
  }
  if (normalized.length < 20) return { ok: false, normalized, reason: 'too_short' };
  if (WEAK_FALLBACK_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { ok: false, normalized, reason: 'weak_fallback' };
  }
  return { ok: true, normalized };
}

export function buildIntentAwareNanoAnswer(prompt: string, history: ChatMessageLike[] = []): string {
  const existing = buildConversationAnswer(prompt, history);
  if (existing) return normalizeAssistantAnswer(existing);

  const intent = detectNanoResponseIntent(prompt);
  const text = normalizeForMatch(prompt);

  switch (intent) {
    case 'casual_chat':
      return [
        'Merhaba, ben Aillame Nano. Kısa sohbetin yanında kod, proje planı, SEO/içerik, müzik promptu, araştırma özeti ve yerel runtime sorunlarında yardımcı olabilirim.',
        '',
        'Bir şey sorarsan önce niyetini anlamaya çalışırım; basit bir konuysa kısa anlatırım, teknik bir konuysa örnek ve adımlarla açarım.',
      ].join('\n');

    case 'coding_help':
      if (text.includes('topla') || text.includes('toplama') || text.includes('iki say')) {
        return [
          'JavaScript ile iki sayıyı toplayan basit bir fonksiyon şöyle yazılabilir:',
          '',
          '```javascript',
          'function topla(a, b) {',
          '  return a + b;',
          '}',
          '',
          'console.log(topla(3, 5)); // 8',
          '```',
          '',
          '`topla` fonksiyonu iki parametre alır, bu değerleri `+` operatörüyle toplar ve sonucu döndürür. Gerçek projede kullanıcıdan gelen değerler string olabileceği için gerekirse `Number(a)` gibi dönüşüm yapmak iyi olur.',
        ].join('\n');
      }

      if (text.includes('sayaç') || text.includes('counter')) {
        return [
          'HTML, CSS ve JavaScript ile basit bir sayaç örneği şöyle kurulabilir:',
          '',
          '```html',
          '<button id="azalt">-</button>',
          '<span id="deger">0</span>',
          '<button id="artir">+</button>',
          '',
          '<script>',
          'let sayac = 0;',
          'const deger = document.getElementById("deger");',
          '',
          'document.getElementById("artir").onclick = () => {',
          '  sayac += 1;',
          '  deger.textContent = sayac;',
          '};',
          '',
          'document.getElementById("azalt").onclick = () => {',
          '  sayac -= 1;',
          '  deger.textContent = sayac;',
          '};',
          '</script>',
          '```',
          '',
          'Mantık basit: sayaç değerini bir değişkende tutuyoruz, butonlara tıklandığında değişkeni güncelliyoruz ve ekrandaki metni yeniden yazıyoruz.',
        ].join('\n');
      }

      if (text.includes('cannot read') || text.includes('map')) {
        return [
          '`TypeError: cannot read property map` hatası genellikle `.map()` çağırdığın değerin gerçekten bir dizi olmamasından kaynaklanır.',
          '',
          'Örneğin veri henüz yüklenmeden `items.map(...)` çalışırsa `items` değeri `undefined` olabilir. Çözüm olarak başlangıç değerini boş dizi yapmak veya çağrıdan önce kontrol etmek gerekir:',
          '',
          '```javascript',
          'const safeItems = Array.isArray(items) ? items : [];',
          'return safeItems.map((item) => <div key={item.id}>{item.name}</div>);',
          '```',
          '',
          'React tarafında en temiz yaklaşım state başlangıcını `useState([])` yapmak ve API cevabının beklenen dizi formatında geldiğini doğrulamaktır.',
        ].join('\n');
      }

      return [
        'Kodlama ile ilgili bu konuda temel mantığı şu şekilde kurabiliriz:',
        '',
        '```javascript',
        '// Örnek yapı',
        'function ornekFonksiyon(deger) {',
        '  return deger * 2;',
        '}',
        '```',
        '',
        'Kod yazarken en önemli nokta, veri akışını ve mantıksal operatörleri doğru kurgulamaktır. Eğer elinde spesifik bir hata veya kod parçası varsa paylaşabilirsin; böylece doğrudan çözüm üretebiliriz.',
      ].join('\n');

    case 'debugging':
    case 'troubleshooting': {
      const mentionsGemma = text.includes('gemma');
      return [
        `${mentionsGemma ? 'Gemma' : 'Bu hata'} tarafında önce sorunu üç parçaya ayırmak iyi olur: servis çalışıyor mu, doğru endpoint/port kullanılıyor mu, konfigürasyon değerleri process içinde gerçekten okunuyor mu?`,
        '',
        '1. **Durumu ölç:** ilgili status/health endpointini çağır ve `running`, `configured`, `lastError` alanlarını kontrol et.',
        '2. **Prompt ve context’i küçült:** timeout varsa ilk testte kısa Türkçe bir prompt kullan; büyük context veya uzun kaynak metni modeli yavaşlatabilir.',
        '3. **Runtime ayarlarını kontrol et:** Gemma için port, model path, llama-server path ve context size değerleri uyumlu olmalı. `-c 8192` çoğu test için iyi başlangıçtır; gerekirse `16384` denenebilir.',
        '4. **Fallback’i panik sebebi yapma:** provider cevap vermezse Nano/Web Search güvenli biçimde devam etmeli; ama bu çıktı başarılı analiz gibi sayılmamalı.',
        '',
        'Elindeki gerçek hata mesajını veya status JSON’unu paylaşırsan hangi halkada koptuğunu daha net ayırabilirim.',
      ].join('\n');
    }

    case 'project_planning':
      return [
        'Bunu küçük bir entegrasyon planına bölelim:',
        '',
        '1. **Hedefi netleştir:** Aillame hangi iş için provider olacak; sohbet, araştırma, kod desteği veya çoklu provider routing?',
        '2. **Sözleşme belirle:** `generate`, `health`, `models/capabilities` gibi sabit bir adapter arayüzü tanımla.',
        '3. **Endpoint/env ayarla:** base URL, API key, timeout ve provider seçimini ayrı env değerleriyle yönet; admin token’ı client entegrasyonuna koyma.',
        '4. **Fallback davranışı yaz:** timeout, provider kapalı ve boş cevap durumlarını structured code ile yakala.',
        '5. **Smoke test ekle:** kısa Türkçe prompt, kod promptu, timeout ve yanlış model senaryosunu ayrı test et.',
        '',
        'Başlangıç için en güvenli yol, önce yalnızca text generation adapter’ını bağlamak; stabil olunca memory, Web Search ve AI Lab yeteneklerini capability bazlı açmak.',
      ].join('\n');

    case 'seo_content':
      return [
        'SEO içeriğini sadece başlık listesi gibi değil, okuyucunun arama niyetine göre kurmak gerekir.',
        '',
        '**Başlık önerisi:**',
        'Kaygı Bozukluğu Nedir? Belirtileri, Günlük Yaşama Etkileri ve Destek Yolları',
        '',
        '**Alt başlıklar:**',
        '- Kaygı bozukluğu nedir?',
        '- Normal stres ile kaygı bozukluğu arasındaki fark',
        '- Zihinsel, bedensel ve davranışsal belirtiler',
        '- Günlük yaşamda nasıl etkiler yaratır?',
        '- Ne zaman profesyonel destek alınmalı?',
        '',
        '**Anahtar kelimeler:** kaygı bozukluğu, anksiyete belirtileri, kaygı ile başa çıkma, psikolojik destek.',
        '',
        'Psikoloji içeriklerinde kesin teşhis dili kullanmamak önemli; güvenli ton, bilgilendirme ve uzman desteğine yönlendirme daha doğru olur.',
      ].join('\n');

    case 'music_prompt':
      return [
        '**Suno Style Prompt:**',
        'Dark boom bap rap, gritty 90s underground hip-hop, dusty vinyl drum loop, heavy kick and snare, deep analog bass, minor piano sample, smoky night street atmosphere, raw male rap vocal, tense cinematic mood, 88 BPM, no glossy trap drums.',
        '',
        '**Lyric Direction:**',
        'Türkçe sözlerde karanlık şehir imgeleri, iç hesaplaşma, gece yürüyüşü ve sert ama kontrollü flow kullan. Verse yoğun kafiye taşısın; nakarat kısa, tekrar edilebilir ve atmosferi güçlendiren bir cümleye dayansın.',
        '',
        'Suno’da style alanına beat/atmosfer/vokal tarifini, lyric alanına gerçek sözleri koymak daha temiz sonuç verir.',
      ].join('\n');

    case 'research_summary':
      return [
        'Bu konu için Nano iyi bir araştırma özeti üretirken üç şeyi ayırmalı: kaynaklardan gelen ortak tema, belirsiz kalan noktalar ve uygulanabilir sonuç.',
        '',
        '- **Ortak tema:** kaynakların aynı noktada birleştiği ana fikir.',
        '- **Ana bulgular:** teknik, etik veya operasyonel başlıkların kısa dökümü.',
        '- **Belirsizlik:** güncel veri veya uzman yorumu gerektiren alanlar.',
        '- **Sonuç:** kullanıcı için net, kısa ve uygulanabilir kapanış.',
        '',
        'Güncel bilgi gerekiyorsa Web Search kaynakları toplandıktan sonra Nano final özetini bu kaynaklara yaslamalı; provider fallback metinlerini kanıt gibi kullanmamalı.',
      ].join('\n');

    case 'general_knowledge': {
      const direct = getGeneralKnowledgeResponse(prompt);
      if (direct) return direct;
      
      const topic = prompt.replace(/nedir|ne demek|\?|hakkında bilgi ver|açıklar mısın|anlatır mısın/gi, '').trim();
      const topicUpper = topic.toUpperCase();
      
      const techKeywords = ['dil', 'programlama', 'yazılım', 'framework', 'kütüphane', 'api', 'server', 'veritabanı', 'bulut', 'frontend', 'backend'];
      const isTech = includesAny(topic.toLowerCase(), techKeywords);

      return [
        `${topicUpper} konusu, ${isTech ? 'teknoloji ve yazılım dünyasında' : 'genel çerçevede'} temel prensipler ve yapılar üzerine kurulmuş bir kavramdır.`,
        '',
        `Genel bir tanımlama yapmak gerekirse ${topic}, kendi alanında önemli bir yer tutar ve çeşitli alt bileşenlerden oluşur. Bu konuda daha derinlemesine bir analiz veya en güncel verileri elde etmek isterseniz, Gemma veya Web Search modüllerini aktive ederek kapsamlı bir araştırma başlatabiliriz.`,
        '',
        `Şimdilik bu temel çerçeve üzerinden ilerleyebiliriz. Eğer spesifik olarak merak ettiğin bir detay varsa lütfen sor.`,
      ].join('\n');
    }

    case 'image_generation':
      return [
        'Görsel üretim isteğini algıladım. Sistem şu an bu isteği SDXL (IGM) modülüne yönlendiriyor.',
        '',
        'Üretim başladığında İş No ile takip edebilirsin. Eğer bir sorun oluşursa Görsel Üretim panelinden manuel olarak da devam edebilirsin.',
        '',
        'İstersen bu görsel için prompt detaylarını daha da zenginleştirebilirim.',
      ].join('\n');

    case 'ai_lab_analysis':
    case 'ai_lab_reflection':
      return [
        'AI Lab akışında Nano’nun görevi sadece “sonraki modeli seçmek” değil; gelen çıktının güvenilir olup olmadığını da yorumlamaktır.',
        '',
        '- Web Search kaynak sağladıysa finalin kanıt zemini odur.',
        '- Gemma/Ollama kullanılabilir sentez verdiyse kısa destek olarak eklenebilir.',
        '- Timeout, empty response, reasoning-only veya placeholder çıktı varsa bu degraded sayılmalı.',
        '- Final özet, sağlam kaynaklar ve Nano’nun kendi değerlendirmesiyle kurulmalı.',
      ].join('\n');

    default:
      return [
        'Bunu yanıtlamak için konuyu önce sadeleştireyim: amacımız neyi anlamak, üretmek veya çözmek istediğini netleştirmek.',
        '',
        'Şu şekilde ilerleyebiliriz:',
        '1. Konunun hedefini tek cümleyle belirleyelim.',
        '2. Gerekiyorsa örnek veya mevcut durumu ekleyelim.',
        '3. Ben de buna göre kısa açıklama, adım adım plan veya örnekli çözüm hazırlayayım.',
        '',
        'Makul varsayımla devam etmemi istersen doğrudan ilk taslağı çıkarabilirim.',
      ].join('\n');
  }
}

export function enrichNanoAnswer(prompt: string, answer?: string, history: ChatMessageLike[] = []): string {
  const quality = validateNanoAnswerQuality(answer);
  if (quality.ok) return quality.normalized;
  return buildIntentAwareNanoAnswer(prompt, history);
}

export function buildProviderFailureComment(input: ProviderFailureInput): string {
  const providerName = input.provider || 'Provider';
  const reason = input.reason || input.status || 'degraded';
  const fallbackLine = input.fallbackAvailable
    ? 'Bu yüzden finali Web Search, Nano değerlendirmesi ve varsa sağlam provider çıktılarıyla sürdürmek daha güvenli.'
    : 'Bu çıktı başarılı analiz gibi kullanılmamalı; kullanıcıya sade bir degraded notu verilmesi yeterli.';

  return [
    `${providerName} bu turda kullanılabilir bir sentez üretemedi.`,
    `Neden: ${reason}.`,
    fallbackLine,
    input.topic ? `Konu "${input.topic}" için finalde yalnızca güvenilir kaynak ve sağlam analizler kullanılmalı.` : '',
  ].filter(Boolean).join(' ');
}

export function buildNanoWebSearchReflection(input: LabReflectionInput): string {
  const preview = compactPreview(input.preview, 240);
  return [
    `Web Search ${input.sourceCount || 0} kaynak getirdi ve konu için ilk kanıt zemini oluştu.`,
    preview ? `Ortak çerçeve: ${preview}` : 'Kaynaklar başlık/snippet düzeyinde değerlendirilerek ortak tema çıkarılmalı.',
    input.nextStep ? `Sonraki adım: ${input.nextStep}` : 'Sonraki adım: kaynakları tek kez kullanıp senteze geçmek.',
    'Aynı oturumda gereksiz tekrar arama yapmak yerine Nano finalde kaynakları sade, anlaşılır ve doğal Türkçe ile birleştirmeli.',
  ].join(' ');
}

export function buildNanoProviderSuccessReflection(input: LabReflectionInput): string {
  const provider = input.provider || 'Provider';
  const preview = compactPreview(input.providerOutput, 220);
  return [
    `${provider} kullanılabilir bir hızlı sentez üretti.`,
    preview ? `Kısa içerik: ${preview}` : '',
    'Bu çıktı finalde yardımcı kanıt olarak kullanılabilir; yine de Nano son turda tekrar, açıklık, Türkçe karakter ve raw reasoning kontrolü yapmalı.',
    input.nextStep ? `Sonraki adım: ${input.nextStep}` : '',
  ].filter(Boolean).join(' ');
}

export function buildNanoInitialReflection(input: LabReflectionInput): string {
  return [
    `Konu "${input.topic}" için önce hedefi ve güvenli bilgi zemini netleştirmek gerekiyor.`,
    input.webSearchDone
      ? 'Web Search zaten çalışmış görünüyor; tekrar arama yerine eldeki kaynakları yorumlamak daha verimli.'
      : 'Güncel veya kaynak gerektiren bir konuysa Web Search bir kez kaynak toplamalı.',
    input.nextStep ? `Sonraki adım: ${input.nextStep}` : 'Sonraki adım: seçili provider ile kısa sentez, ardından Nano final kalite kontrolü.',
  ].join(' ');
}

export function getGeneralKnowledgeResponse(prompt: string): string | null {
  const p = prompt.trim().toLowerCase();

  if (p.includes('evren')) {
    return 'Evren; tüm galaksileri, yıldızları, gezegenleri, gaz ve toz bulutlarını, karanlık maddeyi ve enerjiyi kapsayan uzay-zaman bütünüdür. Bilimsel görüşe göre evren yaklaşık 13,8 milyar yıl önce Büyük Patlama (Big Bang) ile oluşmuştur ve o zamandan beri genişlemeye devam etmektedir. Evrenin içinde milyarlarca galaksi bulunur ve her galaksi kendi içinde milyarlarca yıldız barındırır. Dünya, bu uçsuz bucaksız yapının içindeki Samanyolu Galaksisi’nde yer alan küçük bir gezegendir.';
  }
  if (p.includes('güneş sistemi')) {
    return 'Güneş Sistemi; merkezdeki Güneş ve onun kütleçekimi etkisiyle yörüngelerinde dönen sekiz gezegen, onların uyduları, cüce gezegenler, asteroitler ve kuyruklu yıldızlardan oluşur. Gezegenler Güneş’e yakınlıklarına göre Merkür, Venüs, Dünya, Mars (iç gezegenler), Jüpiter, Satürn, Uranüs ve Neptün (dış gezegenler/gaz devleri) olarak sıralanır. Yaklaşık 4,6 milyar yıl önce bir devasa moleküler bulutun çökmesiyle oluşmuştur.';
  }
  if (p.includes('fotosentez')) {
    return 'Fotosentez; bitkilerin, alglerin ve bazı bakterilerin güneş ışığını kullanarak karbondioksit ve sudan organik besin (glikoz) ve oksijen üretmesi sürecidir. Bu süreçte klorofiller ışık enerjisini emer ve kimyasal enerjiye dönüştürür. Fotosentez, yeryüzündeki yaşamın temelidir çünkü hem besin zincirinin başlangıcını oluşturur hem de atmosferdeki oksijen dengesini sağlar.';
  }
  if (p.includes('yıldız')) {
    return 'Yıldız, kendi ışığını ve ısısını üreten, kütleçekimi ile bir arada tutulan devasa bir plazma küresidir. Yıldızların merkezinde gerçekleşen nükleer füzyon süreci, hidrojenin helyuma dönüşmesini sağlar ve bu sırada muazzam bir enerji açığa çıkar. Gece gökyüzünde gördüğümüz çoğu yıldız Samanyolu Galaksisi’ndedir; Güneş de Dünya’ya en yakın ve yaşamın kaynağı olan yıldızdır.';
  }
  if (p.includes('html nedir')) {
    return 'HTML (HyperText Markup Language), web sayfalarının yapısını ve içeriğini oluşturmak için kullanılan standart işaretleme dilidir. HTML bir programlama dili değil, tarayıcıya metinlerin, görsellerin ve diğer öğelerin sayfada nasıl yerleşeceğini bildiren bir yapı taşıdır. Sayfa başlıkları, paragraflar, linkler ve formlar gibi tüm görsel elemanlar HTML etiketleri (tags) ile tanımlanır.';
  }
  if (p.includes('css nedir')) {
    return 'CSS (Cascading Style Sheets), HTML ile oluşturulan web sayfalarının görsel tasarımını ve düzenini kontrol etmek için kullanılan bir stil dilidir. Renkler, yazı tipleri, boşluklar, hizalamalar ve farklı ekran boyutlarına göre değişen mizanpajlar (responsive design) CSS ile ayarlanır. CSS sayesinde içerik (HTML) ve tasarım birbirinden ayrılarak web sitelerinin yönetimi kolaylaştırılır.';
  }
  if (p.includes('yapay zeka')) {
    return 'Yapay zeka (AI); bilgisayar sistemlerinin normalde insan zekası gerektiren öğrenme, problem çözme, karar verme ve dil anlama gibi görevleri yerine getirme yeteneğidir. Makine öğrenmesi ve derin öğrenme gibi alt dallarıyla verileri analiz ederek deneyimlerden öğrenir. Günümüzde otonom araçlardan tıbbi teşhis sistemlerine, yaratıcı içerik üretiminden kişisel asistanlara kadar geniş bir alanda kullanılmaktadır.';
  }
  if (p.includes('ekonomi nedir')) return 'Ekonomi, kaynakların sınırlı olduğu bir ortamda insanların ihtiyaçlarını karşılamak için üretilen mal ve hizmetlerin üretimi, dağıtımı ve tüketimi ile ilgilenen sosyal bir bilim dalıdır.';
  if (p.includes('javascript nedir')) return 'JavaScript, web sayfalarına etkileşim ve dinamik davranış kazandırmak için kullanılan, modern web geliştirmenin temel taşlarından biri olan programlama dilidir. HTML sayfanın yapısını, CSS görünümünü, JavaScript ise davranışını kontrol eder. Örneğin butona tıklanınca menü açılması, form kontrolü yapılması veya dinamik veri gösterilmesi JavaScript ile sağlanabilir.';
  if (p.includes('psikoloji nedir')) return 'Psikoloji, insan ve hayvan davranışlarını, zihinsel süreçleri ve bunların altında yatan biyolojik, sosyal nedenleri inceleyen bilim dalıdır. Duygu, düşünce, öğrenme, bellek, motivasyon ve kişilik gibi konuları bilimsel yöntemlerle araştırır. Klinik psikoloji, gelişim psikolojisi, sosyal psikoloji ve bilişsel psikoloji gibi alt alanlarıyla hem bireysel yaşamı hem de toplumsal davranışları anlamaya yardımcı olur.';
  if (p.includes('hukuk nedir')) return 'Hukuk, toplum yaşamını düzenleyen, devlet eliyle yaptırıma bağlanmış olan ve adaleti sağlamayı amaçlayan kurallar bütünüdür. Kişilerin haklarını, özgürlüklerini, sorumluluklarını ve kurumlar arasındaki ilişkileri belirler. Ceza hukuku, medeni hukuk, idare hukuku ve ticaret hukuku gibi alanlarıyla toplumsal düzenin öngörülebilir ve güvenli işlemesine katkı sağlar.';
  if (p.includes('enflasyon nedir')) return 'Enflasyon, bir ekonomide mal ve hizmet fiyatlarının genel seviyesinin sürekli ve belirgin bir şekilde artması, dolayısıyla paranın satın alma gücünün düşmesidir.';
  if (p.includes('arz ve talep nedir')) return 'Arz ve talep, piyasa ekonomisinde fiyatların ve üretim miktarlarının belirlenmesini sağlayan temel mekanizmadır; arz satıcıların sunmaya hazır olduğu miktarı, talep ise alıcıların almak istediği miktarı temsil eder.';
  if (p.includes('api nedir')) return 'API (Application Programming Interface), farklı yazılım uygulamalarının birbirleriyle standart ve güvenli bir şekilde veri alışverişi yapmasını sağlayan bir arayüzdür.';
  if (p.includes('algoritma nedir')) return 'Algoritma, belirli bir sorunu çözmek veya bir görevi yerine getirmek için tanımlanmış, mantıksal ve adım adım izlenen talimatlar dizisidir.';
  if (p.includes('web sitesi nedir')) return 'Web sitesi, internet üzerinde bir alan adı altında toplanmış, metin, görsel ve videolar içeren, birbirine bağlı dijital sayfalar bütünüdür.';
  
  if (p.includes('rust nedir') || p.includes('rust programlama')) {
    return 'Rust, performans ve bellek güvenliğine odaklanan modern bir programlama dilidir. C ve C++ gibi sistem programlama alanlarında kullanılabilir, ancak bellek hatalarını azaltmak için sahiplik ve ödünç alma (ownership and borrowing) gibi kurallar kullanır. WebAssembly, oyun motorları, işletim sistemi bileşenleri, komut satırı araçları ve yüksek performanslı servislerde tercih edilebilir.';
  }

  return null;
}
