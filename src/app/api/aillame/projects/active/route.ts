import { NextRequest, NextResponse } from 'next/server';
import { AillameProjectContextService } from '@/core/projects/project-context.service';

export const runtime = 'nodejs';

// GET /api/aillame/projects/active: Get active project context
export async function GET() {
  try {
    const activeId = AillameProjectContextService.getActiveProjectId();
    const project = AillameProjectContextService.getActiveProject();
    
    return NextResponse.json({
      success: true,
      activeProjectId: activeId,
      project
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Aktif proje bilgisi yüklenirken hata oluştu.'
    }, { status: 500 });
  }
}

// POST /api/aillame/projects/active: Set active project context
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId } = body;

    // Setting projectId to null is allowed to clear the active selection
    if (projectId !== null && typeof projectId === 'string') {
      const exists = AillameProjectContextService.getProject(projectId);
      if (!exists) {
        return NextResponse.json({
          success: false,
          error: 'Belirtilen proje ID\'si mevcut proje listesinde kayıtlı değil.'
        }, { status: 404 });
      }
    }

    AillameProjectContextService.setActiveProject(projectId);
    
    return NextResponse.json({
      success: true,
      activeProjectId: projectId,
      project: projectId ? AillameProjectContextService.getProject(projectId) : null
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Aktif proje güncellenirken hata oluştu.'
    }, { status: 500 });
  }
}
