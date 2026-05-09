import { readFile, writeFile } from 'fs/promises';
import path from 'path';
import { resolveProjectRelative } from '@/core/project-root';
import type { CreateResearchResultInput, ResearchResultRecord, ResearchResultSafetyFlags } from './types';

const RESEARCH_RESULTS_STORE_PATH = resolveProjectRelative('.aillame-data/stores/research-results-store.json');

async function readResearchResultsFile(): Promise<ResearchResultRecord[]> {
  try {
    const raw = await readFile(RESEARCH_RESULTS_STORE_PATH, 'utf-8');
    const normalized = raw.replace(/^\uFEFF/, '');
    return JSON.parse(normalized) as ResearchResultRecord[];
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function writeResearchResultsFile(records: ResearchResultRecord[]): Promise<void> {
  await writeFile(RESEARCH_RESULTS_STORE_PATH, JSON.stringify(records, null, 2), 'utf-8');
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export const jsonResearchResultsStore = {
  async upsertResearchResult(input: CreateResearchResultInput & { safetyFlags: ResearchResultSafetyFlags }): Promise<ResearchResultRecord> {
    const records = await readResearchResultsFile();
    const now = Date.now();
    const existingIndex = records.findIndex((record) =>
      record.projectId === input.projectId &&
      record.mode === input.mode &&
      record.researchType === input.researchType &&
      record.query === input.query
    );

    const existing = existingIndex >= 0 ? records[existingIndex] : undefined;
    const record: ResearchResultRecord = {
      id: existing?.id ?? generateId(),
      projectId: input.projectId,
      mode: input.mode,
      researchType: input.researchType,
      query: input.query,
      normalizedTask: input.normalizedTask,
      sources: input.sources ?? [],
      summary: input.summary,
      safetyFlags: input.safetyFlags ?? {
        requiresCitation: true,
        requiresFreshnessCheck: false,
        requiresFinancialDisclaimer: false,
        sourceReliabilityUnknown: true,
        shouldNotWriteDirectlyToMemory: true,
      },
      status: input.status ?? existing?.status ?? 'draft',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      reviewedAt: existing?.reviewedAt,
      archivedAt: existing?.archivedAt,
    };

    if (record.status === 'reviewed' && !record.reviewedAt) {
      record.reviewedAt = now;
    }

    if (record.status === 'archived' && !record.archivedAt) {
      record.archivedAt = now;
    }

    if (existingIndex >= 0) {
      records[existingIndex] = record;
    } else {
      records.push(record);
    }

    await writeResearchResultsFile(records);
    return record;
  },

  async listResearchResults(): Promise<ResearchResultRecord[]> {
    return readResearchResultsFile();
  },

  async updateResearchResultStatus(id: string, status: ResearchResultRecord['status']): Promise<ResearchResultRecord | undefined> {
    const records = await readResearchResultsFile();
    const index = records.findIndex((record) => record.id === id);
    if (index < 0) {
      return undefined;
    }

    const now = Date.now();
    const updated: ResearchResultRecord = {
      ...records[index],
      status,
      updatedAt: now,
      reviewedAt: status === 'reviewed' ? now : records[index].reviewedAt,
      archivedAt: status === 'archived' ? now : records[index].archivedAt,
    };

    records[index] = updated;
    await writeResearchResultsFile(records);
    return updated;
  },
};
