export const MANUAL_CONTEXT_ATTACH_EVENT = "aillame:manual-context-attach";

export interface ManualContextAttachEventDetail {
  text: string;
  createdAt: number;
  source: "workspace_search_manual_attach";
}

export function dispatchManualContextAttach(detail: ManualContextAttachEventDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(MANUAL_CONTEXT_ATTACH_EVENT, { detail }));
}
