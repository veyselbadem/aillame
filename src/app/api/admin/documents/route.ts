import { NextRequest, NextResponse } from 'next/server';
import { documentLibraryStore } from '@/core/memory/documents/document-file-store';
import { createAdminAuthErrorResponse, validateAdminRequest } from '@core/admin-auth/auth';
import { errorMessage, professionalErrorResponse } from '@core/error/formatter';

export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return createAdminAuthErrorResponse();
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId') || undefined;

  try {
    const documents = await documentLibraryStore.listEntries(projectId);
    return NextResponse.json({ success: true, documents });
  } catch (error) {
    return NextResponse.json(
      professionalErrorResponse('FILE_OPERATION_FAILED', errorMessage(error, 'Document list failed.')),
      { status: 500 }
    );
  }
}
