import { NextRequest, NextResponse } from 'next/server';
import { validateExternalClientRequest } from '@/core/external-auth/client-auth';
import { validateProviderApiRequest } from '@/core/provider-api/validation';
import { ProviderApiService } from '@/core/provider-api/provider-service';

export async function POST(req: NextRequest) {
  // 1. Auth check
  const authResult = await validateExternalClientRequest(req);
  if (!authResult.success || !authResult.client) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: authResult.error || 'Unauthorized' } },
      { status: authResult.statusCode || 401 }
    );
  }

  // 2. Body parse
  let body: any;
  try {
    body = await req.json();
  } catch (e) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid JSON payload.' } },
      { status: 400 }
    );
  }

  // 3. Validation
  const validation = validateProviderApiRequest(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_REQUEST', message: validation.error } },
      { status: 400 }
    );
  }

  // 4. Execution
  const response = await ProviderApiService.handleRequest(validation.request);
  
  const status = response.success ? 200 : 500;
  // Map some error codes to specific statuses
  let finalStatus = status;
  if (!response.success) {
    if (response.error.code === 'RUNTIME_NOT_READY') finalStatus = 503;
    if (response.error.code === 'INVALID_REQUEST') finalStatus = 400;
  }

  return NextResponse.json(response, { status: finalStatus });
}
