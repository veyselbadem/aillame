import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { imageAssetStore } from "@/core/runtime/image/assets/image-asset-file-store";

export async function GET(req: NextRequest) {
  const assetId = req.nextUrl.searchParams.get("assetId");
  const isDownload = req.nextUrl.searchParams.get("download") === "true";

  if (!assetId) {
    return NextResponse.json({ error: "Missing assetId" }, { status: 400 });
  }

  const asset = await imageAssetStore.getAsset(assetId);
  if (!asset || !asset.fileName) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }

  try {
    const assetsDir = imageAssetStore.getAssetsDirectory();
    const safeFileName = path.basename(asset.fileName);
    const filePath = path.join(assetsDir, safeFileName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    const mimeType = asset.mimeType || "image/png";

    const headers: Record<string, string> = {
      "Content-Type": mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    };

    if (isDownload) {
      headers["Content-Disposition"] = `attachment; filename="${safeFileName}"`;
    }

    return new NextResponse(fileBuffer, { headers });
  } catch (error) {
    console.error("View API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
