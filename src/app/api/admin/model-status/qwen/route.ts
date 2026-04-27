import { NextRequest, NextResponse } from 'next/server';
import { getQwenReadiness } from '@/core/model-management/status';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('x-aillame-admin-token');
  if (authHeader !== process.env.AILLAME_ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const readiness = await getQwenReadiness();
    return NextResponse.json(readiness);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
