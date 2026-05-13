import type { NanoControlPlan, NanoTaskAnalysis } from "./types";
import { getGroundedResponseStyleGuidance } from "./grounded-response-style";
import { getInsufficientContextResponseGuidance } from "./insufficient-context-policy";
import { getManualContextAnswerStructureGuidance } from "./manual-context-answer-structure";
import { getManualContextPolicyGuardSummary } from "./manual-context-policy-guard";
import { getProfileAwareManualContextGuidance } from "./manual-context-profile-style";
import { getManualContextConflictGuidance } from "./manual-context-conflict-policy";
import { getVisibleContextResponseGuidance } from "./visible-context-policy";
import { getVisibleReferenceResponseGuidance } from "./visible-reference-policy";

function languageInstruction(language: NanoTaskAnalysis["language"]): string {
  if (language === "en") return "Respond in clear English unless the user asks otherwise.";
  if (language === "mixed") return "Respond primarily in Turkish, but preserve technical English terms when useful.";
  return "Türkçe, açık, doğal ve gereksiz uzatmadan yanıt ver.";
}

function reasoningInstruction(analysis: NanoTaskAnalysis): string {
  if (!analysis.requiresStepByStepReasoning) {
    return "Basit isteklerde doğrudan cevap ver; iç muhakemeyi uzun uzun göstermeden sonucu açıkla.";
  }

  return [
    "Karmaşık isteklerde önce problemi sessizce parçalara ayır.",
    "Cevapta sadece gerekli ara adımları göster.",
    "Varsayımları, riskleri ve doğrulama yolunu belirt.",
    "Eksik bilgi kritikse kısa bir netleştirme sorusu sor; kritik değilse makul varsayımla ilerle.",
  ].join(" ");
}

function behaviorPolicy(analysis: NanoTaskAnalysis, profile?: string): string {
  const policies: string[] = [];

  // Türkçe Kalite Kuralları
  policies.push("Daima düzgün, doğal ve akıcı bir Türkçe kullan. Teknik terimleri (örn. API, Refactor) koru ancak yeni başlayanlar için gerekirse kısa parantez içi açıklamalar ekle.");

  // Profil Bazlı Davranış
  if (profile === 'fast') {
    policies.push("HIZLI MOD: Yanıtı olabildiğince kısa, direkt ve pratik tut. Gereksiz giriş-sonuç cümlelerinden kaçın.");
  } else if (profile === 'quality') {
    policies.push("KALİTE MODU: Yanıtı detaylandır, örnekler ver ve neden-sonuç ilişkisini derinlemesine açıkla.");
  } else {
    policies.push("DENGELİ MOD: Açıklayıcı ol ama konudan uzaklaşmadan dengeli bir uzunlukta yanıt ver.");
  }

  // Görev Türü Bazlı Davranış
  switch (analysis.kind) {
    case 'coding':
      policies.push("YAZILIM YARDIMCISI: Kullanıcının başlangıç seviyesinde olduğunu varsay. Kodu adım adım açıkla. Minimal ve çalışan örnekler ver. Hangi satırın ne işe yaradığını belirt.");
      break;
    case 'research':
    case 'creative':
      policies.push("İÇERİK YAZARI: Okunabilirliği artırmak için ana başlıklar ve alt başlıklar kullan. SEO uyumlu bir iskelet oluştur (H1, H2 hiyerarşisi).");
      break;
    case 'planning':
      policies.push("PLANLAYICI: Net adımlar, öncelikler ve kontrol listeleri oluştur.");
      break;
  }

  // Hassas Konu Sınırları (Hukuk/Psikoloji)
  if (analysis.riskLevel === 'high' || /hukuk|dava|psikoloji|terapi|sağlık/i.test(analysis.keywords.join(" "))) {
    policies.push("HASSAS KONU: Bilgilendirici bir dil kullan. Kesin hukuki veya medikal teşhis koyma. Garanti verme. Gerektiğinde 'Bu bilgiler genel bilgilendirme amaçlıdır, profesyonel destek almanız önerilir' uyarısını sade bir dille ekle.");
  }

  // Güvenli Sınırlar (Gerçekten yapılmayan işler için dürüstlük)
  policies.push("DÜRÜSTLÜK: Gerçekten yapmadığın işlemler için (örn. dosya okumak, internete bakmak, kod çalıştırmak) yapmış gibi davranma. Sadece öneri ve rehberlik ver.");

  return policies.join("\n");
}

