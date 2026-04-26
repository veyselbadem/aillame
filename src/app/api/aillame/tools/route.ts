import { NextRequest, NextResponse } from 'next/server';
import type { ExternalApiMode } from '@core/external-api/types';
import { listTools, isToolAllowedForProject } from '@core/tools/registry';
import { validateAdminRequest, createAdminAuthErrorResponse } from '@core/admin-auth/auth';
import { validateExternalClientRequest, createExternalAuthErrorResponse } from '@core/external-auth/client-auth';
import type { ToolCategory, ToolListResult, ToolRegistryEntry } from '@core/tools/types';

async function validateRequest(req: NextRequest): Promise<true | NextResponse> {
  const externalAuth = await validateExternalClientRequest(req);
  if (externalAuth.success) {
    return true;
  }

  if (validateAdminRequest(req)) {
    return true;
  }

  return createExternalAuthErrorResponse(externalAuth.error || 'Unauthorized', externalAuth.statusCode ?? 401);
}

function parseBoolean(value: string | null): boolean | undefined {
  if (value === null) {
    return undefined;
  }
  return value === 'true' || value === '1';
}

export async function GET(req: NextRequest) {
  const authResult = await validateRequest(req);
  if (authResult !== true) {
    return authResult;
  }

  const category = req.nextUrl.searchParams.get('category') as ToolCategory | null;
  const enabled = parseBoolean(req.nextUrl.searchParams.get('enabled'));
  const implemented = parseBoolean(req.nextUrl.searchParams.get('implemented'));
  const projectId = req.nextUrl.searchParams.get('projectId') ?? undefined;
  const mode = req.nextUrl.searchParams.get('mode') ?? undefined;

  const tools = listTools()
    .filter((tool) => {
      if (category && tool.category !== category) {
        return false;
      }
      if (enabled !== undefined && tool.enabled !== enabled) {
        return false;
      }
      if (implemented !== undefined && tool.implemented !== implemented) {
        return false;
      }
      return true;
    })
    .map((tool) => {
      const entry: ToolRegistryEntry = { ...tool };
      if (projectId && mode) {
        entry.allowed = isToolAllowedForProject(tool.name, projectId, mode as ExternalApiMode);
      }
      return entry;
    });

  const result: ToolListResult = {
    success: true,
    tools,
  };

  return NextResponse.json(result);
}
