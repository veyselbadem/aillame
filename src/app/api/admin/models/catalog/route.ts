import { NextRequest, NextResponse } from "next/server";
import { queryCuratedGgufCatalog } from "@/core/models/catalog/curated-gguf-catalog";
import { createAdminAuthErrorResponse, validateAdminRequest } from "@core/admin-auth/auth";

export async function GET(request: NextRequest) {
  if (!validateAdminRequest(request)) return createAdminAuthErrorResponse();
  return NextResponse.json(queryCuratedGgufCatalog());
}
