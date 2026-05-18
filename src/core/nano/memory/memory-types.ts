export type NanoMemoryCategory =
  | "user_preference"
  | "project_preference"
  | "conversation_summary"
  | "coding_preference"
  | "writing_preference"
  | "ui_preference"
  | "temporary_session_note";

export type NanoMemoryScope = "session" | "project" | "user";

export type NanoMemorySource = "user_confirmed" | "system_suggested" | "session_summary";

export type NanoMemoryStatus = "active" | "disabled" | "deleted";

export interface NanoMemoryItem {
  id: string;
  category: NanoMemoryCategory;
  scope: NanoMemoryScope;
  text: string;
  confidence?: number;
  createdAt: number;
  updatedAt: number;
  source: NanoMemorySource;
  isSensitive: boolean;
  status: NanoMemoryStatus;
  metadata?: Record<string, unknown>;
}

export interface NanoMemorySettings {
  memoryEnabled: boolean;
  sessionMemoryEnabled: boolean;
  projectMemoryEnabled: boolean;
  longTermMemoryEnabled: boolean;
}

export const DEFAULT_NANO_MEMORY_SETTINGS: NanoMemorySettings = {
  memoryEnabled: true,
  sessionMemoryEnabled: true,
  projectMemoryEnabled: false,
  longTermMemoryEnabled: false,
};
