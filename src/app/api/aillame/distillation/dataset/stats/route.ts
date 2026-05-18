import { NextRequest, NextResponse } from 'next/server';
import { AillameDistillationDatasetService } from '@core/distillation/distillation-dataset.service';

export async function GET() {
  try {
    const stats = AillameDistillationDatasetService.getStats();
    return NextResponse.json({ success: true, stats });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
