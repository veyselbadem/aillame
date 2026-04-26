import { NextRequest, NextResponse } from 'next/server';

const ADMIN_TOKEN_ENV_NAME = 'AILLAME_ADMIN_TOKEN';
const ADMIN_TOKEN_HEADER = 'x-aillame-admin-token';
const AUTHORIZATION_HEADER = 'authorization';

export function getAdminTokenFromRequest(req: NextRequest): string | undefined {
  const headerValue = req.headers.get(ADMIN_TOKEN_HEADER);
  if (headerValue) {
    return headerValue.trim();
  }

  const authorization = req.headers.get(AUTHORIZATION_HEADER);
  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice(7).trim();
  }

  return undefined;
}

export function validateAdminRequest(req: NextRequest): boolean {
  const configuredToken = process.env[ADMIN_TOKEN_ENV_NAME];
  if (!configuredToken) {
    return false;
  }

  const token = getAdminTokenFromRequest(req);
  return Boolean(token && token === configuredToken.trim());
}

export function createAdminAuthErrorResponse(): NextResponse {
  return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
}
