import { NextResponse } from "next/server";
import { queryCuratedGgufCatalog } from "@/core/models/catalog/curated-gguf-catalog";

export async function GET() {
  return NextResponse.json(queryCuratedGgufCatalog());
}
