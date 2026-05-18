import { detectManualContextInsufficiency } from "./insufficient-context-policy";
import { detectManualContextConflicts } from "./manual-context-conflict-policy";
import type { NanoProfileType } from "./types";
import { detectVisibleManualContextInUserMessage } from "./visible-context-policy";

export type ManualContextDetailLevel = "short" | "medium" | "deep";

export type ManualContextPreferredFormat =
  | "short_bullets"
  | "compact_headings"
  | "structured_headings";

export interface ManualContextProfileStyle {
  profile: NanoProfileType;
  maxSections: number;
  preferredFormat: ManualContextPreferredFormat;
  detailLevel: ManualContextDetailLevel;
  shouldUseHeadings: boolean;
  shouldAskForMoreContext: boolean;
  safeLengthGuidance: string;
}

export function getManualContextProfileStyle(profile?: NanoProfileType): Omit<
  ManualContextProfileStyle,
  "shouldAskForMoreContext"
> {
  const normalized: NanoProfileType = profile ?? "balanced";

  if (normalized === "fast") {
    return {
      profile: "fast",
      maxSections: 4,
      preferredFormat: "short_bullets",
      detailLevel: "short",
      shouldUseHeadings: false,
      safeLengthGuidance:
        "HIZLI profil: yanıtı 2-4 kısa madde veya kısa paragrafla ver; doğrudan ol, gereksiz açıklama ekleme.",
    };
  }

  if (normalized === "quality") {
    return {
      profile: "quality",
      maxSections: 6,
      preferredFormat: "structured_headings",
      detailLevel: "deep",
      shouldUseHeadings: true,
      safeLengthGuidance:
        "KALITELI profil: daha kapsamlı ve yapılandırılmış yanıt ver; yine de yalnızca görünür snippet sınırında kal.",
    };
  }

  return {
    profile: "balanced",
    maxSections: 5,
    preferredFormat: "compact_headings",
    detailLevel: "medium",
    shouldUseHeadings: true,
    safeLengthGuidance:
      "DENGELI profil: kısa başlıklar ve açıklayıcı maddeler kullan; gereksiz uzatmadan netlik sağla.",
  };
}

export function detectProfileAwareManualContextStyle(
  message: string,
  profile?: NanoProfileType
): ManualContextProfileStyle {
  const base = getManualContextProfileStyle(profile);
  const hasManualContext = detectVisibleManualContextInUserMessage(message).hasVisibleManualContext;

  if (!hasManualContext) {
    return {
      ...base,
      shouldAskForMoreContext: false,
      safeLengthGuidance: "",
    };
  }

  const insufficiency = detectManualContextInsufficiency(message);
  const conflict = detectManualContextConflicts(message);

  return {
    ...base,
    shouldAskForMoreContext: insufficiency.needsMoreContext || conflict.needsClarification,
  };
}

export function getProfileAwareManualContextGuidance(
  message: string,
  profile?: NanoProfileType
): string {
  const style = detectProfileAwareManualContextStyle(message, profile);
  if (!style.safeLengthGuidance) {
    return "";
  }

  const rules: string[] = [
    "Manuel context içeren yanıtlarda profil bazlı uzunluk/yoğunluk uygula.",
    style.safeLengthGuidance,
    "Tüm profillerde yalnızca görünür snippet/alıntıya dayan; dosyanın tamamını görmüş gibi davranma.",
    "Tüm profillerde dosya okuma, workspace tarama, arama, indeks, RAG veya tool kullanımı iddiası kurma.",
  ];

  if (style.profile === "fast") {
    rules.push("Hızlı profilde az başlık kullan veya başlıksız kısa maddeler tercih et.");
  }

  if (style.profile === "balanced") {
    rules.push("Dengeli profilde kısa başlık + açıklayıcı madde yapısını koru.");
  }

  if (style.profile === "quality") {
    rules.push("Kaliteli profilde daha kapsamlı başlıklandırma yap, ancak gereksiz tekrar ve spekülasyondan kaçın.");
  }

  if (style.shouldAskForMoreContext) {
    rules.push(
      "Yetersiz bağlam veya çelişki varsa profil ne olursa olsun kesin hükümden kaçın ve netleştirme için ek görünür context iste."
    );
  }

  return rules.join(" ");
}
