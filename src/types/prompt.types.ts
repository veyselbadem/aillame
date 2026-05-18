import { AillameChatContext } from './chat.types';
import { AillameProjectContext } from './project.types';
import { AillameMemoryContext } from './memory.types';

export interface AillamePromptMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AillameBuiltPrompt {
  messages: AillamePromptMessage[];
  plainText: string;
  meta: {
    projectId: string;
    projectName: string;
    mode: string;
    taskType?: string;
    source?: string;
    fileCount: number;
    totalContextLength: number;
    memoryFactCount?: number;
    memoryRecentMessageCount?: number;
    createdAt: string;
  };
}

export interface AillamePromptBuildInput {
  message: string;
  context?: AillameChatContext;
  project: AillameProjectContext;
  memory?: AillameMemoryContext;
}
