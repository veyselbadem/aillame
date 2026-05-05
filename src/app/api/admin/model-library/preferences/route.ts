import { NextRequest, NextResponse } from 'next/server';
import {
  getDefaultModelPreferences,
  updateDefaultModelPreference,
  type DefaultModelCapability,
} from '@core/model-library';

export const runtime = 'nodejs';

const ALLOWED_CAPABILITIES: ReadonlyArray<DefaultModelCapability> = [
  'text',
  'code',
  'image',
  'vision',
  'embedding',
];

function isAllowedCapability(value: unknown): value is DefaultModelCapability {
  return typeof value === 'string' && ALLOWED_CAPABILITIES.includes(value as DefaultModelCapability);
}

function unauthorized(): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Unauthorized' },
    { status: 401 },
  );
}

function validateAdminToken(req: NextRequest): boolean {
  const authHeader = req.headers.get('x-aillame-admin-token');
  return authHeader === process.env.AILLAME_ADMIN_TOKEN;
}

export async function GET(req: NextRequest) {
  if (!validateAdminToken(req)) return unauthorized();

  try {
    const data = getDefaultModelPreferences();
    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Preferences could not be loaded.' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  if (!validateAdminToken(req)) return unauthorized();

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON payload.' },
      { status: 400 },
    );
  }

  const body = payload as { capability?: unknown; modelId?: unknown; source?: unknown };
  if (!isAllowedCapability(body?.capability)) {
    return NextResponse.json(
      { success: false, error: 'Invalid capability. Allowed: text, code, image, vision, embedding.' },
      { status: 400 },
    );
  }

  if (body.modelId !== undefined && body.modelId !== null && typeof body.modelId !== 'string') {
    return NextResponse.json(
      { success: false, error: 'modelId must be a string when provided.' },
      { status: 400 },
    );
  }

  const source = body.source === 'system' || body.source === 'admin' || body.source === 'default'
    ? body.source
    : 'admin';

  try {
    const data = updateDefaultModelPreference({
      capability: body.capability,
      modelId: typeof body.modelId === 'string' ? body.modelId : undefined,
      source,
    });

    return NextResponse.json({ success: true, data });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Preferences could not be updated.' },
      { status: 500 },
    );
  }
}
