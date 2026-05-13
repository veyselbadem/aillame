import { StagedContextItem } from "./staged-context-types";

export interface ManualContextAttachWarning {
  code:
    | "no_items"
    | "item_limit_reached"
    | "snippet_trimmed"
    | "item_skipped"
    | "total_chars_trimmed";
  message: string;
  createdAt: number;
}

export interface ManualContextAttachItem {
  displayName: string;
  snippet: string;
  reference: string;
}

export interface ManualContextAttachBlock {
  title: string;
  items: ManualContextAttachItem[];
  summaryText: string;
  warnings: ManualContextAttachWarning[];
  createdAt: number;
}

export interface ManualContextAttachOutput {
  block: ManualContextAttachBlock | null;
  text: string;
  warnings: ManualContextAttachWarning[];
}

export interface ManualContextAttachInput {
  stagedItems: StagedContextItem[];
}

export const MANUAL_CONTEXT_ATTACH_LIMITS = {
  maxAttachItems: 5,
  maxSnippetCharsPerItem: 220,
  maxTotalAttachChars: 1400,
  maxWarnings: 6,
};
