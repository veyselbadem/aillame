import { NextRequest, NextResponse } from 'next/server';
import { AillameDistillationDatasetService } from '@core/distillation/distillation-dataset.service';

export async function POST(req: NextRequest) {
  try {
    const interaction = await req.json();
    const suggested = AillameDistillationDatasetService.suggestSampleFromInteraction(interaction);
    
    if (!suggested) {
      return NextResponse.json({ success: false, error: 'İşlemden veri önerisi üretilemedi veya hassas içerik tespit edildi.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, suggested });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
