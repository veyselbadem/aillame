import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { resolveProjectRelative } from '../project-root';
import type { DistillationPreview, DistillationPreviewStatus, CreateDistillationPreviewInput } from './types';

const DISTILLATION_PREVIEW_STORE_PATH = resolveProjectRelative('.aillame-data/stores/distillation-preview-store.json');

async function readPreviewFile(): Promise<DistillationPreview[]> {
  try {
    const raw = await readFile(DISTILLATION_PREVIEW_STORE_PATH, 'utf-8');
    const normalizedRaw = raw.replace(/^\uFEFF/, '');
    return JSON.parse(normalizedRaw) as DistillationPreview[];
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writePreviewFile(records: DistillationPreview[]): Promise<void> {
  await writeFile(DISTILLATION_PREVIEW_STORE_PATH, JSON.stringify(records, null, 2), 'utf-8');
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const jsonDistillationPreviewStore = {
  async upsertPreview(input: CreateDistillationPreviewInput): Promise<DistillationPreview> {
    const previews = await readPreviewFile();
    const now = Date.now();
    const existingIndex = previews.findIndex((item) => item.sourceCandidateId === input.sourceCandidateId);

    const preview: DistillationPreview = {
      id: existingIndex >= 0 ? previews[existingIndex].id : generateId(),
      sourceCandidateId: input.sourceCandidateId,
      sourceFeedbackId: input.sourceFeedbackId,
      candidateType: input.candidateType,
      primaryMode: input.primaryMode,
      selectedModes: input.selectedModes,
      intent: input.intent,
      proposedMemoryScope: input.proposedMemoryScope,
      proposedTitle: input.proposedTitle,
      proposedSummary: input.proposedSummary,
      proposedKeywords: input.proposedKeywords,
      confidenceScore: input.confidenceScore,
      riskLevel: input.riskLevel,
      status: input.status ?? (existingIndex >= 0 ? previews[existingIndex].status : 'draft'),
      createdAt: existingIndex >= 0 ? previews[existingIndex].createdAt : now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      previews[existingIndex] = preview;
    } else {
      previews.push(preview);
    }

    await writePreviewFile(previews);
    return preview;
  },

  async listPreviews(): Promise<DistillationPreview[]> {
    return readPreviewFile();
  },

  async updatePreviewStatus(id: string, status: DistillationPreviewStatus): Promise<DistillationPreview | undefined> {
    const previews = await readPreviewFile();
    const index = previews.findIndex((item) => item.id === id);
    if (index < 0) return undefined;
    previews[index] = {
      ...previews[index],
      status,
      updatedAt: Date.now(),
    };
    await writePreviewFile(previews);
    return previews[index];
  },
};
