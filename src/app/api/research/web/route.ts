import { NextRequest, NextResponse } from 'next/server';
import { runWebResearchAdapter } from '@core/model-adapters/web-research-adapter';
import type { ResearchResultType } from '@core/research-results/types';

const VALID_RESEARCH_TYPES: ResearchResultType[] = [
  'web',
  'news',
  'economy_news',
  'documentation',
  'education',
  'source_summary',
];

async function parseJsonBody(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return null;
  }
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
  const maxResults = typeof payload.maxResults === 'number' ? payload.maxResults : undefined;

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

  if (maxResults !== undefined && (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 10)) {
    return NextResponse.json({ success: false, error: 'maxResults must be an integer between 1 and 10.' }, { status: 400 });
  }

  try {
    const result = await runWebResearchAdapter({
      projectId,
      mode: mode as any,
      researchType,
      query,
      normalizedTask,
      maxResults,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Araştırma sırasında bilinmeyen bir hata oluştu.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
