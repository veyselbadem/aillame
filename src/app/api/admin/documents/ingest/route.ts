import { NextRequest, NextResponse } from 'next/server';
import { documentIngestionService } from '@/core/memory/documents/document-ingestion-service';
import { createAdminAuthErrorResponse, validateAdminRequest } from '@core/admin-auth/auth';
import { errorMessage, professionalErrorResponse } from '@core/error/formatter';

export async function POST(request: NextRequest) {
  if (!validateAdminRequest(request)) return createAdminAuthErrorResponse();
  try {
    const body = await request.json();
    const result = await documentIngestionService.ingest(body);
    
    if (result.success) {
      return NextResponse.json({ success: true, documentId: result.documentId });
    } else {
      return NextResponse.json(
        professionalErrorResponse('FILE_OPERATION_FAILED', result.warning || 'Document ingestion could not be completed.'),
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      professionalErrorResponse('FILE_OPERATION_FAILED', errorMessage(error, 'Document ingestion failed.')),
      { status: 500 }
    );
  }
}
