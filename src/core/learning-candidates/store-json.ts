import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { LearningCandidate, LearningCandidateStatus, CreateLearningCandidateInput } from './types';

const LEARNING_CANDIDATES_STORE_PATH = path.join(process.cwd(), 'learning-candidates-store.json');

async function readCandidatesFile(): Promise<LearningCandidate[]> {
  try {
    const raw = await readFile(LEARNING_CANDIDATES_STORE_PATH, 'utf-8');
    const normalizedRaw = raw.replace(/^\uFEFF/, '');
    return JSON.parse(normalizedRaw) as LearningCandidate[];
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeCandidatesFile(records: LearningCandidate[]): Promise<void> {
  await writeFile(LEARNING_CANDIDATES_STORE_PATH, JSON.stringify(records, null, 2), 'utf-8');
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const jsonLearningCandidateStore = {
  async upsertCandidate(input: CreateLearningCandidateInput): Promise<LearningCandidate> {
    const candidates = await readCandidatesFile();
    const now = Date.now();
    const existingIndex = candidates.findIndex((item) => item.sourceFeedbackId === input.sourceFeedbackId);

    const candidate: LearningCandidate = {
      id: existingIndex >= 0 ? candidates[existingIndex].id : generateId(),
      type: input.type,
      status: existingIndex >= 0 ? candidates[existingIndex].status : 'pending',
      source: input.source || 'feedback',
      sourceFeedbackId: input.sourceFeedbackId,
      projectId: input.projectId,
      mode: input.mode,
      task: input.task,
      responseId: input.responseId,
      modelId: input.modelId,
      rating: input.rating,
      instruction: input.instruction,
      input: input.input,
      expectedOutput: input.expectedOutput,
      tags: input.tags,
      messageId: input.messageId,
      conversationId: input.conversationId,
      selectedFeedback: input.selectedFeedback,
      optionalComment: input.optionalComment,
      taskId: input.taskId,
      primaryMode: input.metadata?.primaryMode,
      selectedModes: input.metadata?.selectedModes,
      intent: input.metadata?.intent,
      requiredAdapters: input.metadata?.requiredAdapters,
      memoryScopes: input.metadata?.memoryScopes,
      safetyFlags: input.metadata?.safetyFlags,
      reason: input.reason,
      createdAt: existingIndex >= 0 ? candidates[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      candidates[existingIndex] = candidate;
    } else {
      candidates.push(candidate);
    }

    await writeCandidatesFile(candidates);
    return candidate;
  },

  async listCandidates(): Promise<LearningCandidate[]> {
    return readCandidatesFile();
  },

  async updateCandidateStatus(id: string, status: LearningCandidateStatus): Promise<LearningCandidate | undefined> {
    const candidates = await readCandidatesFile();
    const index = candidates.findIndex((item) => item.id === id);
    if (index < 0) return undefined;
    candidates[index] = {
      ...candidates[index],
      status,
      updatedAt: Date.now(),
    };
    await writeCandidatesFile(candidates);
    return candidates[index];
  },

  async getCandidateById(id: string): Promise<LearningCandidate | undefined> {
    const candidates = await readCandidatesFile();
    return candidates.find((item) => item.id === id);
  },
};
