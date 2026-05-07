import { createServer } from "http";
import { handleAillameApiRequest } from "./handlers";

const DEFAULT_PORT = 4141;
const MAX_BODY_BYTES = 1024 * 1024;

function readBody(request: import("http").IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    request.on("data", (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > MAX_BODY_BYTES) {
        reject(new Error("REQUEST_BODY_TOO_LARGE"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      if (chunks.length === 0) {
        resolve(undefined);
        return;
      }

      const rawBody = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(JSON.parse(rawBody));
      } catch {
        reject(new Error("INVALID_JSON"));
      }
    });

    request.on("error", reject);
  });
}

function getPath(url: string | undefined): string {
  const parsedUrl = new URL(url ?? "/", "http://localhost");
  return parsedUrl.pathname;
}

const server = createServer(async (request, response) => {
  try {
    const body = request.method === "POST" ? await readBody(request) : undefined;
    const apiResponse = await handleAillameApiRequest({
      method: request.method ?? "GET",
      path: getPath(request.url),
      headers: request.headers,
      body,
    });

    for (const [key, value] of Object.entries(apiResponse.headers ?? {})) {
      response.setHeader(key, value);
    }
    response.statusCode = apiResponse.statusCode;
    response.end(JSON.stringify(apiResponse.body));
  } catch (error) {
    const code = error instanceof Error ? error.message : "INTERNAL_ERROR";
    response.statusCode = code === "INVALID_JSON" ? 400 : code === "REQUEST_BODY_TOO_LARGE" ? 413 : 500;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.end(JSON.stringify({
      success: false,
      error: {
        code,
        message: code === "INVALID_JSON"
          ? "Request body must be valid JSON."
          : "Aillame API gateway request failed.",
      },
    }));
  }
});

const port = Number(process.env.AILLAME_API_PORT ?? DEFAULT_PORT);
server.listen(port, "127.0.0.1", () => {
  console.log(`Aillame API Gateway listening on http://127.0.0.1:${port}`);
});
