import { NextRequest, NextResponse } from 'next/server';
import { exportFeedbackDatasetJsonl } from '@core/feedback/service';
import { createAdminAuthErrorResponse, validateAdminRequest } from '@core/admin-auth/auth';

function parseBoolean(value: string | null, fallback = false): boolean {
  if (value === null) return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

export async function GET(req: NextRequest) {
  if (!validateAdminRequest(req)) {
    return createAdminAuthErrorResponse();
  }

  try {
    const format = (req.nextUrl.searchParams.get('format') ?? 'jsonl').toLowerCase();
    if (format !== 'jsonl') {
      return NextResponse.json({ success: false, error: 'Sadece format=jsonl desteklenir.' }, { status: 400 });
    }

    const projectId = req.nextUrl.searchParams.get('projectId') ?? undefined;
    const includeSensitive = parseBoolean(req.nextUrl.searchParams.get('includeSensitive'), false);

    const jsonl = await exportFeedbackDatasetJsonl({ projectId, includeSensitive });

    return new NextResponse(jsonl, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ndjson; charset=utf-8',
        'Content-Disposition': 'inline; filename="feedback-export.jsonl"',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Dataset export basarisiz oldu.';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
