export type NanoKnowledgeCard = {
  id: string;
  domain: string;
  title: string;
  content: string;
  tags: string[];
};

export const NANO_KNOWLEDGE_BASE: readonly NanoKnowledgeCard[] = [
  {
    id: "reasoning-decompose",
    domain: "reasoning",
    title: "Karmaşık görev çözme",
    content: "Karmaşık bir görev önce hedef, kısıtlar, mevcut bilgi, eksikler, alt görevler ve doğrulama adımlarına ayrılır. Yanıt önce en güvenilir varsayımları belirtmeli, sonra uygulanabilir çözüm vermelidir.",
    tags: ["analiz", "plan", "karmaşık", "mantık", "görev"],
  },
  {
    id: "reasoning-uncertainty",
    domain: "reasoning",
    title: "Belirsizlik yönetimi",
    content: "Model emin olmadığı bilgide tahminini açıkça ayırmalı, yüksek riskli konularda kesin hüküm vermemeli ve doğrulanabilir kontrol noktaları sunmalıdır.",
    tags: ["belirsizlik", "risk", "doğrulama", "güven"],
  },
  {
    id: "coding-debug",
    domain: "software",
    title: "Hata ayıklama akışı",
    content: "Yazılım hatası incelenirken önce yeniden üretme adımları, hata mesajı, beklenen davranış, gerçek davranış, ilgili dosyalar ve en küçük güvenli düzeltme belirlenir. Değişiklik testle doğrulanır.",
    tags: ["kod", "bug", "debug", "test", "typescript"],
  },
  {
    id: "math-problem-solving",
    domain: "math",
    title: "Matematik problemi çözme",
    content: "Matematikte değişkenleri tanımla, verilenleri yaz, uygun yöntemi seç, işlemleri sırayla yap ve sonucu birim veya bağlamla kontrol et.",
    tags: ["matematik", "hesapla", "denklem", "olasılık"],
  },
  {
    id: "education-explain",
    domain: "education",
    title: "Öğretici anlatım",
    content: "İyi bir öğretici cevap önce kısa sezgi verir, sonra adım adım açıklar, ardından örnek ve mini kontrol sorusu ekler. Dil öğrencinin seviyesine göre sadeleşir.",
    tags: ["eğitim", "ders", "öğret", "öğrenci"],
  },
  {
    id: "science-method",
    domain: "science",
    title: "Bilimsel yöntem",
    content: "Bilimsel yöntem gözlem, hipotez, deney veya kanıt toplama, analiz, sonuç ve tekrarlanabilirlik ilkelerine dayanır. İyi açıklama iddia ile kanıtı ayırır.",
    tags: ["bilim", "kanıt", "hipotez", "deney"],
  },
  {
    id: "history-context",
    domain: "general-culture",
    title: "Tarihsel bağlam",
    content: "Tarihsel olaylar tek nedene indirgenmemeli; ekonomi, coğrafya, kurumlar, teknoloji, kültür ve liderlik gibi etkenler birlikte değerlendirilmelidir.",
    tags: ["tarih", "genel kültür", "neden", "bağlam"],
  },
  {
    id: "economy-risk",
    domain: "economy",
    title: "Ekonomik analiz",
    content: "Ekonomi analizinde veri tarihi, kaynak, temel varsayımlar, riskler ve alternatif senaryolar belirtilmelidir. Kişisel yatırım tavsiyesi ile genel bilgi ayrılmalıdır.",
    tags: ["ekonomi", "finans", "risk", "yatırım"],
  },
  {
    id: "writing-structure",
    domain: "writing",
    title: "İyi metin yapısı",
    content: "Güçlü metin açık amaç, net hedef kitle, tutarlı ton, güçlü giriş, düzenli gelişme ve kısa sonuç içerir. Gereksiz süs yerine anlam yoğunluğu tercih edilir.",
    tags: ["yazı", "metin", "yaratıcı", "iletişim"],
  },
  {
    id: "local-llm-role",
    domain: "local-ai",
    title: "Yerel LLM davranışı",
    content: "Yerel bir LLM hızlı, gizlilik dostu ve çevrimdışı olabilir; ancak güncel bilgi ve büyük dünya bilgisi sınırlıysa bunu açıkça belirtmeli ve gerektiğinde araç veya kaynak istemelidir.",
    tags: ["yerel", "llm", "model", "gizlilik", "offline"],
  },
];
