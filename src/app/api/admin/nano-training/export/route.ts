import { NextRequest, NextResponse } from 'next/server';
import { exportApprovedTrainingData } from '@core/nano-training/service';

export async function POST(req: NextRequest) {
  try {
    const adminToken = req.headers.get('x-aillame-admin-token');
    const serverToken = process.env.AILLAME_ADMIN_TOKEN;

    if (!serverToken || adminToken !== serverToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Admin token required.' },
        { status: 401 }
      );
    }

    const result = await exportApprovedTrainingData();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Dataset export failed.';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // GET isteği de korunmalı
  const adminToken = req.headers.get('x-aillame-admin-token');
  const serverToken = process.env.AILLAME_ADMIN_TOKEN;

  if (!serverToken || adminToken !== serverToken) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Admin token required.' },
      { status: 401 }
    );
  }

  const result = await exportApprovedTrainingData();
  return NextResponse.json(result);
}
