import { NextResponse } from 'next/server';
import { documentLibraryStore } from '@/core/memory/documents/document-file-store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId') || undefined;

  try {
    const documents = await documentLibraryStore.listEntries(projectId);
    return NextResponse.json({ success: true, documents });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
