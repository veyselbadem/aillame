import { NextRequest, NextResponse } from 'next/server';
import { validateRequest } from '../../models/auth-helper';
import { AuditLogService } from '@/services/audit/audit-log.service';

export async function GET(req: NextRequest) {
  const auth = await validateRequest(req);
  if (!auth.isValid) return auth.response!;

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const workflows = await AuditLogService.readRecentWorkflowResults(limit);
    return NextResponse.json({
      ok: true,
      workflows
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: {
        code: 'AUDIT_LOG_READ_FAILED',
        message: error.message
      }
    }, { status: 500 });
  }
}
