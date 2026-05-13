export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  service?: string;
  status?: string;
  version?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export class ApiResponseHelper {
  static success<T>(data: T, message?: string): ApiResponse<T> {
    return {
      success: true,
      data,
      message,
    };
  }

  static error(code: string, message: string): ApiErrorResponse {
    return {
      success: false,
      error: {
        code,
        message,
      },
    };
  }

  static health(service: string, status: string, version: string): ApiResponse {
    return {
      success: true,
      service,
      status,
      version,
    };
  }
}
