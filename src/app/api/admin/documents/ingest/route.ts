import { NextResponse } from 'next/server';
import { documentIngestionService } from '@/core/memory/documents/document-ingestion-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await documentIngestionService.ingest(body);
    
    if (result.success) {
      return NextResponse.json({ success: true, documentId: result.documentId });
    } else {
      return NextResponse.json({ success: false, warning: result.warning }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
