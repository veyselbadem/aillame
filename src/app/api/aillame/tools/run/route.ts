import { NextRequest, NextResponse } from 'next/server';
import { AillameToolExecutor } from '@core/tools/tool-executor';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { toolId, input } = body;

    if (!toolId || typeof toolId !== 'string') {
      return NextResponse.json(
        { ok: false, error: 'toolId alanı zorunludur ve metin olmalıdır.' },
        { status: 400 }
      );
    }

    const result = await AillameToolExecutor.executeTool(toolId, input || {});

    // If execution returned false due to validation/error, we still return 200 with ok: false
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API Tools Run] Critical Error:', error);
    return NextResponse.json(
      {
        ok: false,
        error: 'İstek işlenirken sunucuda beklenmeyen bir hata oluştu.',
        details: error.message
      },
      { status: 500 }
    );
  }
}
