import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { imageAssetStore } from "@/core/runtime/image/assets/image-asset-file-store";

export async function GET(request: NextRequest) {
  const assetId = request.nextUrl.searchParams.get("assetId");
  if (!assetId || !/^[a-zA-Z0-9_-]+$/.test(assetId)) {
    return NextResponse.json({ success: false, error: "Invalid assetId." }, { status: 400 });
  }

  const asset = await imageAssetStore.getAsset(assetId);
  if (!asset) {
    return NextResponse.json({ success: false, error: "Asset not found." }, { status: 404 });
  }

  try {
    const assetRoot = fs.realpathSync(imageAssetStore.getAssetsDirectory());
    const safeFileName = path.basename(asset.relativePath);
    const resolved = fs.realpathSync(path.join(assetRoot, safeFileName));
    const relative = path.relative(assetRoot, resolved);
    if (relative.startsWith("..") || path.isAbsolute(relative)) {
      return NextResponse.json({ success: false, error: "Asset path blocked." }, { status: 400 });
    }

    const bytes = await fs.promises.readFile(resolved);
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": asset.mimeType || "image/png",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Asset unavailable." }, { status: 404 });
  }
}