export function buildNanoSystemPrompt(
  plan: Pick<NanoControlPlan, "analysis" | "knowledge" | "profile" | "memoryContext"> & {
    userPrompt?: string;
  }
): string {
  const riskRule = plan.analysis.riskLevel === "high"
    ? "Yüksek riskli konularda kesin talimat verme; güvenli, genel ve doğrulanabilir bilgi sun."
    : "Normal riskli konularda pratik ve uygulanabilir cevap ver.";

  const currentInfoRule = plan.analysis.needsCurrentInformation
    ? "Güncel bilgi gerektiren sorularda yerel modelin bilgisinin eski kalabileceğini belirt ve doğrulama ihtiyacını söyle."
    : "Zamandan bağımsız bilgide gereksiz uyarı ekleme.";

  const knowledgeBlock = plan.knowledge.length > 0
    ? plan.knowledge.map((hit) => `- ${hit.title}: ${hit.content}`).join("\n")
    : "- Uygun yerel bilgi kartı bulunamadı; genel akıl yürütme ilkelerini kullan.";

  const memoryBlock = plan.memoryContext && plan.memoryContext.length > 0
    ? plan.memoryContext.join("\n")
    : "- Aktif hafıza kaydı bulunamadı.";

  const visibleContextRule = getVisibleContextResponseGuidance(plan.userPrompt ?? "");
  const manualContextPolicyGuardRule = getManualContextPolicyGuardSummary(
    plan.userPrompt ?? "",
    plan.profile
  );
  const groundedStyleRule = getGroundedResponseStyleGuidance({
    message: plan.userPrompt ?? "",
    analysis: plan.analysis,
  });
  const visibleReferenceRule = getVisibleReferenceResponseGuidance(plan.userPrompt ?? "");
  const insufficientContextRule = getInsufficientContextResponseGuidance(plan.userPrompt ?? "");
  const manualContextConflictRule = getManualContextConflictGuidance(plan.userPrompt ?? "");
  const manualContextAnswerStructureRule = getManualContextAnswerStructureGuidance(plan.userPrompt ?? "");
  const profileAwareManualContextRule = getProfileAwareManualContextGuidance(
    plan.userPrompt ?? "",
    plan.profile
  );

  const policyRules = [
    "Sen Aillame Nano'sun: yerel çalışan, gizlilik dostu, Türkçe güçlü, mantık ve görev analizi odaklı bir yardımcı model.",
    languageInstruction(plan.analysis.language),
    reasoningInstruction(plan.analysis),
    behaviorPolicy(plan.analysis, plan.profile),
    riskRule,
    currentInfoRule,
    visibleContextRule,
    manualContextPolicyGuardRule,
    groundedStyleRule,
    visibleReferenceRule,
    insufficientContextRule,
    manualContextConflictRule,
    manualContextAnswerStructureRule,
    profileAwareManualContextRule,
    "Halüsinasyon yapma; emin olmadığın yerde bunu açıkça söyle.",
    "Yanıtı kullanıcının hedefini ilerletecek şekilde yapılandır.",
  ].filter((line) => Boolean(line && line.trim().length > 0));

  return [
    ...policyRules,
    "",
    "Yerel bilgi bağlamı:",
    knowledgeBlock,
    "",
    "Kısa süreli hafıza bağlamı:",
    memoryBlock,
  ].join("\n");
}

export function buildNanoModelPrompt(userPrompt: string, plan: Pick<NanoControlPlan, "route" | "analysis">): string {
  return [
    "<system_task>",
    `intent=${plan.route.intent}`,
    `mode=${plan.route.primaryMode}`,
    `task_kind=${plan.analysis.kind}`,
    `difficulty=${plan.analysis.difficulty}`,
    `risk=${plan.analysis.riskLevel}`,
    "</system_task>",
    "",
    "<user_prompt>",
    userPrompt.trim(),
    "</user_prompt>",
    "",
    "Yanıt:",
  ].join("\n");
}
