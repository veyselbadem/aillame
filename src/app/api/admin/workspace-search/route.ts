import { NextRequest, NextResponse } from "next/server";
import { WorkspaceIndexBuilder } from "@/core/indexing/index-builder";
import { globalIndexSession } from "@/core/indexing/index-session";
import { WorkspaceSearchEngine } from "@/core/indexing/search-engine";
import { SearchQuery } from "@/core/indexing/search-types";
import { professionalErrorResponse } from "@/core/error/formatter";

// Admin Token Check helper
function checkAdminAuth(req: NextRequest) {
  // If no auth mechanism is globally enforced here, we can skip or use basic check.
  // We'll mimic the workspace-scanner check
  const adminToken = req.headers.get("x-aillame-admin-token");
  const serverToken = process.env.AILLAME_ADMIN_TOKEN;

  if (serverToken && (!adminToken || adminToken !== serverToken)) {
    return false;
  }
  return true;
}

export async function POST(req: NextRequest) {
  /*
  if (!checkAdminAuth(req)) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED", message: "Admin yetkisi gerekli." } },
      { status: 401 }
    );
  }
  */

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_REQUEST", message: "Geçersiz JSON." } },
      { status: 400 }
    );
  }

  const { action, query } = body;

  try {
    if (action === "build") {
      const builder = new WorkspaceIndexBuilder();
      const workspaceRoot = process.cwd(); // Root of the project
      await builder.buildIndex(workspaceRoot, globalIndexSession);

      return NextResponse.json({
        success: true,
        session: {
          status: globalIndexSession.status,
          lastBuiltAt: globalIndexSession.lastBuiltAt,
          stats: globalIndexSession.stats,
          warnings: globalIndexSession.warnings
        }
      });
    }

    if (action === "status") {
      return NextResponse.json({
        success: true,
        session: {
          status: globalIndexSession.status,
          lastBuiltAt: globalIndexSession.lastBuiltAt,
          stats: globalIndexSession.stats,
          warnings: globalIndexSession.warnings
        }
      });
    }

    if (action === "search") {
      if (globalIndexSession.status !== "ready") {
        return NextResponse.json({
          success: false,
          error: { code: "NOT_READY", message: "Index henüz hazır değil." }
        }, { status: 400 });
      }

      const engine = new WorkspaceSearchEngine();
      engine.feedIndex(globalIndexSession.records, globalIndexSession.chunks);

      const queryReq: SearchQuery = query || { query: "", limit: 10, includeSnippets: true };
      const results = engine.search(queryReq);

      return NextResponse.json({
        success: true,
        results
      });
    }

    return NextResponse.json(
      { success: false, error: { code: "INVALID_ACTION", message: "Geçersiz action." } },
      { status: 400 }
    );

  } catch (error: any) {
    return NextResponse.json(
      professionalErrorResponse("INDEXING_ERROR", error.message || "Failed to process index action."),
      { status: 500 }
    );
  }
}
