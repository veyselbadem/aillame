export type LabParticipant = 'nano' | 'qwen' | 'sdxl' | 'gemini' | 'web_search' | 'system';

export type SessionStatus = 'draft' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed';

export type LabSessionMode = 'free' | 'focused' | 'research' | 'training_dataset' | 'image_prompt';

export interface LabMessage {
  id: string;
  sessionId: string;
  model: LabParticipant;
  content: string;
  outputType?: 'text' | 'image' | 'research' | 'planning' | 'error';
  imageUrl?: string;
  imagePath?: string;
  prompt?: string;
  negativePrompt?: string;
  generationMetadata?: any;
  sourceUrls?: string[];
  citations?: string[];
  safetyFlags?: string[];
  candidateForTraining?: boolean;
  createdAt: number;
}

export interface LabSession {
  id: string;
  topic: string;
  topicMode: 'manual' | 'random';
  mode: LabSessionMode;
  participants: LabParticipant[];
  status: SessionStatus;
  maxTurns: number;
  currentTurn: number;
  safetyLevel: number; // 0-10
  loopMode: 'manual' | 'controlled';
  stopRequested?: boolean;
  lastRunAt?: number;
  errorCount: number;
  maxErrors: number;
  messages: LabMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface CreateSessionInput {
  topic: string;
  topicMode: 'manual' | 'random';
  mode: LabSessionMode;
  participants: LabParticipant[];
  maxTurns?: number;
  safetyLevel?: number;
}
