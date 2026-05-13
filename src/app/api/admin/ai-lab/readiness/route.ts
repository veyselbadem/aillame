import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { RuntimeAcceptanceService } from '@/core/runtime/acceptance/acceptance-service';

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-aillame-admin-token');
  if (token !== process.env.AILLAME_ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const report = RuntimeAcceptanceService.getReport();
    return NextResponse.json({
      success: true,
      report
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
