import type { NanoTaskAnalysis } from "./types";
import { detectVisibleManualContextInUserMessage } from "./visible-context-policy";

export const DISALLOWED_CLAIM_PHRASES = [
  "dosyanı okudum",
  "dosyayı açıp kontrol ettim",
  "dosyayı açtım",
  "doğru olanı dosyada buldum",
  "workspace'i taradım",
  "projeni inceledim",
  "projeyi taradım",
  "workspace'i taradım ve doğruladım",
  "eksik kısmı ben buldum",
  "eksik kısmı kontrol ettim",
  "tüm dosyada gördüğüm kadarıyla",
  "rag sonucuna göre",
  "rag sonucuna göre...",
  "arama yaptım",
  "index'ten buldum",
  "index'ten tamamını gördüm",
  "referansı açtım",
  "referanstan dosyaya ulaştım",
  "referansı açıp çelişkiyi çözdüm",
  "dosya yolunu takip ettim",
  "kaynak dosyayı okudum",
  "citation üzerinden dosyayı buldum",
  "bu referanstan dosya içeriğine ulaştım",
] as const;

export const SAFE_GROUNDED_ALTERNATIVES = [
  "Paylaştığın snippet'e göre",
  "Görünen context'te",
  "Bu alıntıdan anladığım kadarıyla",
  "Bu snippet tek başına tüm dosya/proje hakkında kesin sonuç için yeterli değil",
  "Dosyanın tamamını görmeden kesin konuşamam",
  "İlgili fonksiyonun tamamını veya hata mesajını paylaşırsan daha net yardımcı olabilirim",
  "Paylaşılan referans etiketine göre",
  "Görünen referans bilgisinde",
  "Bu alıntının referans satırında",
  "Referans etiketi dosyanın tamamına eriştiğim anlamına gelmez",
  "Paylaştığın görünür context içinde bir uyuşmazlık var gibi görünüyor",
  "Bu iki snippet aynı konuda farklı şey söylüyor olabilir",
  "Dosyanın tamamını görmeden hangisinin güncel olduğunu kesin söyleyemem",
  "Güncel olan ilgili fonksiyon/parçayı paylaşırsan daha net yorumlayabilirim",
  "Bu referans etiketi üzerinden dosyayı takip edemem; yalnızca görünen metne göre yorum yapabilirim",
] as const;

function hasVisibleManualContext(message: string): boolean {
  return detectVisibleManualContextInUserMessage(message).hasVisibleManualContext;
}

function isLegalTopic(analysis: NanoTaskAnalysis): boolean {
  const text = analysis.keywords.join(" ").toLocaleLowerCase("tr-TR");
  return /hukuk|dava|sözleşme|ceza|mahkeme|kanun/.test(text);
}

function isPsychologyTopic(analysis: NanoTaskAnalysis): boolean {
  const text = analysis.keywords.join(" ").toLocaleLowerCase("tr-TR");
  return /psikoloji|terapi|depresyon|anksiyete|travma|kriz/.test(text);
}

function isSeoOrWritingTopic(analysis: NanoTaskAnalysis): boolean {
  const text = analysis.keywords.join(" ").toLocaleLowerCase("tr-TR");
  return /seo|içerik|icerik|yazı|yazi|blog|başlık|baslik|metin/.test(text);
}

export function getGroundedResponseStyleGuidance(params: {
  message: string;
  analysis: NanoTaskAnalysis;
}): string {
  if (!hasVisibleManualContext(params.message)) {
    return "";
  }

  const rules: string[] = [
    "Görünür manuel context varsa cevaba bağlam sınırını açıkça belirterek başla.",
    "Gerekirse 'Paylaştığın snippet'e göre' veya 'Görünen context'te' gibi güvenli ifadeler kullan.",
    "Dosyanın tamamına eriştiğini ima eden cümle kurma; yalnızca kullanıcı mesajında görünen alıntıya dayan.",
    "Snippet yetersizse bunu açıkça söyle ve hangi ek bilgiye ihtiyaç duyduğunu net yaz.",
    "Örnek ek bilgi istemleri: ilgili fonksiyonun tamamı, import/dependency satırları, hata çıktısı veya çevreleyen paragraf.",
  ];

  if (params.analysis.kind === "coding") {
    rules.push(
      "Kod yardımında sadece görünen kodu değerlendir; eksik import/dependency veya proje geneli bilgi yoksa varsayım olduğunu belirt.",
      "Çözüm önerilerini 'bu snippet'e göre' sınırıyla ver ve doğrulama için ek satırları iste."
    );
  }

  if (isSeoOrWritingTopic(params.analysis)) {
    rules.push(
      "SEO/yazı yardımında sadece paylaşılan metne göre başlık, alt başlık, okunabilirlik ve anahtar kelime önerisi ver.",
      "Tüm siteyi veya tüm içeriği analiz ettiğini ima etme."
    );
  }

  if (isLegalTopic(params.analysis)) {
    rules.push(
      "Hukuk konularında kesin hüküm veya bağlayıcı hukuki tavsiye verme; paylaşılan metne göre genel bilgilendirme yap.",
      "Gerektiğinde bir hukuk uzmanına danışma önerisini ekle."
    );
  }

  if (isPsychologyTopic(params.analysis) || params.analysis.riskLevel === "high") {
    rules.push(
      "Psikoloji konularında tanı koyma; destekleyici ve güvenli dil kullan.",
      "Acil risk ima eden durumda profesyonel yardım ve acil destek hatlarına başvurma çağrısı yap."
    );
  }

  rules.push(
    "Yanıtlarında otomatik arama, indeks veya dosya erişimi yaptığına dair iddiada bulunma; görünür kullanıcı metni dışına çıkma."
  );

  return rules.join(" ");
}

export function containsDisallowedClaimPhrase(text: string): boolean {
  const normalized = text.toLocaleLowerCase("tr-TR");
  return DISALLOWED_CLAIM_PHRASES.some((phrase) => normalized.includes(phrase));
}
