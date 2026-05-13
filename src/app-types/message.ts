import type { ImageAttachment } from './attachments';
import type {
  AillameIntent,
  AillameMode,
  AillameSafetyFlags,
} from '@core/aillame-router/types';
import type { ModelAdapterId } from '@core/model-adapters/base';
import type { ChatMessageUiMetadata } from '@core/chat/message-metadata-types';

export type MessageRoutingMetadata = {
  primaryMode: AillameMode;
  selectedModes: AillameMode[];
  intent: AillameIntent;
  requiredAdapters: ModelAdapterId[];
  memoryScopes: string[];
  safetyFlags: Partial<AillameSafetyFlags>;
};

export type MessageRoutingErrorMetadata = {
  code: 'ROUTER_FAILED';
  message: string;
};

export type MessageMetadata = {
  routing?: MessageRoutingMetadata;
  routingError?: MessageRoutingErrorMetadata;
  uiContextMetadata?: ChatMessageUiMetadata;
};

export type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  attachments?: ImageAttachment[];
  metadata?: MessageMetadata;
  imageJobId?: string;
  imagePrompt?: string;
  imageEnglishPrompt?: string;
};
