import type { AillameMode } from '@core/aillame-router/types';

export type MemoryScopeLayer = 'global' | 'mode' | 'session' | 'task';

export type MemorySourceType =
  | 'conversation'
  | 'feedback'
  | 'distillation'
  | 'admin-room'
  | 'manual';

export type TaskMemoryStatus =
  | 'planned'
  | 'running'
  | 'blocked'
  | 'completed'
  | 'failed';

export type GlobalMemoryScope = {
  layer: 'global';
  userId?: string;
};

export type ModeMemoryScope = {
  layer: 'mode';
  mode: AillameMode;
};

export type SessionMemoryScope = {
  layer: 'session';
  conversationId: string;
  summary?: string;
  updatedAt?: string;
};

export type TaskMemoryScope = {
  layer: 'task';
  taskId: string;
  status: TaskMemoryStatus;
  activeStepId?: string;
};

export type AillameMemoryScope =
  | GlobalMemoryScope
  | ModeMemoryScope
  | SessionMemoryScope
  | TaskMemoryScope;

export type MemoryCardSource = {
  type: MemorySourceType;
  conversationId?: string;
  messageId?: string;
  taskId?: string;
  feedbackId?: string;
  adminRoomId?: string;
};

export type MemoryCard = {
  id: string;
  scope: AillameMemoryScope;
  topic: string;
  summary: string;
  keywords: string[];
  confidence: number;
  source: MemoryCardSource;
  createdAt: string;
  updatedAt?: string;
  sensitive?: boolean;
  requiresApproval?: boolean;
};

export type MemoryQuery = {
  text: string;
  scopes: AillameMemoryScope[];
  modes?: AillameMode[];
  limit?: number;
  minConfidence?: number;
  includeSensitive?: boolean;
};

export type MemorySearchResult = {
  card: MemoryCard;
  score: number;
  matchedKeywords: string[];
  sourceScope: AillameMemoryScope;
};
