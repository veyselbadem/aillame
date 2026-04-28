export type LabParticipant = 'nano' | 'gemma' | 'ollama' | 'qwen' | 'sdxl' | 'web_search' | 'system';

export type SessionStatus = 'draft' | 'running' | 'paused' | 'stopped' | 'completed' | 'failed' | 'degraded';

export type LabSessionMode = 'free' | 'focused' | 'research' | 'training_dataset' | 'image_prompt';

export interface LabMessage {
  id: string;
  sessionId: string;
  model: LabParticipant;
  content: string;
  outputType?: 'text' | 'image' | 'research' | 'planning' | 'error' | 'degraded' | 'skipped';
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
  goal?: string;
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
  goal?: string;
  topicMode: 'manual' | 'random';
  mode: LabSessionMode;
  participants: LabParticipant[];
  maxTurns?: number;
  safetyLevel?: number;
}
