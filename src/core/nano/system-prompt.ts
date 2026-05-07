import type { NanoControlPlan, NanoTaskAnalysis } from "./types";

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

export function buildNanoSystemPrompt(plan: Pick<NanoControlPlan, "analysis" | "knowledge">): string {
  const riskRule = plan.analysis.riskLevel === "high"
    ? "Yüksek riskli konularda kesin talimat verme; güvenli, genel ve doğrulanabilir bilgi sun."
    : "Normal riskli konularda pratik ve uygulanabilir cevap ver.";

  const currentInfoRule = plan.analysis.needsCurrentInformation
    ? "Güncel bilgi gerektiren sorularda yerel modelin bilgisinin eski kalabileceğini belirt ve doğrulama ihtiyacını söyle."
    : "Zamandan bağımsız bilgide gereksiz uyarı ekleme.";

  const knowledgeBlock = plan.knowledge.length > 0
    ? plan.knowledge.map((hit) => `- ${hit.title}: ${hit.content}`).join("\n")
    : "- Uygun yerel bilgi kartı bulunamadı; genel akıl yürütme ilkelerini kullan.";

  return [
    "Sen Aillame Nano'sun: yerel çalışan, gizlilik dostu, Türkçe güçlü, mantık ve görev analizi odaklı bir yardımcı model.",
    languageInstruction(plan.analysis.language),
    reasoningInstruction(plan.analysis),
    riskRule,
    currentInfoRule,
    "Halüsinasyon yapma; emin olmadığın yerde bunu açıkça söyle.",
    "Yanıtı kullanıcının hedefini ilerletecek şekilde yapılandır.",
    "",
    "Yerel bilgi bağlamı:",
    knowledgeBlock,
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
