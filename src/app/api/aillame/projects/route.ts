import { NextRequest, NextResponse } from 'next/server';
import { AillameProjectContextService } from '@/core/projects/project-context.service';

export const runtime = 'nodejs';

// GET /api/aillame/projects: List all projects
export async function GET() {
  try {
    const list = AillameProjectContextService.listProjects();
    return NextResponse.json({
      success: true,
      projects: list
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Proje listesi yüklenirken hata oluştu.'
    }, { status: 500 });
  }
}

// POST /api/aillame/projects: Create new project
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Support POST delete option for legacy client compatibility
    if (body.action === 'delete') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: 'Silinecek proje ID\'si belirtilmedi.' }, { status: 400 });
      }
      const success = AillameProjectContextService.deleteProject(id);
      return NextResponse.json({ success });
    }

    // Support POST update option
    if (body.action === 'update') {
      const { id, patch } = body;
      if (!id || !patch) {
        return NextResponse.json({ success: false, error: 'Eksik parametreler (id veya patch bulunamadı).' }, { status: 400 });
      }
      const updated = AillameProjectContextService.updateProject(id, patch);
      return NextResponse.json({ success: !!updated, project: updated });
    }

    const { id, name, description, category, goals, tone, language, seoPreferences, linkedMemoryTags } = body;

    if (!id || !name || !category) {
      return NextResponse.json({
        success: false,
        error: 'id, name ve category alanları zorunludur.'
      }, { status: 400 });
    }

    const created = AillameProjectContextService.createProject({
      id: id.toLowerCase().trim().replace(/\s+/g, '-'),
      name,
      description,
      category,
      goals: Array.isArray(goals) ? goals : [],
      tone,
      language: language || 'tr',
      seoPreferences: seoPreferences || { enabled: false },
      linkedMemoryTags: Array.isArray(linkedMemoryTags) ? linkedMemoryTags : []
    });

    return NextResponse.json({
      success: true,
      project: created
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Proje oluşturulurken hata oluştu.'
    }, { status: 500 });
  }
}

// PATCH /api/aillame/projects: Update project
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...patch } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Proje ID\'si belirtilmelidir.' }, { status: 400 });
    }

    const updated = AillameProjectContextService.updateProject(id, patch);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Belirtilen proje bulunamadı.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      project: updated
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Proje güncellenirken hata oluştu.'
    }, { status: 500 });
  }
}

// DELETE /api/aillame/projects: Non-destructive delete
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Silinecek proje ID\'si eksik.' }, { status: 400 });
    }

    const success = AillameProjectContextService.deleteProject(id);
    return NextResponse.json({
      success,
      message: success ? 'Proje bağlam kaydı silindi, fiziksel dosyalara dokunulmadı.' : 'Proje bulunamadı.'
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Proje silinirken hata oluştu.'
    }, { status: 500 });
  }
}
