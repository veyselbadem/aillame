import { sanitizeSnippet } from "./search-sanitizer";
import { StagedContextItem } from "./staged-context-types";
import {
  ManualContextAttachInput,
  ManualContextAttachOutput,
  ManualContextAttachItem,
  ManualContextAttachWarning,
  MANUAL_CONTEXT_ATTACH_LIMITS,
} from "./manual-context-attach-types";

const FORBIDDEN_KEYS = [
  "fullPath",
  "canonicalPath",
  "absolutePath",
  "physicalPath",
  "rawContent",
  "stdout",
  "stderr",
  "pid",
  "stack",
  "stackTrace",
] as const;

const PATH_LIKE_PATTERN = /(\/home\/|\/Users\/|[a-zA-Z]:\\|\\\\|\/mnt\/|\.aillame-data)/gi;

function nowWarning(code: ManualContextAttachWarning["code"], message: string): ManualContextAttachWarning {
  return {
    code,
    message,
    createdAt: Date.now(),
  };
}

function capWarnings(warnings: ManualContextAttachWarning[]): ManualContextAttachWarning[] {
  return warnings.slice(0, MANUAL_CONTEXT_ATTACH_LIMITS.maxWarnings);
}

function maskPathLike(input: string): string {
  return input.replace(PATH_LIKE_PATTERN, "[REDACTED_PATH]");
}

function sanitizeLabel(input: string, fallback: string): string {
  const trimmed = (input || "").trim();
  if (!trimmed) return fallback;
  const basename = trimmed.split(/[\\/]/).pop() || trimmed;
  return maskPathLike(basename).slice(0, 120) || fallback;
}

function hasForbiddenShape(item: Record<string, unknown>): boolean {
  return FORBIDDEN_KEYS.some((key) => key in item);
}

function buildReference(item: StagedContextItem): string {
  const safeRoot = sanitizeLabel(item.citation.rootLabel, "workspace").replace(/[\\/]/g, "_");
  const linePart =
    item.citation.startLine && item.citation.endLine
      ? `satir ${item.citation.startLine}-${item.citation.endLine}`
      : "satir ?-?";
  return `${safeRoot} | ${linePart}`;
}

function sanitizeAttachSnippet(input: string): { value: string; changed: boolean } {
  const sanitized = sanitizeSnippet(input, MANUAL_CONTEXT_ATTACH_LIMITS.maxSnippetCharsPerItem);
  const masked = maskPathLike(sanitized.sanitized);
  const changed = sanitized.redacted || masked !== input || masked.length < input.length;
  return {
    value: masked,
    changed,
  };
}

export function createManualContextBlock(input: ManualContextAttachInput): ManualContextAttachOutput {
  const warnings: ManualContextAttachWarning[] = [];
  const stagedItems = input.stagedItems || [];

  if (stagedItems.length === 0) {
    warnings.push(nowWarning("no_items", "Staged context bos. Chat taslagina eklenecek oge yok."));
    return {
      block: null,
      text: "",
      warnings: capWarnings(warnings),
    };
  }

  const selected = stagedItems.slice(0, MANUAL_CONTEXT_ATTACH_LIMITS.maxAttachItems);
  if (stagedItems.length > MANUAL_CONTEXT_ATTACH_LIMITS.maxAttachItems) {
    warnings.push(
      nowWarning(
        "item_limit_reached",
        `Yalnizca ilk ${MANUAL_CONTEXT_ATTACH_LIMITS.maxAttachItems} oge taslaga eklendi.`
      )
    );
  }

  const items: ManualContextAttachItem[] = [];

  for (const stagedItem of selected) {
    const unknownItem = stagedItem as unknown as Record<string, unknown>;
    if (hasForbiddenShape(unknownItem)) {
      warnings.push(nowWarning("item_skipped", "Guvenli olmayan bir staged oge atlandi."));
      continue;
    }

    const safeName = sanitizeLabel(stagedItem.displayName, "unknown-file");
    const sourceSnippet = stagedItem.snippet || "";
    const sanitizedSnippet = sanitizeAttachSnippet(sourceSnippet);

    if (!sanitizedSnippet.value.trim()) {
      warnings.push(nowWarning("item_skipped", `${safeName} icin kullanilabilir snippet bulunamadi.`));
      continue;
    }

    if (sanitizedSnippet.changed) {
      warnings.push(nowWarning("snippet_trimmed", `${safeName} snippet'i guvenlik icin kisaltildi.`));
    }

    items.push({
      displayName: safeName,
      snippet: sanitizedSnippet.value,
      reference: buildReference(stagedItem),
    });
  }

  if (items.length === 0) {
    warnings.push(nowWarning("item_skipped", "Guvenli attach icerigi uretilemedi."));
    return {
      block: null,
      text: "",
      warnings: capWarnings(warnings),
    };
  }

  let text = "[Workspace Context - Manuel Eklenen]\n";
  for (let i = 0; i < items.length; i++) {
    const row = items[i];
    text += `\n${i + 1}. ${row.displayName}\n`;
    text += `Alinti: ${row.snippet}\n`;
    text += `Referans: ${row.reference}\n`;
  }

  if (text.length > MANUAL_CONTEXT_ATTACH_LIMITS.maxTotalAttachChars) {
    text = text.slice(0, MANUAL_CONTEXT_ATTACH_LIMITS.maxTotalAttachChars).trimEnd() + "\n...[KISALTILDI]";
    warnings.push(
      nowWarning(
        "total_chars_trimmed",
        `Attach metni ${MANUAL_CONTEXT_ATTACH_LIMITS.maxTotalAttachChars} karakter limiti nedeniyle kisaltildi.`
      )
    );
  }

  text += "\n[/Workspace Context - Manuel Eklenen]";

  const summaryText = `${items.length} oge manuel olarak Chat taslagina eklenmeye hazir.`;
  const createdAt = Date.now();

  return {
    block: {
      title: "Workspace Context - Manuel Eklenen",
      items,
      summaryText,
      warnings: capWarnings(warnings),
      createdAt,
    },
    text,
    warnings: capWarnings(warnings),
  };
}
