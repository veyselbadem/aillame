import {
  MANUAL_CONTEXT_END_MARKER,
  MANUAL_CONTEXT_START_MARKER,
} from "../indexing/manual-context-boundary";
import { detectVisibleManualContextInUserMessage } from "./visible-context-policy";
import { detectVisibleManualContextReferences } from "./visible-reference-policy";

export type InsufficientContextReasonCode =
  | "none"
  | "file_scope_without_visible_context"
  | "invalid_manual_context_boundary"
  | "snippet_missing_or_too_short"
  | "reference_only_context"
  | "whole_scope_request_with_small_snippet"
  | "sensitive_domain_insufficient_context";

export interface ManualContextInsufficiencyDetection {
  hasManualContext: boolean;
  boundaryValid: boolean;
  hasSnippetLikeContent: boolean;
  approxSnippetChars: number;
  hasReferenceOnlyContext: boolean;
  asksForWholeFileOrProject: boolean;
  needsMoreContext: boolean;
  safeReasonCode: InsufficientContextReasonCode;
}

const MIN_USEFUL_SNIPPET_CHARS = 40;

const FILE_SCOPE_REQUEST_PATTERN =
  /(dosyaya göre|dosyada|bu dosya|projede|proje genelinde|tüm dosya|tum dosya|tüm proje|tum proje|komple)/i;

const WHOLE_SCOPE_PATTERN =
  /(tüm dosya|tum dosya|dosyanın tamamı|dosyanin tamami|tüm proje|tum proje|proje geneli|komple proje)/i;

const SENSITIVE_DOMAIN_PATTERN =
  /(hukuk|dava|mahkeme|sözleşme|sozlesme|psikoloji|terapi|anksiyete|depresyon|travma|kriz)/i;

function extractVisibleManualContextBlock(message: string): string {
  const startIndex = message.indexOf(MANUAL_CONTEXT_START_MARKER);
  if (startIndex === -1) {
    return "";
  }

  const endIndex = message.indexOf(MANUAL_CONTEXT_END_MARKER, startIndex);
  if (endIndex === -1) {
    return message.slice(startIndex);
  }

  return message.slice(startIndex, endIndex + MANUAL_CONTEXT_END_MARKER.length);
}

function extractSnippetLikeText(message: string): string {
  const block = extractVisibleManualContextBlock(message);
  if (!block) {
    return "";
  }

  const lines = block.split(/\r?\n/);
  const snippetParts: string[] = [];

  for (const line of lines) {
    const match = line.match(/^\s*Alinti:\s*(.*)$/i);
    if (!match) {
      continue;
    }
    const part = (match[1] || "").trim();
    if (part) {
      snippetParts.push(part);
    }
  }

  return snippetParts.join(" ").trim();
}

export function detectManualContextInsufficiency(
  message: string
): ManualContextInsufficiencyDetection {
  const visibleContext = detectVisibleManualContextInUserMessage(message);
  const hasManualContext = visibleContext.hasVisibleManualContext;
  const boundaryValid = visibleContext.status === "present_intact";
  const snippetText = extractSnippetLikeText(message);
  const approxSnippetChars = snippetText.length;
  const hasSnippetLikeContent = approxSnippetChars >= MIN_USEFUL_SNIPPET_CHARS;
  const referenceDetection = detectVisibleManualContextReferences(message);
  const hasReferenceOnlyContext =
    hasManualContext && referenceDetection.hasReferences && !hasSnippetLikeContent;
  const asksForWholeFileOrProject = WHOLE_SCOPE_PATTERN.test(message);
  const asksFileScopeWithoutVisibleContext =
    !hasManualContext && FILE_SCOPE_REQUEST_PATTERN.test(message);
  const sensitiveDomainMentioned = SENSITIVE_DOMAIN_PATTERN.test(message);

  let safeReasonCode: InsufficientContextReasonCode = "none";

  if (asksFileScopeWithoutVisibleContext) {
    safeReasonCode = "file_scope_without_visible_context";
  } else if (hasManualContext && !boundaryValid) {
    safeReasonCode = "invalid_manual_context_boundary";
  } else if (hasManualContext && asksForWholeFileOrProject && approxSnippetChars < 220) {
    safeReasonCode = "whole_scope_request_with_small_snippet";
  } else if (hasReferenceOnlyContext) {
    safeReasonCode = "reference_only_context";
  } else if (hasManualContext && !hasSnippetLikeContent) {
    safeReasonCode = "snippet_missing_or_too_short";
  } else if (
    sensitiveDomainMentioned &&
    ((hasManualContext && approxSnippetChars < 180) || !hasManualContext)
  ) {
    safeReasonCode = "sensitive_domain_insufficient_context";
  }

  return {
    hasManualContext,
    boundaryValid,
    hasSnippetLikeContent,
    approxSnippetChars,
    hasReferenceOnlyContext,
    asksForWholeFileOrProject,
    needsMoreContext: safeReasonCode !== "none",
    safeReasonCode,
  };
}

export function getInsufficientContextResponseGuidance(message: string): string {
  const detection = detectManualContextInsufficiency(message);
  if (!detection.needsMoreContext) {
    return "";
  }

  const baseRules = [
    "Bağlam yetersizse cevaba sınır koyarak başla ve görünür snippet dışına çıkma.",
    "'Bu snippet tek başına tüm dosya/proje hakkında kesin sonuç için yeterli değil.' ifadesini uygun durumda kullan.",
    "'Dosyanın tamamını görmeden kesin konuşamam.' ifadesini gerektiğinde açıkça belirt.",
    "Gerekli ek bilgi olarak ilgili fonksiyonun tamamı, hata mesajı veya çevreleyen kod/metin parçasını iste.",
    "Otomatik dosya okuma, arama, indeks veya RAG yaptığına dair iddiada bulunma.",
  ];

  switch (detection.safeReasonCode) {
    case "file_scope_without_visible_context":
      baseRules.push(
        "Kullanıcı dosya/proje geneli soruyor ancak görünür context yok; erişimin olmadığını nazikçe belirt ve snippet iste."
      );
      break;
    case "invalid_manual_context_boundary":
      baseRules.push(
        "Manual context sınırı eksik/bozuk görünüyor; yalnızca görünen metne dayanabildiğini belirt ve bloğun tamamını yeniden paylaşmasını iste."
      );
      break;
    case "snippet_missing_or_too_short":
      baseRules.push(
        "Snippet çok kısa/boş; net değerlendirme için daha kapsamlı görünür alıntı talep et."
      );
      break;
    case "reference_only_context":
      baseRules.push(
        "Yalnızca referans etiketi var; referans etiketinin dosya içeriğine otomatik erişim sağlamadığını açıkça belirt."
      );
      break;
    case "whole_scope_request_with_small_snippet":
      baseRules.push(
        "Küçük bir snippet ile tüm dosya/proje analizi yapma; kapsamı snippet ile sınırla ve geniş bağlam iste."
      );
      break;
    case "sensitive_domain_insufficient_context":
      baseRules.push(
        "Hassas alanda (hukuk/psikoloji) eksik bağlamla kesin yargı kurma; genel, güvenli ve sınırlı bilgilendirme yap."
      );
      break;
    default:
      break;
  }

  return baseRules.join(" ");
}
