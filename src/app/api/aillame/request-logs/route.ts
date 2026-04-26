import { NextResponse } from 'next/server';
import { listExternalApiRequestLogs } from '@core/external-api/request-log/service';

export async function GET() {
  const logs = await listExternalApiRequestLogs();
  return NextResponse.json({ success: true, logs });
}
