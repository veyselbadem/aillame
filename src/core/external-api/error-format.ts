import { NextResponse } from 'next/server';

type OpenAIErrorType = 'invalid_request_error' | 'authentication_error' | 'rate_limit_error' | 'api_error' | 'not_implemented_error';

export type OpenAIErrorBody = {
  error: {
    message: string;
    type: OpenAIErrorType;
    param: string | null;
    code: string;
  };
};

export type NativeApiErrorBody = {
  success: false;
  provider: 'aillame';
  error: {
    message: string;
    code: string;
  };
};

function toOpenAIErrorType(status: number): OpenAIErrorType {
  if (status === 401 || status === 403) return 'authentication_error';
  if (status === 429) return 'rate_limit_error';
  if (status === 501) return 'not_implemented_error';
  if (status >= 500) return 'api_error';
  return 'invalid_request_error';
}

export function createOpenAIError(message: string, code: string, status = 400): OpenAIErrorBody {
  return {
    error: {
      message,
      type: toOpenAIErrorType(status),
      param: null,
      code,
    },
  };
}

export function createNativeApiError(message: string, code: string): NativeApiErrorBody {
  return {
    success: false,
    provider: 'aillame',
    error: {
      message,
      code,
    },
  };
}

export function jsonOpenAIError(message: string, code: string, status = 400) {
  return NextResponse.json(createOpenAIError(message, code, status), { status });
}

export function jsonNativeApiError(message: string, code: string, status = 400) {
  return NextResponse.json(createNativeApiError(message, code), { status });
}
