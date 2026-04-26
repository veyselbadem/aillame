import { NextRequest, NextResponse } from 'next/server';
import { createResearchResult, listResearchResults, updateResearchResultStatus } from '@core/research-results/service';
import type { ResearchResultStatus, ResearchResultType } from '@core/research-results/types';

const VALID_STATUSES: ResearchResultStatus[] = ['draft', 'reviewed', 'rejected', 'archived'];
const VALID_RESEARCH_TYPES: ResearchResultType[] = ['web', 'news', 'economy_news', 'documentation', 'education', 'source_summary'];

async function parseJsonBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

export async function GET() {
  const results = await listResearchResults();
  return NextResponse.json({ success: true, results });
}

export async function POST(req: NextRequest) {
  const payload = await parseJsonBody(req);
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const projectId = typeof payload.projectId === 'string' ? payload.projectId.trim() : '';
  const mode = typeof payload.mode === 'string' ? payload.mode.trim() : '';
  const researchType = typeof payload.researchType === 'string' ? payload.researchType.trim() as ResearchResultType : undefined;
  const query = typeof payload.query === 'string' ? payload.query.trim() : '';
  const normalizedTask = typeof payload.normalizedTask === 'object' && payload.normalizedTask !== null ? payload.normalizedTask : undefined;
  const sources = Array.isArray(payload.sources) ? payload.sources : undefined;
  const summary = typeof payload.summary === 'string' ? payload.summary.trim() : undefined;

  if (!projectId) {
    return NextResponse.json({ success: false, error: 'projectId is required.' }, { status: 400 });
  }

  if (!mode) {
    return NextResponse.json({ success: false, error: 'mode is required.' }, { status: 400 });
  }

  if (!researchType || !VALID_RESEARCH_TYPES.includes(researchType)) {
    return NextResponse.json({ success: false, error: 'researchType is required and must be valid.' }, { status: 400 });
  }

  if (!query) {
    return NextResponse.json({ success: false, error: 'query is required.' }, { status: 400 });
  }

  const result = await createResearchResult({
    projectId,
    mode: mode as any,
    researchType,
    query,
    normalizedTask,
    sources,
    summary,
  });

  return NextResponse.json({ success: true, result });
}

export async function PATCH(req: NextRequest) {
  const payload = await parseJsonBody(req);
  if (!payload || typeof payload !== 'object') {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const id = typeof payload.id === 'string' ? payload.id.trim() : '';
  const status = typeof payload.status === 'string' ? payload.status.trim() as ResearchResultStatus : undefined;

  if (!id) {
    return NextResponse.json({ success: false, error: 'id is required.' }, { status: 400 });
  }

  if (!status) {
    return NextResponse.json({ success: false, error: 'status is required.' }, { status: 400 });
  }

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ success: false, error: 'Invalid status.' }, { status: 400 });
  }

  const result = await updateResearchResultStatus(id, status);
  if (!result) {
    return NextResponse.json({ success: false, error: 'Research result not found.' }, { status: 404 });
  }

  return NextResponse.json({ success: true, result });
}
