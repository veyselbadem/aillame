import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/admin/verify
 * Server-side verification for AILLAME_ADMIN_TOKEN.
 * Prevents UI-only bypass vulnerabilities.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token } = body;

    const serverToken = process.env.AILLAME_ADMIN_TOKEN;

    // AILLAME_ADMIN_TOKEN set edilmemişse güvenlik gereği her şeyi reddet
    if (!serverToken) {
      console.warn('⚠️ AILLAME_ADMIN_TOKEN is not set in environment variables.');
      return NextResponse.json(
        { success: false, error: 'Sunucu yapılandırması eksik.' },
        { status: 500 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Admin token gerekli.' },
        { status: 401 }
      );
    }

    if (token === serverToken) {
      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json(
      { success: false, error: 'Geçersiz admin token.' },
      { status: 401 }
    );
  } catch (error) {
    // Teknik detay sızdırma
    return NextResponse.json(
      { success: false, error: 'Doğrulama sırasında bir hata oluştu.' },
      { status: 400 }
    );
  }
}
