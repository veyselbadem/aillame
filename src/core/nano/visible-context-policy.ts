import {
  MANUAL_CONTEXT_END_MARKER,
  MANUAL_CONTEXT_START_MARKER,
} from "../indexing/manual-context-boundary";

export type VisibleManualContextStatus =
  | "none"
  | "present_intact"
  | "present_unterminated"
  | "present_mismatch";

export interface VisibleManualContextDetection {
  hasVisibleManualContext: boolean;
  status: VisibleManualContextStatus;
}

export function detectVisibleManualContextInUserMessage(
  message: string
): VisibleManualContextDetection {
  const startIndex = message.indexOf(MANUAL_CONTEXT_START_MARKER);
  const endIndex = message.indexOf(MANUAL_CONTEXT_END_MARKER);

  if (startIndex === -1 && endIndex === -1) {
    return {
      hasVisibleManualContext: false,
      status: "none",
    };
  }

  if (startIndex >= 0 && endIndex >= 0 && endIndex > startIndex) {
    return {
      hasVisibleManualContext: true,
      status: "present_intact",
    };
  }

  if (startIndex >= 0 && endIndex === -1) {
    return {
      hasVisibleManualContext: true,
      status: "present_unterminated",
    };
  }

  return {
    hasVisibleManualContext: true,
    status: "present_mismatch",
  };
}

export function getVisibleContextResponseGuidance(message: string): string {
  const detected = detectVisibleManualContextInUserMessage(message);

  if (!detected.hasVisibleManualContext) {
    return [
      "Kullanıcı mesajında görünür manuel context bloğu yoksa workspace dosyalarına eriştiğini varsayma.",
      "Otomatik dosya erişimi, arama, indeks veya retrieval yaptığına dair iddialarda bulunma.",
    ].join(" ");
  }

  if (detected.status === "present_intact") {
    return [
      "Kullanıcı mesajındaki görünür manuel context bloğunu yalnızca kullanıcının paylaştığı snippet/alinti olarak ele al.",
      "Yanıtında gerektiğinde 'Paylaştığın görünür context'e göre' ifadesini kullan.",
      "Dosyanın tamamını gördüğünü iddia etme; sadece snippet'te görünen kısma dayalı konuş.",
      "Bağlam yetersizse bunu açıkça belirt ve çıkarım yapıyorsan tahmin olduğunu söyle.",
      "Otomatik dosya erişimi, arama, indeks veya retrieval yaptığına dair iddialarda bulunma.",
    ].join(" ");
  }

  return [
    "Kullanıcı mesajında bozuk veya eksik bir manuel context işareti var.",
    "Bu durumda görünmeyen dosya içeriği varsayma ve sadece mesajda açıkça görünen metne dayan.",
    "Eksik bağlam olduğunu net şekilde söyle ve otomatik erişim yaptığına dair iddiada bulunma.",
  ].join(" ");
}
