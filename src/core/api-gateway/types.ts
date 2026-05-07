export type AillameApiHeaders = Record<string, string | string[] | undefined>;

export type AillameApiRequest = {
  method: string;
  path: string;
  headers?: AillameApiHeaders;
  body?: unknown;
};

export type AillameApiResponse<TBody = unknown> = {
  statusCode: number;
  body: TBody;
  headers?: Record<string, string>;
};

import type { AillameApiDiagnosticsEnvelope } from "./api-diagnostics";

export type AillameApiErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
  };
  diagnostics?: AillameApiDiagnosticsEnvelope;
};
