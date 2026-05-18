import { NextRequest, NextResponse } from 'next/server';
import { AillameDistillationDatasetService } from '@core/distillation/distillation-dataset.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || '';
    
    const samples = AillameDistillationDatasetService.searchSamples(query);
    return NextResponse.json({ success: true, samples });
  } catch (error: any) {
    console.error('[API Distillation Dataset GET] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Safety check: force action check if any delete/clear request is made
    if (body.action === 'delete' && body.id) {
      const deleted = AillameDistillationDatasetService.deleteSample(body.id);
      return NextResponse.json({ success: deleted });
    }

    const { kind, redactedPrompt, expected, metadata, source } = body;

    const result = AillameDistillationDatasetService.createSample({
      kind,
      redactedPrompt,
      expected,
      metadata: metadata || {},
      source: source || 'user_approved'
    }, { userApproved: true });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, sample: result.sample });
  } catch (error: any) {
    console.error('[API Distillation Dataset POST] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Silinecek ID belirtilmelidir.' }, { status: 400 });
    }

    const deleted = AillameDistillationDatasetService.deleteSample(id);
    return NextResponse.json({ success: deleted });
  } catch (error: any) {
    console.error('[API Distillation Dataset DELETE] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
