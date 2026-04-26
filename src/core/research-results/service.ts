import { jsonResearchResultsStore } from './store-json';
import type {
  CreateResearchResultInput,
  ResearchResultRecord,
  ResearchResultSafetyFlags,
  ResearchResultStatus,
  ResearchResultType,
} from './types';

function getDefaultSafetyFlags(researchType: ResearchResultType): ResearchResultSafetyFlags {
  const safetyFlags: ResearchResultSafetyFlags = {
    requiresCitation: true,
    requiresFreshnessCheck: false,
    requiresFinancialDisclaimer: false,
    sourceReliabilityUnknown: true,
    shouldNotWriteDirectlyToMemory: true,
  };

  if (researchType === 'economy_news') {
    safetyFlags.requiresFinancialDisclaimer = true;
    safetyFlags.requiresFreshnessCheck = true;
  }

  if (researchType === 'documentation') {
    safetyFlags.requiresCitation = true;
  }

  if (researchType === 'education') {
    safetyFlags.requiresCitation = true;
    safetyFlags.shouldNotWriteDirectlyToMemory = true;
  }

  return safetyFlags;
}

export async function createResearchResult(input: CreateResearchResultInput): Promise<ResearchResultRecord> {
  const recordInput: CreateResearchResultInput & { safetyFlags: ResearchResultSafetyFlags } = {
    ...input,
    sources: input.sources ?? [],
    status: input.status ?? 'draft',
    safetyFlags: getDefaultSafetyFlags(input.researchType),
  };

  return jsonResearchResultsStore.upsertResearchResult(recordInput);
}

export function listResearchResults(): Promise<ResearchResultRecord[]> {
  return jsonResearchResultsStore.listResearchResults();
}

export async function updateResearchResultStatus(
  id: string,
  status: ResearchResultStatus
): Promise<ResearchResultRecord | undefined> {
  return jsonResearchResultsStore.updateResearchResultStatus(id, status);
}
