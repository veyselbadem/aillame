import { NextResponse } from 'next/server';
import { imageJobStore } from '@/core/runtime/image/jobs/image-job-file-store';
import { imageGenerationService } from '@/core/runtime/image/image-generation-service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId') || undefined;

  try {
    const jobs = await imageJobStore.listJobs(projectId);
    return NextResponse.json({ success: true, jobs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await imageGenerationService.createJob(body);
    
    if (result.success) {
      return NextResponse.json({ success: true, jobId: result.jobId });
    } else {
      return NextResponse.json({ success: false, warning: result.warning }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
