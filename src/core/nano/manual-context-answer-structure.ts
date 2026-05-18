import { detectManualContextInsufficiency } from "./insufficient-context-policy";
import { detectManualContextConflicts } from "./manual-context-conflict-policy";
import { detectVisibleManualContextInUserMessage } from "./visible-context-policy";
import { detectVisibleManualContextReferences } from "./visible-reference-policy";

export type ManualContextAnswerStructureTone =
  | "short_clear"
  | "technical_concise"
  | "editorial_structured"
  | "sensitive_safe";

export type ManualContextAnswerStructureType =
  | "none"
  | "coding_snippet"
  | "seo_writing"
  | "legal_psychology"
  | "generic_manual_context";

export interface ManualContextAnswerScenario {
  hasManualContext: boolean;
  hasReferences: boolean;
  hasInsufficiency: boolean;
  hasConflict: boolean;
  suggestedStructure: ManualContextAnswerStructureType;
  safeTone: ManualContextAnswerStructureTone;
  shouldAskForMoreContext: boolean;
}

function detectScenarioType(message: string): ManualContextAnswerStructureType {
  const normalized = message.toLocaleLowerCase("tr-TR");

  if (/(hukuk|dava|mahkeme|sozlesme|sözleşme|kanun|psikoloji|terapi|depresyon|anksiyete|travma)/i.test(normalized)) {
    return "legal_psychology";
  }

  if (/(seo|icerik|içerik|metin|blog|başlık|baslik|landing|description|aciklama|açıklama)/i.test(normalized)) {
    return "seo_writing";
  }

  if (/(kod|bug|hata|fonksiyon|function|class|api|typescript|javascript|python|react|next)/i.test(normalized)) {
    return "coding_snippet";
  }

  return "generic_manual_context";
}

function scenarioTone(type: ManualContextAnswerStructureType): ManualContextAnswerStructureTone {
  switch (type) {
    case "coding_snippet":
      return "technical_concise";
    case "seo_writing":
      return "editorial_structured";
    case "legal_psychology":
      return "sensitive_safe";
    case "generic_manual_context":
      return "short_clear";
    default:
      return "short_clear";
  }
}

export function detectManualContextAnswerScenario(message: string): ManualContextAnswerScenario {
  const context = detectVisibleManualContextInUserMessage(message);
  const hasManualContext = context.hasVisibleManualContext;

  if (!hasManualContext) {
    return {
      hasManualContext: false,
      hasReferences: false,
      hasInsufficiency: false,
      hasConflict: false,
      suggestedStructure: "none",
      safeTone: "short_clear",
      shouldAskForMoreContext: false,
    };
  }

  const referenceDetection = detectVisibleManualContextReferences(message);
  const insufficiency = detectManualContextInsufficiency(message);
  const conflict = detectManualContextConflicts(message);
  const suggestedStructure = detectScenarioType(message);

  return {
    hasManualContext: true,
    hasReferences: referenceDetection.hasReferences,
    hasInsufficiency: insufficiency.needsMoreContext,
    hasConflict: conflict.hasPotentialConflict,
    suggestedStructure,
    safeTone: scenarioTone(suggestedStructure),
    shouldAskForMoreContext:
      insufficiency.needsMoreContext || conflict.needsClarification || !insufficiency.hasSnippetLikeContent,
  };
}

export function getManualContextAnswerStructureGuidance(message: string): string {
  const scenario = detectManualContextAnswerScenario(message);
  if (!scenario.hasManualContext) {
    return "";
  }

  const rules: string[] = [
    "Manuel context varsa yanıtı düzenli, kısa ve anlaşılır bir yapı ile kur.",
    "1) Önce bağlam sınırını belirt: yalnızca kullanıcı mesajındaki görünür snippet/alıntıya dayandığını açıkça söyle.",
    "2) Sonra görünen snippet'e göre bulgu/yorum ver.",
    "3) Eksik/yetersiz bağlam varsa ayrı bir cümlede sınır koy.",
    "4) Çelişki/uyuşmazlık varsa ayrı bir cümlede kesin hükümden kaçın.",
    "5) Kullanıcıdan istenecek ek bilgiyi net ve kısa yaz.",
    "6) Gerekirse kısa bir öneri/sonraki adım ekle; gereksiz uzatma yapma.",
    "Referans satırlarını yalnızca görünür referans etiketi olarak an; dosya erişimi veya referans takibi iddia etme.",
    "Katı şablon dayatma: kullanıcı kısa isterse kısa cevap ver, detay isterse başlıklarla genişlet.",
  ];

  switch (scenario.suggestedStructure) {
    case "coding_snippet":
      rules.push(
        "Kodlama sorularında sade akış öner: 'Snippet'e göre', 'Muhtemel sorun', 'Kontrol etmen gereken yer'."
      );
      break;
    case "seo_writing":
      rules.push(
        "SEO/yazı sorularında sade akış öner: 'Görünen metne göre', 'İyileştirme', 'Önerilen düzen'."
      );
      break;
    case "legal_psychology":
      rules.push(
        "Hukuk/psikoloji sorularında güvenli akış öner: 'Paylaşılan metne göre genel değerlendirme', 'Sınır/uyarı', 'Gerekirse uzman desteği'."
      );
      break;
    default:
      rules.push("Genel sorularda sınır + bulgu + gerekiyorsa netleştirme isteği düzenini koru.");
      break;
  }

  if (scenario.hasInsufficiency) {
    rules.push("Bu mesajda bağlam yetersiz olabileceği için ek snippet/fonksiyon/hata metni iste.");
  }

  if (scenario.hasConflict) {
    rules.push("Bu mesajda olası çelişki olduğu için tek doğru iddiası kurma; güncel kısmı netleştirmeyi iste.");
  }

  if (scenario.hasReferences) {
    rules.push("Referans varsa 'görünen referans etiketine göre' gibi sınırlı ifade kullan.");
  }

  if (scenario.safeTone === "sensitive_safe") {
    rules.push("Dili sakin, güvenli ve kesin yargıdan uzak tut; gerekirse profesyonel destek yönlendirmesi ekle.");
  }

  return rules.join(" ");
}
