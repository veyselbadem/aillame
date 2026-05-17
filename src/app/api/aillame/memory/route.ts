import { NextRequest, NextResponse } from 'next/server';
import { AillameMemoryService } from '@/core/memory/aillame-memory.service';

export const runtime = 'nodejs';

// GET: List all memories (or search with query param ?q=)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    
    let memories = [];
    if (query) {
      memories = await AillameMemoryService.searchMemories(query);
    } else {
      memories = await AillameMemoryService.listMemories();
    }
    
    return NextResponse.json({
      success: true,
      memories
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Hafıza listesi alınırken hata oluştu.'
    }, { status: 500 });
  }
}

// POST: Add memory OR perform search/delete actions via POST for maximum desktop client compatibility
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Action 1: Delete via POST
    if (body.action === 'delete') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: 'Silinecek hafıza ID\'si eksik.' }, { status: 400 });
      }
      const success = await AillameMemoryService.deleteMemory(id);
      return NextResponse.json({ success });
    }

    // Action 2: Search via POST
    if (body.action === 'search') {
      const { query } = body;
      const memories = await AillameMemoryService.searchMemories(query || '');
      return NextResponse.json({ success: true, memories });
    }

    // Default Action: Create new memory card
    const { type, scope, content, tags } = body;
    
    if (!content || !type || !scope) {
      return NextResponse.json({
        success: false,
        error: 'Eksik alanlar var. İçerik, tür ve kapsam alanları zorunludur.'
      }, { status: 400 });
    }

    const newMemory = await AillameMemoryService.createMemory({
      type,
      scope,
      content,
      tags: Array.isArray(tags) ? tags : []
    });

    return NextResponse.json({
      success: true,
      memory: newMemory
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Hafıza kaydı eklenirken hata oluştu.'
    }, { status: 400 });
  }
}

// DELETE: RESTful delete option
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'Silinecek hafıza ID\'si eksik.' }, { status: 400 });
    }
    
    const success = await AillameMemoryService.deleteMemory(id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Hafıza silinirken hata oluştu.'
    }, { status: 500 });
  }
}
