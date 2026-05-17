import { NextRequest, NextResponse } from 'next/server';
import { AillameDistillationDatasetService } from '@core/distillation/distillation-dataset.service';

export async function GET() {
  try {
    const rawJsonl = AillameDistillationDatasetService.exportJsonl();
    return new NextResponse(rawJsonl, {
      headers: {
        'Content-Type': 'application/x-jsonlines',
        'Content-Disposition': 'attachment; filename="aillame-distillation-dataset.jsonl"'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
