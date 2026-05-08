import { NextResponse } from 'next/server';
import { isLegacyProvidersEnabled } from '@core/feature-flags/legacy-providers';

export async function GET() {
  return NextResponse.json({
    enabled: isLegacyProvidersEnabled(),
  });
}
